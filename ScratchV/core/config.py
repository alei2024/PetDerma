"""
配置管理 — 通过类型安全的 dataclass 集中管理全部超参数。

设计思路:
  - 所有魔数（magic number）集中在此，避免散落在各处
  - 使用 dataclass + field 而非 dict，获得 IDE 自动补全和类型校验
  - 支持从 dict / JSON / ENV 三种来源初始化，适应不同部署场景
"""

from __future__ import annotations

import os
import json
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple


# ──────────────────────────────────────────────
# 疾病分类体系 —— 单一事实来源 (Single Source of Truth)
# ──────────────────────────────────────────────

# 模型输出的 6 个类别，顺序必须与训练时的 CLASS_NAMES 一致
DISEASE_CLASSES: List[str] = [
    "Dermatitis",           # 皮炎
    "Fungal_infections",    # 真菌感染
    "Healthy",              # 健康
    "Hypersensitivity",     # 过敏反应
    "demodicosis",          # 蠕形螨病
    "ringworm",             # 癣病
]

DISEASE_NAMES_CN: Dict[str, str] = {
    "Dermatitis": "皮炎",
    "Fungal_infections": "真菌感染",
    "Healthy": "健康",
    "Hypersensitivity": "过敏反应",
    "demodicosis": "蠕形螨病",
    "ringworm": "癣病",
}

DISEASE_DESCRIPTIONS: Dict[str, str] = {
    "Dermatitis": "皮炎是皮肤炎症的总称，可能由感染、刺激、过敏等多种原因引起。"
                  "主要表现为皮肤发红、肿胀、瘙痒、脱屑，严重时可能出现渗液和结痂。",
    "Fungal_infections": "真菌感染（常称「癣」）是由致病性真菌引起的皮肤病。"
                         "典型症状包括圆形或不规则形脱毛斑、皮屑增多、皮肤发红，具有传染性。",
    "Healthy": "皮肤状态正常，毛发光泽，皮温适中，弹性良好，未见明显病变或异常症状。",
    "Hypersensitivity": "过敏反应是机体对特定过敏原（食物、环境、跳蚤等）产生的过度免疫应答。"
                        "表现为剧烈瘙痒、红斑、丘疹，常累及耳部、腹部和四肢末端。",
    "demodicosis": "蠕形螨病是由蠕形螨在毛囊和皮脂腺内过度繁殖引起的皮肤病。"
                   "常见于幼犬和免疫功能低下的动物，表现为脱毛、红斑、结痂、皮肤增厚。",
    "ringworm": "癣病是由皮肤癣菌（如小孢子菌、毛癣菌）引起的传染性皮肤病。"
                "特征为圆形脱毛斑，边缘隆起，伴有鳞屑和结痂，可传染给人和其他动物。",
}

# 各类别基础严重程度（1-5 级）
BASE_SEVERITY: Dict[str, int] = {
    "Dermatitis": 3,
    "Fungal_infections": 4,
    "Healthy": 1,
    "Hypersensitivity": 2,
    "demodicosis": 4,
    "ringworm": 3,
}


# ──────────────────────────────────────────────
# 配置结构
# ──────────────────────────────────────────────

@dataclass
class TransformConfig:
    """图像预处理参数——对应 MobileNetV2 的 standard input pipeline。"""
    input_size: Tuple[int, int] = (224, 224)       # MobileNetV2 标准输入尺寸
    resize_size: int = 256                          # 先缩放到略大，再中心裁剪
    mean: Tuple[float, float, float] = (0.485, 0.456, 0.406)   # ImageNet 均值
    std: Tuple[float, float, float] = (0.229, 0.224, 0.225)    # ImageNet 标准差
    max_pixels: int = 1920 * 1080                   # 超过此分辨率自动缩小，防止 OOM
    enable_augmentation: bool = False               # 推理时关闭数据增强


@dataclass
class ModelConfig:
    """模型结构与权重路径。"""
    architecture: str = "mobilenet_v2"
    num_classes: int = 6
    checkpoint_path: str = ""                       # 留空表示初次运行需导出
    onnx_path: str = "models/dog_skin_disease.onnx"
    device: str = "auto"                            # auto / cpu / cuda:0
    confidence_threshold: float = 0.3               # 低于此阈值的预测将被过滤


@dataclass
class ServerConfig:
    """API 服务配置。"""
    host: str = "0.0.0.0"
    port: int = 5000
    workers: int = 4                                # Gunicorn worker 数
    max_image_size_mb: int = 10
    rate_limit_per_minute: int = 60
    cors_origins: List[str] = field(default_factory=lambda: ["*"])
    debug: bool = False


@dataclass
class ONNXConfig:
    """ONNX 导出与推理配置。"""
    opset_version: int = 17                         # 支持动态 shape 的最低版本
    dynamic_batch: bool = True
    optimize_level: int = 99                        # 99 = all optimize
    providers: List[str] = field(default_factory=lambda: [
        "CUDAExecutionProvider",
        "CPUExecutionProvider",
    ])
    intra_op_threads: int = 4
    inter_op_threads: int = 2


@dataclass
class ScratchConfig:
    """ScratchV 全局配置——聚合所有子配置。"""
    transform: TransformConfig = field(default_factory=TransformConfig)
    model: ModelConfig = field(default_factory=ModelConfig)
    server: ServerConfig = field(default_factory=ServerConfig)
    onnx: ONNXConfig = field(default_factory=ONNXConfig)

    # ── 工厂方法 ──

    @classmethod
    def from_dict(cls, d: Dict) -> "ScratchConfig":
        """从字典创建（可用于 JSON 反序列化）。"""
        cfg = cls()
        if "transform" in d:
            cfg.transform = TransformConfig(**d["transform"])
        if "model" in d:
            cfg.model = ModelConfig(**d["model"])
        if "server" in d:
            cfg.server = ServerConfig(**d["server"])
        if "onnx" in d:
            cfg.onnx = ONNXConfig(**d["onnx"])
        return cfg

    @classmethod
    def from_json(cls, path: str) -> "ScratchConfig":
        """从 JSON 配置文件加载。"""
        with open(path) as f:
            return cls.from_dict(json.load(f))

    @classmethod
    def default(cls) -> "ScratchConfig":
        """返回默认配置，适合快速上手。"""
        return cls()

    def resolve_device(self) -> str:
        """自动选择可用设备。"""
        if self.model.device != "auto":
            return self.model.device
        try:
            import torch
            if torch.cuda.is_available():
                return "cuda:0"
        except ImportError:
            pass
        return "cpu"
