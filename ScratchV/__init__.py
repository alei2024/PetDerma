"""
ScratchV — 从零构建的专业宠物皮肤病视觉诊断引擎
================================================

ScratchV 是一个模块化、可扩展的计算机视觉推理框架，
专为 PetDerma 的宠物皮肤病诊断场景设计。

核心能力:
  - PyTorch / ONNX 双引擎推理
  - 完整的图像预处理流水线
  - 生产级 Flask API 服务
  - 性能基准测试与量化优化

设计原则:
  - 每一行代码都有明确的教育目的
  - 类型安全，可测试，可 Profiling
  - 关注点分离，每个模块只做一件事
"""

__version__ = "1.0.0"
__author__ = "PetDerma Team"

from ScratchV.core.config import ScratchConfig
from ScratchV.core.pipeline import ScratchPipeline
from ScratchV.onnx.session import ONNXSession

__all__ = ["ScratchConfig", "ScratchPipeline", "ONNXSession"]
