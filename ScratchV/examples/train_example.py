"""
ScratchV 训练 / ONNX 导出 / 测试 完整工作流。

本示例展示完整的开发工作流:
  1. 构建 MobileNetV2 并加载预训练权重
  2. 导出为 ONNX 格式
  3. 验证 ONNX 正确性
  4. 简化并量化 ONNX 模型

运行::

    # 1. 训练/准备模型（已有 checkpoint 可跳过）
    # 2. 导出 ONNX
    python -m ScratchV.onnx.export --checkpoint model.pth --output model.onnx

    # 3. 测试 ONNX
    python -m ScratchV.onnx.test_onnx --onnx model.onnx --pth model.pth

    # 4. 量化
    python -m ScratchV.optimize.quantize --input model.onnx --fp16 --int8

    # 5. 性能基准
    python -m ScratchV.optimize.benchmark --pth model.pth --onnx model.onnx

    # 6. 启动服务
    python -m ScratchV.server.api
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

import numpy as np
import torch
import torch.nn as nn
from torchvision import models

from ScratchV.onnx.export import (
    build_mobilenetv2,
    load_checkpoint,
    export_to_onnx,
    verify_onnx,
    optimize_onnx_model,
)
from ScratchV.onnx.test_onnx import ONNXTestSuite


def workflow_demo():
    """端到端工作流演示。"""

    # 如果有 checkpoint，使用它；否则用随机权重演示
    checkpoint_path = "dog_skin_disease_MobileNetV2.pth"
    has_real_checkpoint = Path(checkpoint_path).exists()

    print("=" * 60)
    print("  ScratchV 训练/导出/测试 工作流演示")
    print("=" * 60)

    # Step 1: 构建模型
    print("\n[Step 1] 构建 MobileNetV2")
    model = build_mobilenetv2(num_classes=6)

    if has_real_checkpoint:
        model = load_checkpoint(model, checkpoint_path)
        print(f"         权重已加载: {checkpoint_path}")
    else:
        print("         使用随机权重（演示模式）")

    # Step 2: 导出 ONNX
    print("\n[Step 2] 导出 ONNX")
    onnx_path = "models/demo_model.onnx"
    export_to_onnx(model, onnx_path, opset_version=17, dynamic_batch=True)

    # Step 3: 验证
    print("\n[Step 3] 验证 ONNX")
    verify_onnx(onnx_path)

    # Step 4: 简化
    print("\n[Step 4] 简化 ONNX（可选）")
    optimize_onnx_model(onnx_path)

    # Step 5: 测试（如果有真实 checkpoint）
    if has_real_checkpoint:
        print("\n[Step 5] 运行 ONNX 测试套件")
        suite = ONNXTestSuite(
            onnx_path=onnx_path,
            pt_checkpoint=checkpoint_path,
            num_classes=6,
        )
        results = suite.run_all()
    else:
        print("\n[Step 5] 跳过测试（无真实 checkpoint）")
        print("         下载或训练模型后运行: onnx_test_suite")

    print("\n✅ 工作流演示完成")
    print(f"   ONNX 模型: {onnx_path}")
    print(f"   下一步: python -m ScratchV.server.api")


def quick_training_checkpoint():
    """
    创建一个简单的训练 checkpoint 用于演示。

    注意：这只是展示 checkpoint 格式，不能用于真实诊断。
    """
    model = build_mobilenetv2(num_classes=6)
    torch.save(model.state_dict(), "demo_checkpoint.pth")
    print("演示 checkpoint 已创建: demo_checkpoint.pth")
    print("（随机权重，仅供格式演示）")


if __name__ == "__main__":
    workflow_demo()
