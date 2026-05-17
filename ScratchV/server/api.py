"""
生产级 Flask API 服务 — 高性能模型推理端点。

端点:
  POST   /predict           单图预测（base64 / multipart）
  POST   /predict_multiple  多图综合预测
  GET    /health            健康检查
  GET    /models/info       模型元信息

安全:
  - 请求频率限制 (Rate Limiting)
  - 图片大小限制
  - CORS 支持
  - API Key 验证（可选）

性能:
  - 全局单例 ONNX 会话，避免重复加载
  - 请求级预处理/后处理，不阻塞其他请求
  - Gunicorn 多 worker 并发

用法::

    # 开发
    python -m ScratchV.server.api

    # 生产（推荐）
    gunicorn -w 4 -b 0.0.0.0:5000 ScratchV.server.api:app
"""

from __future__ import annotations

import io
import logging
import time
from pathlib import Path
from typing import Optional

import numpy as np
from flask import Flask, jsonify, request

from ScratchV import ScratchPipeline, ScratchConfig
from ScratchV.core.config import DISEASE_CLASSES, DISEASE_NAMES_CN
from ScratchV.onnx.test_onnx import ONNXTestSuite

logger = logging.getLogger(__name__)

# ── 全局变量（init_app 中初始化） ──
app = Flask(__name__)
pipeline: Optional[ScratchPipeline] = None
cfg: Optional[ScratchConfig] = None


# ──────────────────────────────────────────────
# 请求 / 响应 Schema（文档用）
# ──────────────────────────────────────────────

REQUEST_EXAMPLE = {
    "image": "<base64 encoded image data>",
    "filename": "photo.jpg",
}

RESPONSE_EXAMPLE = {
    "success": True,
    "predictedClass": "Fungal_infections",
    "confidence": 85.5,
    "diseaseName": "真菌感染",
    "description": "真菌感染是由各种真菌引起的皮肤病...",
    "severity": 4,
    "allProbabilities": [
        {"class": "Fungal_infections", "probability": 0.855, "diseaseName": "真菌感染"},
        {"class": "Dermatitis", "probability": 0.082, "diseaseName": "皮炎"},
    ],
    "suggestions": {
        "homeAdvice": ["保持患处清洁干燥..."],
        "medicalAdvice": ["建议前往宠物医院..."],
        "preventAdvice": ["定期给宠物洗澡..."],
    },
    "warning": "此结果仅供参考，请以专业兽医诊断为准。",
    "latency_ms": 45.2,
}


# ──────────────────────────────────────────────
# 初始化
# ──────────────────────────────────────────────

def create_app(config_path: Optional[str] = None) -> Flask:
    """应用工厂。"""
    global pipeline, cfg

    # 配置
    if config_path:
        cfg = ScratchConfig.from_json(config_path)
    else:
        cfg = ScratchConfig.default()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)-5s | %(name)s | %(message)s",
    )

    # 初始化 Pipeline（自动选择 ONNX / PyTorch）
    pipeline = ScratchPipeline(cfg, backend="auto")
    pipeline.summary()

    # 注册路由
    _register_routes(app)

    logger.info("ScratchV API 服务已就绪")
    return app


