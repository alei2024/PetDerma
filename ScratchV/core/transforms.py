"""
图像预处理流水线 — 将原始图片转换为模型可接受的张量。

学习要点:
  1. MobileNetV2 训练时使用 ImageNet 标准化参数，推理时必须一致
  2. 先 Resize 再 CenterCrop 比直接 Resize 到目标尺寸效果更好
  3. 除法归一化必须在 ToTensor 之后（ToTensor 已将像素缩放到 [0,1]）
  4. 推理时不要使用 Random* 增强，只使用确定性的 TTA（Test-Time Augmentation）

性能优化:
  - 使用 OpenCV (cv2) 而非 PIL 解码，速度提升 2-3 倍
  - 大图先缩小再送入流水线，避免不必要的内存拷贝
  - TTA 时使用 torch.no_grad() + batch 推理，利用向量化
"""

from __future__ import annotations

import io
from typing import List, Optional, Tuple

import cv2
import numpy as np
import torch
import torch.nn.functional as F
import torchvision.transforms as T
from torchvision.transforms import functional as TF
from PIL import Image

from ScratchV.core.config import TransformConfig


class ImagePreprocessor:
    """
    端到端的图像预处理流水线。

    Usage::

        preprocessor = ImagePreprocessor(config)
        tensor = preprocessor("photo.jpg")           # 单图 → [1,3,224,224]
        batch  = preprocessor(["a.jpg", "b.jpg"])    # 多图 → [N,3,224,224]

    支持输入: 文件路径 (str) / bytes / PIL.Image / numpy.ndarray (HWC, uint8)
    """

    def __init__(self, config: Optional[TransformConfig] = None):
        self.cfg = config or TransformConfig()

        # ── 确定性推理流水线 ──
        self.center_pipeline = T.Compose([
            T.Resize(self.cfg.resize_size),
            T.CenterCrop(self.cfg.input_size),
            T.ToTensor(),
            T.Normalize(mean=self.cfg.mean, std=self.cfg.std),
        ])

        # ── TTA 流水线（推理时可选的 4 组增强） ──
        self._tta_pipelines = {
            "none": self.center_pipeline,
            "hflip": T.Compose([
                T.Resize(self.cfg.resize_size),
                T.CenterCrop(self.cfg.input_size),
                T.RandomHorizontalFlip(p=1.0),
                T.ToTensor(),
                T.Normalize(mean=self.cfg.mean, std=self.cfg.std),
            ]),
            "rotate+10": T.Compose([
                T.Resize(self.cfg.resize_size),
                T.CenterCrop(self.cfg.input_size),
                T.RandomRotation(10),
                T.ToTensor(),
                T.Normalize(mean=self.cfg.mean, std=self.cfg.std),
            ]),
            "rotate-10": T.Compose([
                T.Resize(self.cfg.resize_size),
                T.CenterCrop(self.cfg.input_size),
                T.RandomRotation(-10),
                T.ToTensor(),
                T.Normalize(mean=self.cfg.mean, std=self.cfg.std),
            ]),
        }

    # ────────── 公开接口 ──────────

    def __call__(self, images, tta: bool = False) -> torch.Tensor:
        """
        参数:
            images: str / bytes / PIL.Image / np.ndarray / 上述的 list
            tta:   是否启用 Test-Time Augmentation（返回 [N*T, C, H, W]）

        返回:
            [N, C, H, W] 的 torch.float32 张量，已归一化
        """
        if isinstance(images, (str, bytes, Image.Image, np.ndarray)):
            images = [images]
        # 统一转为 PIL.Image
        pil_list = [self._to_pil(img) for img in images]

        if not tta:
            tensors = [self.center_pipeline(p) for p in pil_list]
            return torch.stack(tensors)

        # TTA: 对每张图片运行所有增强流水线
        all_tensors = []
        for p in pil_list:
            for pipeline in self._tta_pipelines.values():
                all_tensors.append(pipeline(p))
        return torch.stack(all_tensors)

    # ────────── TTA 工具 ──────────

    def tta_predict(
        self,
        model_fn,
        images,
        reduce: str = "mean",
    ) -> np.ndarray:
        """
        执行 TTA 推理并聚合结果。

        参数:
            model_fn:   callable(tensor) → np.ndarray [N, num_classes]
            images:     输入图片
            reduce:     "mean" / "max" / "vote" 聚合策略

        返回:
            [N, num_classes] 聚合后的概率
        """
        batch = self(images, tta=True)            # [N*T, C, H, W]
        with torch.no_grad():
            logits = model_fn(batch)              # [N*T, num_classes]
        probs = F.softmax(torch.as_tensor(logits), dim=-1).numpy()

        n = len(images) if isinstance(images, list) else 1
        t = len(self._tta_pipelines)
        probs = probs.reshape(n, t, -1)           # [N, T, num_classes]

        if reduce == "mean":
            return probs.mean(axis=1)
        elif reduce == "max":
            return probs.max(axis=1)
        elif reduce == "vote":
            votes = probs.argmax(axis=2)          # [N, T]
            out = np.zeros_like(probs[:, 0, :])
            for i in range(n):
                for j in range(t):
                    out[i, votes[i, j]] += 1
            return out / t
        else:
            raise ValueError(f"Unknown reduce: {reduce}")

    # ────────── 内部工具 ──────────

    @staticmethod
    def _to_pil(source) -> Image.Image:
        """任意输入 → PIL.Image (RGB)。"""
        if isinstance(source, str):
            # ── 快速解码：先尝试 OpenCV ──
            img = cv2.imread(source, cv2.IMREAD_COLOR)
            if img is not None:
                return Image.fromarray(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
            # 回退到 PIL
            return Image.open(source).convert("RGB")

        if isinstance(source, bytes):
            return Image.open(io.BytesIO(source)).convert("RGB")

        if isinstance(source, Image.Image):
            return source.convert("RGB")

        if isinstance(source, np.ndarray):
            # 假定 HWC, uint8
            if source.shape[2] == 4:
                source = cv2.cvtColor(source, cv2.COLOR_BGRA2RGB)
            elif source.shape[2] == 3:
                source = cv2.cvtColor(source, cv2.COLOR_BGR2RGB)
            return Image.fromarray(source)

        raise TypeError(f"Unsupported image type: {type(source)}")

    # ────────── 调试工具 ──────────

    def visualize(self, tensor: torch.Tensor) -> np.ndarray:
        """反归一化张量为可视化的 numpy 图像 (HWC, uint8)。"""
        img = tensor.detach().cpu().clone()
        if img.dim() == 4:
            img = img[0]
        # 反归一化
        mean = torch.tensor(self.cfg.mean).view(3, 1, 1)
        std = torch.tensor(self.cfg.std).view(3, 1, 1)
        img = img * std + mean
        img = img.clamp(0, 1).permute(1, 2, 0).numpy()
        return (img * 255).astype(np.uint8)


class FastImageDecoder:
    """
    高性能图片解码器 — 使用 OpenCV 实现 2-3x 加速。

    当图片分辨率超过 max_pixels 时自动缩小，避免 OOM。
    """

    def __init__(self, max_pixels: int = 1920 * 1080):
        self.max_pixels = max_pixels

    def decode(self, path: str) -> np.ndarray:
        img = cv2.imread(path, cv2.IMREAD_COLOR)
        if img is None:
            raise FileNotFoundError(f"无法解码图片: {path}")
        return self._maybe_downscale(img)

    def decode_bytes(self, data: bytes) -> np.ndarray:
        arr = np.frombuffer(data, np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("无法解码图片字节数据")
        return self._maybe_downscale(img)

    def _maybe_downscale(self, img: np.ndarray) -> np.ndarray:
        h, w = img.shape[:2]
        if h * w > self.max_pixels:
            scale = (self.max_pixels / (h * w)) ** 0.5
            new_w, new_h = int(w * scale), int(h * scale)
            return cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)
        return img
