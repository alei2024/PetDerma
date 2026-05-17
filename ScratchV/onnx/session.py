"""
ONNX Runtime 推理会话管理。

设计要点:
  - 延迟加载: Session 在首次推理时初始化，不阻塞 import
  - Provider 自动回退: CUDA → CPU
  - 线程数控制: 通过 SessionOptions 控制 intra/inter op 并行度

学习要点:
  1. ONNX Runtime 的 Session 是线程安全的，可被多个线程共享
  2. Provider 优先级影响推理速度，CUDA > CPU
  3. SessionOptions 可以精细控制内存和线程策略
  4. OrtValue 零拷贝推理可减少内存开销（高级用法）
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import List, Optional, Tuple

import numpy as np

from ScratchV.core.config import ScratchConfig

logger = logging.getLogger(__name__)


class ONNXSession:
    """
    ONNX Runtime 推理会话。

    用法::

        session = ONNXSession(config)
        probs = session.predict(tensor)   # tensor: [N, 3, 224, 224]
    """

    def __init__(self, cfg: ScratchConfig):
        self.cfg = cfg
        self._session = None
        self._input_name: Optional[str] = None
        self._output_name: Optional[str] = None
        self._num_classes: int = cfg.model.num_classes
        self._input_shape: Tuple[int, ...] = (1, 3, 224, 224)
        self.providers: List[str] = []

        # 延迟加载
        self._initialize()

    def _initialize(self):
        """初始化 ONNX Runtime 会话。"""
        import onnxruntime as ort

        onnx_path = Path(self.cfg.model.onnx_path)
        if not onnx_path.exists():
            raise FileNotFoundError(
                f"ONNX 模型不存在: {onnx_path}\n"
                f"请先运行: python -m ScratchV.onnx.export --checkpoint <你的.pth>"
            )

        # ── Session 选项 ──
        opts = ort.SessionOptions()
        opts.intra_op_num_threads = self.cfg.onnx.intra_op_threads
        opts.inter_op_num_threads = self.cfg.onnx.inter_op_threads
        opts.graph_optimization_level = ort.GraphOptimizationLevel(
            self.cfg.onnx.optimize_level
        )
        opts.enable_cpu_mem_arena = True

        # ── Provider 优先级 ──
        available = ort.get_available_providers()
        logger.debug("可用 providers: %s", available)

        # 只使用配置中指定的、且系统可用的 provider
        requested = self.cfg.onnx.providers
        self.providers = [p for p in requested if p in available]

        if not self.providers:
            logger.warning("配置的 providers 均不可用，回退到 CPU")
            self.providers = ["CPUExecutionProvider"]

        # ── 加载会话 ──
        self._session = ort.InferenceSession(
            str(onnx_path),
            sess_options=opts,
            providers=self.providers,
        )

        # ── 解析输入/输出元信息 ──
        self._input_name = self._session.get_inputs()[0].name
        self._output_name = self._session.get_outputs()[0].name

        input_shape = self._session.get_inputs()[0].shape
        if input_shape:
            # ONNX shape 可能是 ['batch_size', 3, -1, -1] 或 [1, 3, 224, 224]
            resolved = []
            for dim in input_shape:
                if isinstance(dim, int) and dim > 0:
                    resolved.append(dim)
                else:
                    resolved.append(1)  # dynamic axis, 用 1 占位
            self._input_shape = tuple(resolved)

        output_shape = self._session.get_outputs()[0].shape
        if output_shape and len(output_shape) > 1:
            nc = output_shape[1]
            if isinstance(nc, int) and nc > 0:
                self._num_classes = nc

        logger.info(
            "ONNX 会话已创建 | provider=%s | input=%s | output=%d classes",
            self._session.get_providers()[0],
            self._input_shape,
            self._num_classes,
        )

    # ────────── 推理接口 ──────────

    def predict(self, tensor: "torch.Tensor") -> np.ndarray:
        """
        执行 ONNX 推理。

        参数:
            tensor: [N, C, H, W] float32 torch.Tensor

        返回:
            [N, num_classes] float32 概率
        """
        import torch

        # 确保是 numpy (ONNX Runtime 不接受 torch.Tensor)
        if isinstance(tensor, torch.Tensor):
            arr = tensor.detach().cpu().numpy()
        else:
            arr = np.asarray(tensor, dtype=np.float32)

        # ONNX Runtime 推理
        outputs = self._session.run(
            [self._output_name],
            {self._input_name: arr},
        )

        # softmax (ONNX 模型通常输出 logits，不含 softmax)
        logits = outputs[0]
        exp = np.exp(logits - logits.max(axis=1, keepdims=True))
        probs = exp / exp.sum(axis=1, keepdims=True)

        return probs.astype(np.float32)

    # ────────── 属性 ──────────

    @property
    def num_classes(self) -> int:
        return self._num_classes

    @property
    def input_shape(self) -> Tuple[int, ...]:
        return self._input_shape

    # ────────── 生命周期 ──────────

    def close(self):
        """释放会话资源。"""
        if self._session is not None:
            del self._session
            self._session = None
            logger.info("ONNX 会话已关闭")

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()
