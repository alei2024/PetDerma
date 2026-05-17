"""
模型量化 — 通过降低精度减少模型大小和推理延迟。

支持的量化方式:
  1. FP16: 半精度，几乎无损，约 2x 加速（需 CUDA GPU）
  2. INT8 (Dynamic): 动态量化，权重为 INT8，激活为 FP32
  3. INT8 (Static): 静态量化，需要校准数据集

学习要点:
  - FP16 对精度影响最小(< 0.5%)，推荐首选
  - INT8 需要校准数据，部署略复杂，但延迟更低
  - 量化后的模型体积约为原来的 1/4 (INT8) 或 1/2 (FP16)
  - 对于 MobileNetV2 这种轻量模型，CPU 上 INT8 收益更大

用法::

    # FP16 量化
    python -m ScratchV.optimize.quantize --input model.onnx --fp16

    # INT8 量化（需要校准数据）
    python -m ScratchV.optimize.quantize --input model.onnx --int8 --calib-dir ./images
"""

from __future__ import annotations

import argparse
import logging
from pathlib import Path
from typing import List, Optional

import numpy as np

logger = logging.getLogger(__name__)


class Quantizer:
    """
    ONNX 模型量化器。

    支持 FP16 和 INT8 两种量化方式。
    """

    def __init__(self, onnx_path: str):
        self.onnx_path = Path(onnx_path)
        if not self.onnx_path.exists():
            raise FileNotFoundError(f"ONNX 模型不存在: {onnx_path}")
        self._model = None

    def _load(self):
        import onnx
        self._model = onnx.load(str(self.onnx_path))

    @property
    def size_mb(self) -> float:
        """模型文件大小（MB）。"""
        return self.onnx_path.stat().st_size / (1024 * 1024)

    # ────────── FP16 量化 ──────────

    def quantize_fp16(self, output_path: str) -> str:
        """
        FP16 半精度量化。

        原理: 将 float32 的权重转为 float16。
        效果: 体积减半，速度提升约 2x (GPU)，精度损失几乎可忽略。

        注意: FP16 在 CPU 上可能反而更慢（需要 FP16C 指令集支持）。
        """
        try:
            import onnx
            from onnxconverter_common import float16
        except ImportError as e:
            raise ImportError(
                "FP16 量化需要 onnxconverter-common: pip install onnxconverter-common"
            ) from e

        self._load()
        fp16_model = float16.convert_float_to_float16(self._model)

        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        onnx.save(fp16_model, str(output_path))

        orig_mb = self.size_mb
        quant_mb = output_path.stat().st_size / (1024 * 1024)
        ratio = (1 - quant_mb / orig_mb) * 100

        logger.info("FP16 量化完成: %s", output_path)
        logger.info("  大小: %.2f MB → %.2f MB (减小 %.1f%%)", orig_mb, quant_mb, ratio)
        return str(output_path)

    # ────────── INT8 量化（动态） ──────────

    def quantize_int8_dynamic(self, output_path: str) -> str:
        """
        INT8 动态量化（ONNX Runtime 方式）。

        原理:
          - 权重: float32 → int8
          - 激活: 推理时动态计算量化范围

        效果:
          - 体积缩小约 75%
          - CPU 推理速度提升 2-4 倍
          - 精度损失通常 < 2%
        """
        import onnx
        from onnxruntime.quantization import quantize_dynamic, QuantType

        # 量化
        output_path = str(Path(output_path))
        quantize_dynamic(
            model_input=str(self.onnx_path),
            model_output=output_path,
            weight_type=QuantType.QInt8,
        )

        out = Path(output_path)
        orig_mb = self.size_mb
        quant_mb = out.stat().st_size / (1024 * 1024)
        ratio = (1 - quant_mb / orig_mb) * 100

        logger.info("INT8 动态量化完成: %s", output_path)
        logger.info("  大小: %.2f MB → %.2f MB (减小 %.1f%%)", orig_mb, quant_mb, ratio)
        return output_path

    # ────────── INT8 量化（静态） ──────────

    def quantize_int8_static(
        self,
        output_path: str,
        calibration_data: List[np.ndarray],
    ) -> str:
        """
        INT8 静态量化（需要校准数据集）。

        静态量化需要一批代表性图片来确定激活值的量化范围，
        效果通常比动态量化好 5-10%。

        参数:
            output_path:      输出路径
            calibration_data: 校准图片列表，每个元素为 [1,3,H,W] 的 float32 ndarray
        """
        import onnx
        from onnxruntime.quantization import (
            quantize_static,
            QuantType,
            CalibrationMethod,
        )
        from onnxruntime.quantization import CalibrationDataReader

        class _CalibReader(CalibrationDataReader):
            def __init__(self, data: List[np.ndarray]):
                self.data = data
                self.idx = 0

            def get_next(self) -> Optional[dict]:
                if self.idx >= len(self.data):
                    return None
                datum = self.data[self.idx]
                self.idx += 1
                return {"input": datum}

        quantize_static(
            model_input=str(self.onnx_path),
            model_output=output_path,
            calibration_data_reader=_CalibReader(calibration_data),
            quant_format=QuantType.QInt8,
            activation_type=QuantType.QInt8,
            weight_type=QuantType.QInt8,
            calibrate_method=CalibrationMethod.MinMax,
        )

        out = Path(output_path)
        orig_mb = self.size_mb
        quant_mb = out.stat().st_size / (1024 * 1024)
        ratio = (1 - quant_mb / orig_mb) * 100

        logger.info("INT8 静态量化完成: %s", output_path)
        logger.info("  大小: %.2f MB → %.2f MB (减小 %.1f%%)", orig_mb, quant_mb, ratio)
        return output_path


