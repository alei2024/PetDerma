"""
ScratchPipeline — 端到端的推理流水线。

职责:
  1. 加载配置和模型
  2. 预处理输入图像
  3. 执行推理（支持 PyTorch / ONNX / TTA）
  4. 后处理结果
  5. 返回结构化诊断

使用方式::

    from ScratchV import ScratchPipeline

    pipe = ScratchPipeline()
    result = pipe("photo.jpg")
    print(result[0].disease_name_cn, result[0].confidence)

线程安全: 每个 pipeline 实例保持一份模型副本。
多线程推理时应为每个线程创建独立的 pipeline。
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import List, Optional, Union

import numpy as np

from ScratchV.core.config import ScratchConfig
from ScratchV.core.transforms import ImagePreprocessor
from ScratchV.core.model_adapter import (
    AbstractModel,
    Prediction,
    ResultProcessor,
    create_model,
)

logger = logging.getLogger(__name__)


class ScratchPipeline:
    """
    端到端推理流水线。

    参数:
        config:  配置对象，为 None 时使用默认配置
        backend: "auto" / "pytorch" / "onnx"
    """

    def __init__(
        self,
        config: Optional[ScratchConfig] = None,
        backend: str = "auto",
    ):
        self.cfg = config or ScratchConfig.default()
        logger.info("ScratchPipeline 初始化 | backend=%s", backend)

        # ── 子组件 ──
        self.preprocessor = ImagePreprocessor(self.cfg.transform)
        self.model: AbstractModel = create_model(self.cfg, backend)
        self.processor = ResultProcessor()

    # ────────── 主要接口 ──────────

    def predict(
        self,
        images,
        tta: bool = False,
        threshold: float = 0.3,
    ) -> List[Prediction]:
        """
        对输入图片执行皮肤病诊断。

        参数:
            images:    str / bytes / PIL.Image / np.ndarray / 上述的 list
            tta:       是否启用 Test-Time Augmentation（提高精度，降低速度）
            threshold: 置信度过滤阈值

        返回:
            List[Prediction]，长度 = 输入图片数
        """
        # 1. 预处理
        tensor = self.preprocessor(images, tta=tta)

        # 2. 推理
        if tta:
            # TTA 模式下 preprocessor 已返回 [N*T, ...] 的结果
            # 在 preprocessor.tta_predict 中聚合
            probs = self.preprocessor.tta_predict(self.model.predict, images)
        else:
            probs = self.model.predict(tensor)

        # 3. 后处理
        return self.processor.process(probs, threshold=threshold)

    def predict_single(
        self,
        image,
        tta: bool = False,
    ) -> Prediction:
        """单图预测的快捷方法。"""
        return self.predict(image, tta=tta)[0]

    # ────────── 批量推理 ──────────

    def predict_batch(
        self,
        image_paths: List[str],
        batch_size: int = 8,
        tta: bool = False,
    ) -> List[Prediction]:
        """
        分批处理大量图片，避免显存 OOM。

        参数:
            image_paths: 图片路径列表
            batch_size:  每批数量
            tta:         是否启用 TTA
        """
        results: List[Prediction] = []
        for i in range(0, len(image_paths), batch_size):
            batch = image_paths[i:i + batch_size]
            batch_results = self.predict(batch, tta=tta)
            results.extend(batch_results)
            logger.debug("批处理 %d/%d 完成", i + len(batch), len(image_paths))
        return results

    # ────────── 信息查询 ──────────

    def summary(self) -> dict:
        """打印并返回流水线概要信息。"""
        info = {
            "backend": type(self.model).__name__,
            "input_shape": self.model.input_shape(),
            "num_classes": self.model.num_classes(),
            "tta_supported": True,
        }
        print("=" * 50)
        print("ScratchPipeline 概要")
        print("=" * 50)
        for k, v in info.items():
            print(f"  {k}: {v}")
        return info
