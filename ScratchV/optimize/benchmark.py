"""
性能基准测试 — 测量不同后端/配置下的推理性能。

测试维度:
  1. 后端对比: PyTorch vs ONNX (CPU/GPU)
  2. Batch size 对吞吐量的影响
  3. TTA 开启前后性能变化
  4. 不同图片尺寸下的性能

输出:
  - 控制台报告
  - (可选) JSON 结果导出，用于后续分析

用法::

    python -m ScratchV.optimize.benchmark --pth checkpoint.pth --onnx model.onnx
    python -m ScratchV.optimize.benchmark --onnx model.onnx --only-onnx
"""

from __future__ import annotations

import argparse
import json
import logging
import time
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np
import torch

from ScratchV.core.config import ScratchConfig
from ScratchV.core.pipeline import ScratchPipeline

logger = logging.getLogger(__name__)


@dataclass
class BenchmarkResult:
    """单次基准测试的结果。"""
    backend: str
    batch_size: int
    image_size: Tuple[int, int]
    tta: bool
    mean_latency_ms: float = 0.0
    p50_latency_ms: float = 0.0
    p95_latency_ms: float = 0.0
    p99_latency_ms: float = 0.0
    throughput_img_per_sec: float = 0.0
    device: str = ""


class BenchmarkSuite:
    """
    性能基准测试套件。

    使用方式::

        suite = BenchmarkSuite(pth_path="checkpoint.pth", onnx_path="model.onnx")
        results = suite.run()
        suite.print_report(results)
    """

    def __init__(
        self,
        pth_path: Optional[str] = None,
        onnx_path: Optional[str] = None,
        image_sizes: Optional[List[Tuple[int, int]]] = None,
        batch_sizes: Optional[List[int]] = None,
        n_warmup: int = 20,
        n_iters: int = 200,
    ):
        self.pth_path = pth_path
        self.onnx_path = onnx_path
        self.image_sizes = image_sizes or [(224, 224)]
        self.batch_sizes = batch_sizes or [1, 2, 4, 8]
        self.n_warmup = n_warmup
        self.n_iters = n_iters

    def run(self) -> List[BenchmarkResult]:
        """执行所有基准测试。"""
        results: List[BenchmarkResult] = []

        for img_size in self.image_sizes:
            for bs in self.batch_sizes:
                for backend, onnx_flag, pth_path in [
                    ("onnx", True, None),
                    ("pytorch", False, self.pth_path),
                ]:
                    if backend == "pytorch" and not pth_path:
                        continue
                    if backend == "onnx" and not self.onnx_path:
                        continue

                    for tta in [False, True]:
                        # TTA 只在 batch_size=1 时测试
                        if tta and bs > 1:
                            continue

                        result = self._benchmark_single(
                            backend=backend,
                            onnx_path=self.onnx_path if onnx_flag else None,
                            pth_path=pth_path,
                            batch_size=bs,
                            image_size=img_size,
                            tta=tta,
                        )
                        results.append(result)

        return results

    def _benchmark_single(
        self,
        backend: str,
        onnx_path: Optional[str],
        pth_path: Optional[str],
        batch_size: int,
        image_size: Tuple[int, int],
        tta: bool,
    ) -> BenchmarkResult:
        """单次基准测试。"""
        # ── 配置 ──
        cfg = ScratchConfig.default()
        cfg.model.checkpoint_path = pth_path or ""
        cfg.model.onnx_path = onnx_path or ""
        cfg.transform.input_size = image_size

        # ── 构建 Pipeline ──
        pipe = ScratchPipeline(cfg, backend=backend)
        dummy_images = [
            np.random.randint(0, 256, (*image_size, 3), dtype=np.uint8)
            for _ in range(batch_size)
        ]

        # ── Warmup ──
        for _ in range(self.n_warmup):
            if tta:
                pipe.predict(dummy_images[0], tta=True)
            else:
                pipe.predict(dummy_images)

        # ── Benchmark ──
        latencies_ms = []
        for _ in range(self.n_iters):
            start = time.perf_counter()
            if tta:
                pipe.predict(dummy_images[0], tta=True)
            else:
                pipe.predict(dummy_images)
            elapsed = (time.perf_counter() - start) * 1000
            latencies_ms.append(elapsed)

        latencies_ms.sort()
        mean = float(np.mean(latencies_ms))
        p50 = float(latencies_ms[int(len(latencies_ms) * 0.50)])
        p95 = float(latencies_ms[int(len(latencies_ms) * 0.95)])
        p99 = float(latencies_ms[int(len(latencies_ms) * 0.99)])
        throughput = batch_size / (mean / 1000)

        return BenchmarkResult(
            backend=backend,
            batch_size=batch_size,
            image_size=image_size,
            tta=tta,
            mean_latency_ms=round(mean, 2),
            p50_latency_ms=round(p50, 2),
            p95_latency_ms=round(p95, 2),
            p99_latency_ms=round(p99, 2),
            throughput_img_per_sec=round(throughput, 1),
            device=cfg.resolve_device(),
        )

    # ────────── 报告 ──────────

    @staticmethod
    def print_report(results: List[BenchmarkResult]):
        """打印格式化的基准测试报告。"""
        print("\n" + "=" * 80)
        print("  ScratchV 性能基准测试报告")
        print("=" * 80)

        for r in results:
            label = f"{r.backend.upper()} (batch={r.batch_size}, size={r.image_size}"
            label += f", TTA={'ON' if r.tta else 'OFF'})"
            print(f"\n  [{label}]")
            print(f"    Device:          {r.device}")
            print(f"    Mean latency:    {r.mean_latency_ms:>8.2f} ms")
            print(f"    P50 / P95 / P99: {r.p50_latency_ms:.2f} / {r.p95_latency_ms:.2f} / {r.p99_latency_ms:.2f} ms")
            print(f"    Throughput:      {r.throughput_img_per_sec:>8.1f} img/sec")

        # 汇总对比
        print("\n" + "-" * 40)
        print("  汇总对比")
        print("-" * 40)
        baseline = next((r for r in results if r.backend == "pytorch" and r.batch_size == 1 and not r.tta), None)
        if baseline:
            for r in results:
                if r.tta or r.backend != baseline.backend:
                    speedup = baseline.mean_latency_ms / r.mean_latency_ms if r.mean_latency_ms > 0 else 0
                    print(f"  {r.backend.upper()} (bs={r.batch_size}, TTA={r.tta}): "
                          f"{r.mean_latency_ms:.1f}ms | "
                          f"{'x' + str(round(speedup, 2)) if speedup >= 1 else 'x' + str(round(1/speedup, 2)) + ' 慢'}")

    @staticmethod
    def save_json(results: List[BenchmarkResult], path: str):
        """导出结果为 JSON。"""
        data = {
            "benchmark_results": [asdict(r) for r in results],
            "summary": {
                "total_configs": len(results),
            }
        }
        Path(path).write_text(json.dumps(data, indent=2, ensure_ascii=False))
        logger.info("结果已保存: %s", path)


# ──────────────────────────────────────────────
# CLI 入口
# ──────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="ScratchV 性能基准测试")
    parser.add_argument("--pth", help="PyTorch checkpoint 路径")
    parser.add_argument("--onnx", help="ONNX 模型路径")
    parser.add_argument("--output", default="benchmark_result.json", help="结果输出路径")
    parser.add_argument("--iters", type=int, default=200, help="每轮迭代次数")
    parser.add_argument("--warmup", type=int, default=20, help="预热次数")
    args = parser.parse_args()

    if not args.pth and not args.onnx:
        parser.error("至少需要 --pth 或 --onnx 中的一个")

    logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")

    suite = BenchmarkSuite(
        pth_path=args.pth,
        onnx_path=args.onnx,
        n_warmup=args.warmup,
        n_iters=args.iters,
    )
    results = suite.run()
    BenchmarkSuite.print_report(results)
    BenchmarkSuite.save_json(results, args.output)


if __name__ == "__main__":
    main()
