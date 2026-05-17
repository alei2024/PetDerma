"""
ONNX 模型导出 — 将 PyTorch checkpoint 转换为 ONNX 格式。

导出的关键参数说明:
  - opset_version=17: 支持 Resize 等算子的最新稳定版本
  - dynamic_axes:     允许 batch size 和图像尺寸在推理时变化
  - input_names/output_names: 推理时通过名称访问张量

学习要点:
  1. ONNX 是计算图格式，不包含训练相关的梯度信息
  2. dynamic_axes 让导出的模型可以接受可变 batch size
  3. opset 版本决定了支持的算子集合，太低会导致不支持某些操作
  4. 导出后应使用 onnx.checker 验证模型完整性
  5. 不同设备（CPU/GPU）导出的 ONNX 算子可能不同

用法::

    # 基本用法
    python -m ScratchV.onnx.export --checkpoint model.pth --output model.onnx

    # 指定 opset
    python -m ScratchV.onnx.export --checkpoint model.pth --opset 17
"""

from __future__ import annotations

import argparse
import logging
from pathlib import Path
from typing import Dict, Optional, Tuple

import torch
import torch.nn as nn
from torchvision import models

from ScratchV.core.config import ScratchConfig

logger = logging.getLogger(__name__)


def build_mobilenetv2(num_classes: int = 6) -> nn.Module:
    """
    构建与训练时结构一致的 MobileNetV2。

    注意:
      必须与训练脚本中的模型定义完全一致，
      否则导出的 ONNX 权重会乱掉。
    """
    model = models.mobilenet_v2(weights=None)
    model.classifier[1] = nn.Linear(model.last_channel, num_classes)
    return model


def load_checkpoint(
    model: nn.Module,
    checkpoint_path: str,
    strict: bool = False,
) -> nn.Module:
    """
    加载 .pth checkpoint 到模型。

    strict=False 可以忽略一些不匹配的 key
    （例如分类头在微调前后维度不同）。
    """
    state = torch.load(checkpoint_path, map_location="cpu", weights_only=True)
    # 兼容不同保存格式
    if isinstance(state, dict):
        for key in ("state_dict", "model_state_dict", "net"):
            if key in state:
                state = state[key]
                break
    model.load_state_dict(state, strict=strict)
    model.eval()
    return model


def export_to_onnx(
    model: nn.Module,
    output_path: str,
    input_shape: Tuple[int, ...] = (1, 3, 224, 224),
    opset_version: int = 17,
    dynamic_batch: bool = True,
    verbose: bool = False,
) -> str:
    """
    将 PyTorch 模型导出为 ONNX 格式。

    参数:
        model:          PyTorch 模型（eval 模式）
        output_path:    .onnx 文件保存路径
        input_shape:    示例输入形状 (N, C, H, W)
        opset_version:  ONNX opset 版本
        dynamic_batch:  是否允许 batch size 动态变化
        verbose:        打印详细导出信息

    返回:
        ONNX 文件路径
    """
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # ── 构建示例输入 ──
    dummy_input = torch.randn(input_shape, dtype=torch.float32)

    # ── 动态轴配置 ──
    dynamic_axes: Optional[Dict[str, Dict[int, str]]] = None
    if dynamic_batch:
        dynamic_axes = {
            "input": {0: "batch_size"},
            "output": {0: "batch_size"},
        }

    # ── 导出 ──
    torch.onnx.export(
        model,
        dummy_input,
        str(output_path),
        input_names=["input"],
        output_names=["output"],
        dynamic_axes=dynamic_axes,
        opset_version=opset_version,
        do_constant_folding=True,
        verbose=verbose,
        export_params=True,
    )

    logger.info("ONNX 导出成功: %s (opset=%d, dynamic=%s)",
                output_path, opset_version, dynamic_batch)
    return str(output_path)


def optimize_onnx_model(onnx_path: str) -> str:
    """
    使用 onnx-simplifier 简化 ONNX 模型。

    简化可以:
      - 融合连续的 Reshape/Transpose/GEMM
      - 删除无用的节点
      - 常数折叠

    需要安装: pip install onnx-simplifier
    """
    try:
        import onnx
        import onnxsim
    except ImportError:
        logger.warning("onnx-simplifier 未安装，跳过优化。pip install onnx-simplifier")
        return onnx_path

    model = onnx.load(onnx_path)
    simplified, ok = onnxsim.simplify(model)
    if ok:
        onnx.save(simplified, onnx_path)
        logger.info("ONNX 模型已简化: %s", onnx_path)
    else:
        logger.warning("ONNX 简化失败，保留原始模型")
    return onnx_path


def verify_onnx(onnx_path: str) -> bool:
    """
    使用 onnx.checker 验证 ONNX 模型完整性。

    检查项:
      - 图结构完整性
      - 所有节点的输入输出都有对应的 value info
      - 类型和 shape 一致性
    """
    try:
        import onnx
        model = onnx.load(onnx_path)
        onnx.checker.check_model(model)
        logger.info("ONNX 校验通过: %s", onnx_path)

        # 打印图概要
        n_nodes = len(model.graph.node)
        n_params = sum(p for p in (
            t.data_type for t in model.graph.initializer
        ))
        logger.info("  节点数: %d, 参数张量数: %d", n_nodes, n_params)
        return True
    except Exception as e:
        logger.error("ONNX 校验失败: %s", e)
        return False


# ──────────────────────────────────────────────
# CLI 入口
# ──────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="ScratchV ONNX 导出工具")
    parser.add_argument("--checkpoint", required=True, help="PyTorch checkpoint 路径")
    parser.add_argument("--output", default="models/dog_skin_disease.onnx", help="输出 ONNX 路径")
    parser.add_argument("--opset", type=int, default=17, help="ONNX opset 版本")
    parser.add_argument("--num-classes", type=int, default=6, help="分类数")
    parser.add_argument("--no-dynamic", action="store_true", help="禁用 dynamic batch")
    parser.add_argument("--no-optimize", action="store_true", help="跳过 onnx-simplifier 优化")
    parser.add_argument("--verbose", action="store_true", help="打印详细导出信息")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")

    print("=" * 60)
    print("  ScratchV ONNX 导出工具")
    print("=" * 60)

    # 1. 构建模型
    print(f"\n[1/4] 构建 MobileNetV2 (num_classes={args.num_classes})...")
    model = build_mobilenetv2(args.num_classes)

    # 2. 加载权重
    print(f"[2/4] 加载 checkpoint: {args.checkpoint}")
    model = load_checkpoint(model, args.checkpoint)

    # 3. 导出 ONNX
    print(f"[3/4] 导出 ONNX (opset={args.opset}, dynamic={not args.no_dynamic})...")
    onnx_path = export_to_onnx(
        model,
        args.output,
        opset_version=args.opset,
        dynamic_batch=not args.no_dynamic,
        verbose=args.verbose,
    )

    # 4. 验证
    print(f"[4/4] 验证 ONNX 模型...")
    verify_onnx(onnx_path)

    if not args.no_optimize:
        optimize_onnx_model(onnx_path)

    print(f"\n✅ ONNX 模型已就绪: {onnx_path}")
    print(f"   输入: [batch_size, 3, 224, 224]")
    print(f"   输出: [batch_size, {args.num_classes}]")


if __name__ == "__main__":
    main()