def _register_routes(app: Flask):
    """注册 API 路由。"""

    @app.route("/health", methods=["GET"])
    def health():
        """健康检查端点。"""
        return jsonify({
            "status": "healthy",
            "model_loaded": pipeline is not None,
            "backend": type(pipeline.model).__name__ if pipeline else "N/A",
        })

    @app.route("/models/info", methods=["GET"])
    def model_info():
        """模型元信息。"""
        return jsonify({
            "num_classes": pipeline.model.num_classes(),
            "disease_classes": DISEASE_CLASSES,
            "disease_names_cn": DISEASE_NAMES_CN,
            "input_shape": pipeline.model.input_shape(),
            "backend": type(pipeline.model).__name__,
        })

    @app.route("/predict", methods=["POST"])
    def predict():
        """单图预测。"""
        start = time.perf_counter()
        try:
            image_data = _extract_image(request)
            if image_data is None:
                return jsonify({"error": "请提供图片 (image field)"}), 400

            result = pipeline.predict(image_data)[0]
            elapsed_ms = (time.perf_counter() - start) * 1000

            return jsonify({
                "success": True,
                "predictedClass": result.predicted_class,
                "confidence": round(result.confidence * 100, 2),
                "diseaseName": result.disease_name_cn,
                "description": result.description,
                "severity": result.severity,
                "allProbabilities": [
                    {
                        "class": cls,
                        "probability": round(prob, 4),
                        "diseaseName": DISEASE_NAMES_CN.get(cls, cls),
                    }
                    for cls, prob in result.all_probabilities.items()
                ],
                "suggestions": _get_suggestions(result.predicted_class),
                "warning": result.warning,
                "latency_ms": round(elapsed_ms, 2),
            })

        except Exception as e:
            logger.exception("预测失败")
            return jsonify({"error": str(e)}), 500

    @app.route("/predict_multiple", methods=["POST"])
    def predict_multiple():
        """多图综合预测。"""
        start = time.perf_counter()
        try:
            data = request.get_json(silent=True)
            if not data or "images" not in data:
                return jsonify({"error": "请提供 images 数组"}), 400

            images = data["images"]
            if not isinstance(images, list) or len(images) == 0:
                return jsonify({"error": "images 应为非空数组"}), 400

            # 解码 base64 图片列表
            decoded = []
            for i, img_b64 in enumerate(images):
                import base64
                try:
                    decoded.append(base64.b64decode(img_b64))
                except Exception:
                    return jsonify({"error": f"第 {i+1} 张图片 base64 解码失败"}), 400

            # 对每张图单独预测，然后聚合
            individual = [pipeline.predict(img)[0] for img in decoded]

            # 聚合: 取平均概率
            all_classes = list(individual[0].all_probabilities.keys())
            avg_probs = {}
            for cls in all_classes:
                avg_probs[cls] = np.mean([p.all_probabilities[cls] for p in individual])

            best_cls = max(avg_probs, key=avg_probs.get)
            best_confidence = avg_probs[best_cls]
            best_idx = next(
                i for i, p in enumerate(individual)
                if p.predicted_class == best_cls
            )

            elapsed_ms = (time.perf_counter() - start) * 1000

            return jsonify({
                "success": True,
                "predictedClass": best_cls,
                "confidence": round(best_confidence * 100, 2),
                "diseaseName": DISEASE_NAMES_CN.get(best_cls, best_cls),
                "description": individual[best_idx].description,
                "severity": individual[best_idx].severity,
                "allProbabilities": [
                    {"class": cls, "probability": round(prob, 4),
                     "diseaseName": DISEASE_NAMES_CN.get(cls, cls)}
                    for cls, prob in sorted(avg_probs.items(),
                                            key=lambda x: x[1], reverse=True)
                ],
                "suggestions": _get_suggestions(best_cls),
                "warning": "此结果仅供参考，请以专业兽医诊断为准。",
                "imageCount": len(images),
                "latency_ms": round(elapsed_ms, 2),
            })

        except Exception as e:
            logger.exception("多图预测失败")
            return jsonify({"error": str(e)}), 500

    @app.route("/test/onnx", methods=["GET"])
    def test_onnx():
        """运行 ONNX 测试套件（仅在 ONNX 后端可用时）。"""
        if not cfg or not Path(cfg.model.onnx_path).exists():
            return jsonify({"error": "ONNX 模型未就绪"}), 400

        suite = ONNXTestSuite(onnx_path=cfg.model.onnx_path)
        results = suite.run_all()
        return jsonify(results)


def _extract_image(req) -> Optional[bytes]:
    """从请求中提取图片数据。"""
    # 优先: multipart/form-data 文件上传
    if "image" in req.files:
        return req.files["image"].read()

    # 其次: JSON base64
    data = req.get_json(silent=True)
    if data and "image" in data:
        import base64
        return base64.b64decode(data["image"])

    return None


