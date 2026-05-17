"""
Cycle 级性能分析器 — 找出推理流水线中的瓶颈。

分析维度:
  1. 流水线各阶段耗时分解（预处理 / 推理 / 后处理）
  2. PyTorch 算子级 profiling（哪个算子最耗时）
  3. CPU 绑核与线程分析
  4. 内存带宽与缓存命中率

学习要点:
  - 深度学习推理的瓶颈通常不在算力（FLOPs），而在内存带宽
  - MobileNetV2 的 Depthwise Conv 是内存密集型算子
  - 减少数据拷贝（CPU↔GPU）比优化算子本身更有效
  - Batch 推理利用 GPU 并行性，饱和计算资源

用法::

    # 流水线概要分析
    python -m ScratchV.optimize.profiler --pth checkpoint.pth pipeline

    # PyTorch 算子级分析
    python -m ScratchV.optimize.profiler --pth checkpoint.pth --pytorch-ops

    # ONNX 性能分析
    python -m ScratchV.optimize.profiler --onnx model.onnx --onnx-profile
"""

from __future__ import annotations

import argparse
import logging
import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

import numpy as np

from ScratchV.core.config import ScratchConfig
from ScratchV.core.transforms import ImagePreprocessor
from ScratchV.core.model_adapter import create_model, ResultProcessor

logger = logging.getLogger(__name__)


@dataclass
class StageProfile:
    """单个流水线阶段的耗时统计（微秒）。"""
    name: str
    mean_us: float = 0.0
    min_us: float = 0.0
    max_us: float = 0.0
    pct_of_total: float = 0.0


@dataclass
class PipelineProfile:
    """完整流水线的性能分解。"""
    stages: List[StageProfile] = field(default_factory=list)
    total_mean_us: float = 0.0
    n_iters: int = 0

    @property
    def bottleneck(self) -> Optional[str]:
        if not self.stages:
            return None
        return max(self.stages, key=lambda s: s.pct_of_total).name

    def print(self):
        print("\n" + "=" * 60)
        print("  ScratchV 流水线性能分解")
        print("=" * 60)
        print(f"  {'Stage':<25} {'Mean(us)':<12} {'Min(us)':<12} {'Max(us)':<12} {'占比':<8}")
        print("-" * 60)
        for s in self.stages:
            bar = "█" * int(s.pct_of_total / 5)
            print(f"  {s.name:<25} {s.mean_us:<12.1f} {s.min_us:<12.1f} {s.max_us:<12.1f} "
                  f"{s.pct_of_total:<5.1f}% {bar}")
        print("-" * 60)
        print(f"  {'合计':<25} {self.total_mean_us:<12.1f}")
        if self.bottleneck:
            print(f"  🔍 瓶颈: {self.bottleneck}")


