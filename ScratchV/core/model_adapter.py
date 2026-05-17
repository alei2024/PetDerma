"""
模型抽象层 — 统一 PyTorch 和 ONNX 两种推理后端。

设计模式: 策略模式 (Strategy Pattern)
  - 通过同一接口调用 PyTorch eager 或 ONNX Runtime
  - 运行时根据配置自动选择后端
  - 新增后端（如 TensorRT）只需实现 AbstractModel 接口

学习要点:
  1. MobileNetV2 的 classifier 是 nn.Linear(1280, num_classes)，需替换
  2. state_dict 加载时需设置 map_location，否则 GPU 权重无法加载到 CPU
  3. model.eval() + torch.no_grad() 是推理的标准组合，缺一不可
"""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np
import torch
import torch.nn as nn
from torchvision import models

from ScratchV.core.config import (
    ScratchConfig,
    DISEASE_CLASSES,
    DISEASE_NAMES_CN,
    DISEASE_DESCRIPTIONS,
    BASE_SEVERITY,
)

logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────
# 抽象接口
# ──────────────────────────────────────────────

class AbstractModel(ABC):
    """所有推理后端的统一接口。"""

    @abstractmethod
    def predict(self, tensor: torch.Tensor) -> np.ndarray:
        """
        参数:
            tensor: [N, C, H, W] float32, 已归一化

        返回:
            [N, num_classes] float32 概率 (已 softmax)
        """
        ...

    @abstractmethod
    def num_classes(self) -> int:
        ...

    @abstractmethod
    def input_shape(self) -> Tuple[int, ...]:
        ...


# ──────────────────────────────────────────────
# PyTorch 后端
# ──────────────────────────────────────────────

class PyTorchModel(AbstractModel):
    """使用 PyTorch eager mode 推理。"""

    def __init__(self, cfg: ScratchConfig):
        self.cfg = cfg
        self.device = torch.device(cfg.resolve_device())
        self._model = self._build_model()
        self._model.to(self.device)
        self._model.eval()
        logger.info("PyTorchModel 已就绪 | device=%s", self.device)

    def _build_model(self) -> nn.Module:
        mcfg = self.cfg.model
        model = models.mobilenet_v2(weights=None)
        model.classifier[1] = nn.Linear(model.last_channel, mcfg.num_classes)

        if mcfg.checkpoint_path and Path(mcfg.checkpoint_path).exists():
            state = torch.load(mcfg.checkpoint_path, map_location="cpu")
            # 支持完整 checkpoint 和纯 state_dict 两种格式
            if "state_dict" in state:
                state = state["state_dict"]
            elif "model_state_dict" in state:
                state = state["model_state_dict"]
            missing, unexpected = model.load_state_dict(state, strict=False)
            if missing:
                logger.warning("Missing keys: %s", missing)
            if unexpected:
                logger.warning("Unexpected keys: %s", unexpected)
            logger.info("权重已加载: %s", mcfg.checkpoint_path)
        else:
            logger.warning("checkpoint_path 为空或文件不存在，使用随机初始化")

        return model

    @torch.no_grad()
    def predict(self, tensor: torch.Tensor) -> np.ndarray:
        tensor = tensor.to(self.device)
        logits = self._model(tensor)
        probs = torch.softmax(logits, dim=1)
        return probs.cpu().numpy()

    def num_classes(self) -> int:
        return self.cfg.model.num_classes

    def input_shape(self) -> Tuple[int, ...]:
        s = self.cfg.transform.input_size
        return (1, 3, s[0], s[1])


# ──────────────────────────────────────────────
# ONNX 后端（轻量代理，完整实现在 onnx/session.py）
# ──────────────────────────────────────────────

class ONNXModel(AbstractModel):
    """使用 ONNX Runtime 推理。"""

    def __init__(self, cfg: ScratchConfig):
        from ScratchV.onnx.session import ONNXSession
        self._session = ONNXSession(cfg)
        logger.info("ONNXModel 已就绪 | providers=%s", self._session.providers)

    def predict(self, tensor: torch.Tensor) -> np.ndarray:
        return self._session.predict(tensor)

    def num_classes(self) -> int:
        return self._session.num_classes

    def input_shape(self) -> Tuple[int, ...]:
        return self._session.input_shape


# ──────────────────────────────────────────────
# 模型工厂
# ──────────────────────────────────────────────

def create_model(cfg: ScratchConfig, backend: str = "auto") -> AbstractModel:
    """
    根据配置创建合适的模型后端。

    参数:
        cfg:     全局配置
        backend: "auto" / "pytorch" / "onnx"
                 auto = 有 ONNX 文件则用 ONNX，否则 PyTorch

    返回:
        AbstractModel 实例
    """
    if backend == "auto":
        onnx_path = Path(cfg.model.onnx_path)
        if onnx_path.exists():
            backend = "onnx"
            logger.info("自动选择 ONNX 后端: %s", onnx_path)
        else:
            backend = "pytorch"
            logger.info("自动选择 PyTorch 后端（%s 不存在）", onnx_path)

    if backend == "onnx":
        return ONNXModel(cfg)
    elif backend == "pytorch":
        return PyTorchModel(cfg)
    else:
        raise ValueError(f"Unknown backend: {backend}")


# ──────────────────────────────────────────────
# 结构化预测结果
# ──────────────────────────────────────────────

@dataclass
class Prediction:
    """单次预测的结构化结果。"""
    predicted_class: str
    disease_name_cn: str
    confidence: float
    all_probabilities: Dict[str, float]
    severity: int
    description: str
    warning: str = "此结果仅供参考，请以专业兽医诊断为准。"


class ResultProcessor:
    """将模型输出的概率向量转换为可读的诊断结果。"""

    def __init__(self, classes: List[str] | None = None):
        self.classes = classes or DISEASE_CLASSES

    def process(self, probs: np.ndarray, threshold: float = 0.3) -> List[Prediction]:
        """
        参数:
            probs:    [N, num_classes] float32
            threshold: 置信度过滤阈值

        返回:
            每个样本对应一个 Prediction
        """
        results = []
        for i in range(probs.shape[0]):
            pred_idx = int(probs[i].argmax())
            confidence = float(probs[i, pred_idx])
            predicted_class = self.classes[pred_idx]

            all_probs = {
                self.classes[j]: float(probs[i, j])
                for j in range(len(self.classes))
            }

            results.append(Prediction(
                predicted_class=predicted_class,
                disease_name_cn=DISEASE_NAMES_CN.get(predicted_class, predicted_class),
                confidence=confidence,
                all_probabilities=all_probs,
                severity=self._calc_severity(predicted_class, confidence),
                description=DISEASE_DESCRIPTIONS.get(predicted_class, ""),
            ))
        return results

    @staticmethod
    def _calc_severity(disease_class: str, confidence: float) -> int:
        base = BASE_SEVERITY.get(disease_class, 3)
        if confidence < 0.5:
            return max(1, base - 1)
        elif confidence > 0.9:
            return min(5, base + 1)
        return base