# ──────────────────────────────────────────────
# CLI 入口
# ──────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="ScratchV 模型量化工具")
    parser.add_argument("--input", required=True, help="输入 ONNX 模型路径")
    parser.add_argument("--output", default=None, help="输出路径")
    parser.add_argument("--fp16", action="store_true", help="FP16 量化")
    parser.add_argument("--int8", action="store_true", help="INT8 动态量化")
    parser.add_argument("--int8-static", action="store_true", help="INT8 静态量化")
    parser.add_argument("--calib-dir", help="INT8 静态量化校准数据目录")
    args = parser.parse_args()

    if not any([args.fp16, args.int8, args.int8_static]):
        parser.error("请指定量化方式: --fp16 / --int8 / --int8-static")

    logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")

    quantizer = Quantizer(args.input)
    print(f"原始模型: {args.input} ({quantizer.size_mb:.2f} MB)")

    output_base = args.output or str(Path(args.input).with_suffix(""))

    if args.fp16:
        output = output_base.replace(".onnx", "") + "_fp16.onnx"
        quantizer.quantize_fp16(output)

    if args.int8:
        output = output_base.replace(".onnx", "") + "_int8_dynamic.onnx"
        quantizer.quantize_int8_dynamic(output)

    if args.int8_static:
        if not args.calib_dir:
            parser.error("INT8 静态量化需要 --calib-dir")
        output = output_base.replace(".onnx", "") + "_int8_static.onnx"
        # 从目录加载校准图片（简化实现）
        from PIL import Image
        import torchvision.transforms as T
        transform = T.Compose([
            T.Resize(256),
            T.CenterCrop(224),
            T.ToTensor(),
            T.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
        ])
        calib_data = []
        for img_path in Path(args.calib_dir).glob("*.*"):
            if img_path.suffix.lower() in (".jpg", ".jpeg", ".png"):
                img = Image.open(img_path).convert("RGB")
                tensor = transform(img).unsqueeze(0).numpy()
                calib_data.append(tensor)
        logger.info("加载了 %d 张校准图片", len(calib_data))
        quantizer.quantize_int8_static(output, calib_data)


if __name__ == "__main__":
    main()