class Profiler:
    """
    推理流水线性能分析器。

    使用方式::

        profiler = Profiler(pth_path="checkpoint.pth")
        profile = profiler.profile_pipeline(n_iters=100)
        profile.print()
    """

    def __init__(
        self,
        pth_path: Optional[str] = None,
        onnx_path: Optional[str] = None,
    ):
        self.cfg = ScratchConfig.default()
        if pth_path:
            self.cfg.model.checkpoint_path = pth_path
        if onnx_path:
            self.cfg.model.onnx_path = onnx_path

        self.preprocessor = ImagePreprocessor(self.cfg.transform)
        self.model = create_model(self.cfg)
        self.processor = ResultProcessor()

    # ────────── 流水线分析 ──────────

    def profile_pipeline(
        self,
        n_warmup: int = 20,
        n_iters: int = 100,
    ) -> PipelineProfile:
        """
        分解推理流水线各阶段耗时。

        阶段划分:
          1. decode_decode: 图片解码 & 加载
          2. preprocess:    归一化 / Resize / CenterCrop
          3. inference:     模型推理
          4. postprocess:   结果后处理（softmax + 解析）
        """
        dummy_path = self._create_dummy_image()

        # Warmup
        for _ in range(n_warmup):
            self._timed_pipeline(dummy_path)

        # Benchmark
        stage_times = {
            "decode": [],
            "preprocess": [],
            "inference": [],
            "postprocess": [],
        }

        for _ in range(n_iters):
            times = self._timed_pipeline(dummy_path)
            for k, v in times.items():
                stage_times[k].append(v)

        total_mean = sum(
            np.mean(v) for v in stage_times.values()
        )

        stages = []
        for name, timings in stage_times.items():
            mean_us = float(np.mean(timings))
            stages.append(StageProfile(
                name=name,
                mean_us=mean_us,
                min_us=float(np.min(timings)),
                max_us=float(np.max(timings)),
                pct_of_total=(mean_us / total_mean * 100) if total_mean > 0 else 0,
            ))

        return PipelineProfile(stages=stages, total_mean_us=total_mean, n_iters=n_iters)

    def _timed_pipeline(self, image_path: str) -> Dict[str, float]:
        """运行一次完整流水线，返回各阶段耗时（微秒）。"""
        times = {}

        # decode
        t0 = time.perf_counter()
        from ScratchV.core.transforms import FastImageDecoder
        decoder = FastImageDecoder()
        img = decoder.decode(image_path)
        times["decode"] = (time.perf_counter() - t0) * 1_000_000

        # preprocess
        t0 = time.perf_counter()
        tensor = self.preprocessor(img)
        times["preprocess"] = (time.perf_counter() - t0) * 1_000_000

        # inference
        t0 = time.perf_counter()
        probs = self.model.predict(tensor)
        times["inference"] = (time.perf_counter() - t0) * 1_000_000

        # postprocess
        t0 = time.perf_counter()
        self.processor.process(probs)
        times["postprocess"] = (time.perf_counter() - t0) * 1_000_000

        return times

    @staticmethod
    def _create_dummy_image(size: Tuple[int, int] = (500, 500)) -> str:
        """创建临时测试图片。"""
        import cv2
        path = "/tmp/scratchv_dummy.jpg"
        if not Path(path).exists():
            img = np.random.randint(0, 256, (*size, 3), dtype=np.uint8)
            cv2.imwrite(path, img)
        return path

    # ────────── PyTorch 算子分析 ──────────

    def profile_pytorch_ops(self, n_iters: int = 10) -> dict:
        """
        使用 torch.profiler 分析 PyTorch 算子级耗时。

        返回:
            按耗时排序的算子列表
        """
        import torch

        dummy = torch.randn(1, 3, 224, 224)

        # Warmup
        for _ in range(5):
            self.model.predict(dummy)

        # Profile
        with torch.profiler.profile(
            activities=[
                torch.profiler.ProfilerActivity.CPU,
            ],
            record_shapes=True,
            with_stack=True,
        ) as prof:
            for _ in range(n_iters):
                self.model.predict(dummy)

        # 提取关键信息
        key_averages = prof.key_averages()
        sorted_ops = sorted(
            key_averages,
            key=lambda e: e.self_cpu_time_total,
            reverse=True,
        )[:15]

        print("\n" + "=" * 60)
        print("  PyTorch 算子级性能分析 (Top 15)")
        print("=" * 60)
        print(f"  {'Operator':<35} {'Self CPU(us)':<15} {'Count':<8} {'占比'}")
        print("-" * 60)

        total = sum(op.self_cpu_time_total for op in sorted_ops)
        for op in sorted_ops:
            pct = op.self_cpu_time_total / total * 100 if total > 0 else 0
            bar = "█" * int(pct / 3)
            print(f"  {str(op.key)[:35]:<35} {op.self_cpu_time_total:<15.0f} "
                  f"{op.count:<8} {pct:<5.1f}% {bar}")

        return {
            "total_self_cpu_time_us": total,
            "top_ops": [
                {
                    "name": str(op.key),
                    "self_cpu_time_us": op.self_cpu_time_total,
                    "count": op.count,
                }
                for op in sorted_ops
            ],
        }

    def cleanup(self):
        """清理资源。"""
        if hasattr(self, 'model'):
            if hasattr(self.model, 'close'):
                self.model.close()


# ──────────────────────────────────────────────
# CLI 入口
# ──────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="ScratchV 性能分析器")
    parser.add_argument("--pth", help="PyTorch checkpoint 路径")
    parser.add_argument("--onnx", help="ONNX 模型路径")
    parser.add_argument("--pipeline", action="store_true", default=True,
                        help="流水线阶段分析（默认）")
    parser.add_argument("--pytorch-ops", action="store_true",
                        help="PyTorch 算子级分析")
    parser.add_argument("--iters", type=int, default=100, help="迭代次数")
    args = parser.parse_args()

    if not args.pth and not args.onnx:
        parser.error("至少需要 --pth 或 --onnx 中的一个")

    logging.basicConfig(level=logging.WARNING)

    profiler = Profiler(pth_path=args.pth, onnx_path=args.onnx)

    try:
        if args.pipeline:
            profile = profiler.profile_pipeline(n_iters=args.iters)
            profile.print()

        if args.pytorch_ops:
            profiler.profile_pytorch_ops(n_iters=min(args.iters, 10))
    finally:
        profiler.cleanup()


if __name__ == "__main__":
    main()
