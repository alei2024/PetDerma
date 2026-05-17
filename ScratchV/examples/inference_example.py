"""
ScratchV 推理示例 — 快速上手指南。

本示例展示 ScratchV 的三种典型使用场景:
  1. 快速推理: 用默认配置直接预测一张图片
  2. 批处理: 同时预测多张图片
  3. TTA: 使用 Test-Time Augmentation 提高精度

运行::

    pip install -r ScratchV/requirements.txt
    python ScratchV/examples/inference_example.py
"""

import sys
from pathlib import Path

# 将项目根目录加入 sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from ScratchV import ScratchPipeline


def demo_quick_inference():
    """场景 1: 快速推理 — 一行代码预测一张图片。"""
    print("=" * 50)
    print("场景 1: 快速推理")
    print("=" * 50)

    # 创建 pipeline（自动选择 ONNX/PyTorch）
    pipe = ScratchPipeline()

    # 如果没有真实图片，用随机数据模拟
    import numpy as np
    dummy_image = np.random.randint(0, 256, (224, 224, 3), dtype=np.uint8)

    result = pipe.predict(dummy_image)[0]
    print(f"  预测结果: {result.disease_name_cn}")
    print(f"  置信度:   {result.confidence:.2%}")
    print(f"  严重程度: {result.severity}/5")
    print(f"  全部概率: {dict(sorted(result.all_probabilities.items(), key=lambda x: -x[1])[:3])}")
    print()


def demo_batch_inference():
    """场景 2: 批处理 — 同时预测多张图片。"""
    print("=" * 50)
    print("场景 2: 批处理推理")
    print("=" * 50)

    pipe = ScratchPipeline()
    import numpy as np

    # 模拟一批图片
    images = [
        np.random.randint(0, 256, (224, 224, 3), dtype=np.uint8)
        for _ in range(4)
    ]

    results = pipe.predict(images)
    for i, r in enumerate(results):
        print(f"  图片 {i+1}: {r.disease_name_cn} ({r.confidence:.2%})")
    print()


def demo_tta_inference():
    """场景 3: TTA — Test-Time Augmentation 提高精度。"""
    print("=" * 50)
    print("场景 3: TTA 推理（精度优先）")
    print("=" * 50)

    pipe = ScratchPipeline()
    import numpy as np

    dummy = np.random.randint(0, 256, (224, 224, 3), dtype=np.uint8)

    # 无 TTA
    r1 = pipe.predict(dummy, tta=False)[0]

    # 启用 TTA（4 组增强，结果取平均）
    r2 = pipe.predict(dummy, tta=True)[0]

    print(f"  无 TTA: {r1.disease_name_cn} ({r1.confidence:.2%})")
    print(f"  有 TTA: {r2.disease_name_cn} ({r2.confidence:.2%})")
    print()


def demo_pipeline_info():
    """查看 Pipeline 的配置信息。"""
    pipe = ScratchPipeline()
    info = pipe.summary()
    print()


if __name__ == "__main__":
    demo_quick_inference()
    demo_batch_inference()
    demo_tta_inference()
    demo_pipeline_info()
