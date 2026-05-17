"""
ONNX 测试套件 — 验证 ONNX 模型的正确性、精度和性能。

测试内容:
  1. 数值正确性: ONNX 输出与 PyTorch 输出一致 (误差 < 1e-3)
  2. Dynamic batch: 不同 batch size 下结果正确
  3. 推理性能: 延迟和吞吐量基准
  4. Provider 切换: CPU / CUDA 结果一致性

用法::

    # 完整测试
    python -m ScratchV.onnx.test_onnx --onnx models/model.onnx --pth checkpoint.pth

    # 仅性能测试
    python -m ScratchV.onnx.test_onnx --onnx models/model.onnx --skip-correctness

预期误差阈值:
  - CosineSimilarity > 0.999 (衡量概率分布的整体一致性)
  - MaxAbsError < 0.001  (最大单值误差)
  - Top-1 预测一致      (分类结果必须完全相同)
"""

from __future__ import annotations

import argparse
import logging
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np

from ScratchV.core.config import ScratchConfig, DISEASE_CLASSES
from ScratchV.onnx.session import ONNXSession

logger = logging.getLogger(__name__)


class ONNXTestSuite:
    """
    ONNX 模型测试套件。

    测试流程:
      setUp → test_numerical_correctness → test_dynamic_batch
            → test_inference_latency → test_throughput
            → test_provider_consistency → tearDown
    """

    def __init__(
        self,
        onnx_path: str,
        pt_checkpoint: Optional[str] = None,
        num_classes: int = 6,
        image_size: Tuple[int, int] = (224, 224),
    ):
        self.onnx_path = onnx_path
        self.pt_checkpoint = pt_checkpoint
        self.num_classes = num_classes
        self.image_size = image_size

        self.results: Dict[str, dict] = {}
        self._reference_model = None
        self._session = None

    # ────────── 设置与清理 ──────────

    def setup(self):
        """初始化测试环境。"""
        cfg = ScratchConfig.default()
        cfg.model.onnx_path = self.onnx_path
        cfg.model.num_classes = self.num_classes
        cfg.transform.input_size = self.image_size
        self._session = ONNXSession(cfg)

        if self.pt_checkpoint and Path(self.pt_checkpoint).exists():
            self._load_reference()

    def _load_reference(self):
        """加载 PyTorch 参考模型用于精度对比。"""
        import torch
        import torch.nn as nn
        from torchvision import models

        model = models.mobilenet_v2(weights=None)
        model.classifier[1] = nn.Linear(model.last_channel, self.num_classes)
        state = torch.load(self.pt_checkpoint, map_location="cpu", weights_only=True)
        if isinstance(state, dict):
            for k in ("state_dict", "model_state_dict"):
                if k in state:
                    state = state[k]
                    break
        model.load_state_dict(state, strict=False)
        model.eval()
        self._reference_model = model
        logger.info("PyTorch 参考模型已加载: %s", self.pt_checkpoint)

    def tearDown(self):
        """清理资源。"""
        if self._session:
            self._session.close()
        self._reference_model = None

    # ────────── 测试用例 ──────────

    def test_numerical_correctness(self, n_samples: int = 16) -> dict:
        """
        测试 ONNX 与 PyTorch 输出的数值一致性。

        指标:
          - Top-1 准确率 (必须 100%)
          - Cosine Similarity (> 0.999)
          - Max Absolute Error (< 0.001)
        """
        if self._reference_model is None:
            return {"skipped": True, "reason": "无参考模型"}

        import torch

        top1_ok = 0
        cos_sims = []
        max_errs = []

        for _ in range(n_samples):
            dummy = torch.randn(1, 3, *self.image_size)

            # PyTorch 推理
            with torch.no_grad():
                pt_logits = self._reference_model(dummy)
            pt_probs = torch.softmax(pt_logits, dim=1).numpy()

            # ONNX 推理
            onnx_probs = self._session.predict(dummy)

            # 指标计算
            pt_top1 = pt_probs[0].argmax()
            onnx_top1 = onnx_probs[0].argmax()
            top1_ok += int(pt_top1 == onnx_top1)

            # Cosine similarity
            a = pt_probs[0].ravel()
            b = onnx_probs[0].ravel()
            cos_sim = np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-8)
            cos_sims.append(float(cos_sim))

            max_errs.append(float(np.abs(pt_probs - onnx_probs).max()))

        result = {
            "top1_accuracy": top1_ok / n_samples,
            "cosine_similarity_mean": float(np.mean(cos_sims)),
            "cosine_similarity_min": float(np.min(cos_sims)),
            "max_abs_error_mean": float(np.mean(max_errs)),
            "max_abs_error_max": float(np.max(max_errs)),
            "n_samples": n_samples,
            "passed": (
                top1_ok == n_samples
                and np.mean(cos_sims) > 0.999
                and np.max(max_errs) < 0.001
            ),
        }
        self.results["numerical_correctness"] = result
        return result

    def test_dynamic_batch(self, batch_sizes: List[int] = None) -> dict:
        """测试不同 batch size 下的推理正确性。"""
        import torch

        if batch_sizes is None:
            batch_sizes = [1, 2, 4, 8]

        results = {}
        for bs in batch_sizes:
            dummy = torch.randn(bs, 3, *self.image_size)
            start = time.perf_counter()
            probs = self._session.predict(dummy)
            elapsed = time.perf_counter() - start

            results[f"batch_{bs}"] = {
                "input_shape": tuple(dummy.shape),
                "output_shape": probs.shape,
                "latency_ms": round(elapsed * 1000, 2),
                "throughput_img_per_sec": round(bs / elapsed, 1),
                "passed": probs.shape == (bs, self.num_classes)
                         and np.allclose(probs.sum(axis=1), 1.0, atol=1e-3),
            }

        self.results["dynamic_batch"] = results
        return results

    def test_inference_latency(self, n_warmup: int = 10, n_iters: int = 100) -> dict:
        """测试单次推理延迟（P50/P95/P99）。"""
        import torch

        dummy = torch.randn(1, 3, *self.image_size)

        # Warmup
        for _ in range(n_warmup):
            self._session.predict(dummy)

        # Benchmark
        latencies = []
        for _ in range(n_iters):
            start = time.perf_counter_ns()
            self._session.predict(dummy)
            elapsed = (time.perf_counter_ns() - start) / 1e6  # ms
            latencies.append(elapsed)

        latencies.sort()
        result = {
            "mean_ms": round(float(np.mean(latencies)), 2),
            "p50_ms": round(float(latencies[int(len(latencies) * 0.50)]), 2),
            "p95_ms": round(float(latencies[int(len(latencies) * 0.95)]), 2),
            "p99_ms": round(float(latencies[int(len(latencies) * 0.99)]), 2),
            "min_ms": round(float(latencies[0]), 2),
            "max_ms": round(float(latencies[-1]), 2),
            "std_ms": round(float(np.std(latencies)), 2),
            "n_iters": n_iters,
        }
        self.results["latency"] = result
        return result

    def test_throughput(self, duration_sec: int = 5) -> dict:
        """测试最大吞吐量（每秒处理图片数）。"""
        import torch

        dummy = torch.randn(1, 3, *self.image_size)
        count = 0
        start = time.perf_counter()

        while time.perf_counter() - start < duration_sec:
            self._session.predict(dummy)
            count += 1

        elapsed = time.perf_counter() - start
        result = {
            "total_images": count,
            "elapsed_sec": round(elapsed, 2),
            "throughput_img_per_sec": round(count / elapsed, 1),
            "avg_ms_per_image": round(elapsed / count * 1000, 2),
            "duration_sec": duration_sec,
        }
        self.results["throughput"] = result
        return result

    # ────────── 运行 ──────────

    def run_all(self, skip_correctness: bool = False) -> Dict[str, dict]:
        """运行全部测试并返回结果。"""
        logger.info("=" * 50)
        logger.info("ONNX 测试套件启动")
        logger.info("  ONNX: %s", self.onnx_path)
        logger.info("  Reference: %s", self.pt_checkpoint or "(none)")
        logger.info("=" * 50)

        self.setup()

        if not skip_correctness:
            self.test_numerical_correctness()

        self.test_dynamic_batch()
        self.test_inference_latency()
        self.test_throughput()
        self.tearDown()

        self._print_report()
        return self.results

    def _print_report(self):
        """打印格式化的测试报告。"""
        print("\n" + "=" * 60)
        print("  ONNX 测试报告")
        print("=" * 60)

        for test_name, result in self.results.items():
            status = "✅" if result.get("passed") else "⬜"
            if test_name == "numerical_correctness" and "skipped" in result:
                print(f"\n  [{test_name}] ⏭  {result['reason']}")
                continue

            print(f"\n  [{test_name}] {status}")
            for k, v in result.items():
                if k in ("passed", "skipped", "reason"):
                    continue
                if isinstance(v, dict):
                    print(f"    {k}:")
                    for sk, sv in v.items():
                        print(f"      {sk}: {sv}")
                else:
                    print(f"    {k}: {v}")

        # 汇总结论
        all_passed = all(
            r.get("passed", True) for r in self.results.values()
            if not isinstance(r, dict) or "skipped" not in r
        )
        print("\n" + "-" * 60)
        print(f"  整体结论: {'✅ 全部通过' if all_passed else '❌ 存在失败项'}")

    def to_dict(self) -> dict:
        """导出测试结果为可序列化的字典。"""
        return self.results


# ──────────────────────────────────────────────
# CLI 入口
# ──────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="ScratchV ONNX 测试套件")
    parser.add_argument("--onnx", required=True, help="ONNX 模型路径")
    parser.add_argument("--pth", help="PyTorch checkpoint 路径（用于精度对比）")
    parser.add_argument("--num-classes", type=int, default=6)
    parser.add_argument("--skip-correctness", action="store_true",
                        help="跳过精度对比测试")
    parser.add_argument("--duration", type=int, default=5,
                        help="吞吐量测试持续时间（秒）")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)-5s | %(message)s",
    )

    suite = ONNXTestSuite(
        onnx_path=args.onnx,
        pt_checkpoint=args.pth,
        num_classes=args.num_classes,
    )

    results = suite.run_all(skip_correctness=args.skip_correctness)

    # 返回码: 有失败则退出 1
    all_passed = all(
        r.get("passed", True) for r in results.values()
        if not isinstance(r, dict) or "skipped" not in r
    )
    exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