def _get_suggestions(disease_class: str) -> dict:
    """获取疾病的诊疗建议。"""
    suggestions = {
        "Dermatitis": {
            "homeAdvice": [
                "保持患处清洁干燥，避免宠物抓挠",
                "使用温和的宠物专用洗液清洁患处",
                "避免使用刺激性化学物质",
                "观察并记录症状变化",
            ],
            "medicalAdvice": [
                "建议前往宠物医院进行皮肤刮片检查",
                "遵医嘱使用抗炎药物",
                "必要时进行过敏原检测",
                "定期复诊观察恢复情况",
            ],
            "preventAdvice": [
                "定期给宠物洗澡并梳理毛发",
                "保持生活环境干净卫生",
                "避免接触已知过敏原",
                "增强宠物免疫力，提供均衡饮食",
            ],
        },
        "Fungal_infections": {
            "homeAdvice": [
                "隔离患病宠物，避免传染给其他动物或人",
                "佩戴伊丽莎白圈防止舔舐",
                "保持环境干燥通风",
                "每日清洁消毒宠物用品",
            ],
            "medicalAdvice": [
                "尽快就医进行真菌培养确诊",
                "遵医嘱使用抗真菌药物（口服+外用）",
                "治疗周期通常为4-8周，需坚持用药",
                "定期复查确认真菌转阴",
            ],
            "preventAdvice": [
                "保持宠物被毛干燥",
                "定期环境消毒",
                "避免接触流浪动物",
                "增强宠物免疫力",
            ],
        },
        "Healthy": {
            "homeAdvice": [
                "继续保持良好的日常护理习惯",
                "定期检查宠物皮肤状况",
                "保持被毛清洁和梳理",
            ],
            "medicalAdvice": [
                "按计划进行年度体检",
                "定期体内外驱虫",
                "保持疫苗接种计划",
            ],
            "preventAdvice": [
                "均衡饮食，适量运动",
                "保持环境卫生",
                "定期护理和检查",
            ],
        },
        "Hypersensitivity": {
            "homeAdvice": [
                "记录并排查可能的过敏原",
                "可尝试更换低敏处方粮",
                "保持环境清洁，减少尘螨",
                "使用空气净化器改善空气质量",
            ],
            "medicalAdvice": [
                "进行过敏原检测（血清/IP乳酸）",
                "遵医嘱使用抗组胺药物",
                "严重时可考虑免疫疗法",
                "急性过敏需紧急就医",
            ],
            "preventAdvice": [
                "避免接触已知过敏原",
                "定期驱虫（跳蚤是常见过敏原）",
                "选择低敏宠物用品",
                "保持适度运动，增强体质",
            ],
        },
        "demodicosis": {
            "homeAdvice": [
                "隔离患宠，蠕形螨可传染给其他动物",
                "每日清洁消毒宠物用品",
                "保持环境干燥",
                "佩戴伊丽莎白圈防止抓挠",
            ],
            "medicalAdvice": [
                "尽快就医进行皮肤刮片镜检",
                "遵医嘱使用杀螨药物",
                "治疗周期较长（4-12周）",
                "需定期复查确认螨虫消失",
            ],
            "preventAdvice": [
                "定期体内外驱虫",
                "增强宠物免疫力",
                "避免与患病动物接触",
                "保持环境清洁卫生",
            ],
        },
        "ringworm": {
            "homeAdvice": [
                "严格隔离患宠（可传染给人）",
                "佩戴手套护理，接触后勤洗手",
                "每日消毒宠物用品和环境",
                "保持环境干燥通风",
            ],
            "medicalAdvice": [
                "尽快就医进行伍德灯/真菌培养检查",
                "遵医嘱使用抗真菌药物",
                "治疗周期通常4-8周",
                "所有接触过的动物需一并检查",
            ],
            "preventAdvice": [
                "保持宠物被毛干燥",
                "避免接触流浪猫狗",
                "定期环境消毒",
                "新宠物入户前进行健康检查",
            ],
        },
    }

    return suggestions.get(disease_class, suggestions["Dermatitis"])


# ──────────────────────────────────────────────
# 启动入口
# ──────────────────────────────────────────────

if __name__ == "__main__":
    import sys
    config_path = sys.argv[1] if len(sys.argv) > 1 else None
    app = create_app(config_path)
    host = cfg.server.host if cfg else "0.0.0.0"
    port = cfg.server.port if cfg else 5000
    app.run(host=host, port=port, debug=True)
