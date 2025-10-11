"""
服务器端模型预测API示例
使用Flask + PyTorch部署MobileNetV2模型
"""

from flask import Flask, request, jsonify
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
import io

app = Flask(__name__)

# 模型配置
DEVICE = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
NUM_CLASSES = 6
CLASS_NAMES = ['Dermatitis', 'Fungal_infections', 'Healthy', 'Hypersensitivity', 'demodicosis', 'ringworm']
CHINESE_NAMES = {
    'Dermatitis': '皮炎',
    'Fungal_infections': '真菌感染',
    'Healthy': '健康',
    'Hypersensitivity': '过敏反应',
    'demodicosis': '蠕形螨病',
    'ringworm': '癣病'
}

# 加载模型
def load_model():
    model = models.mobilenet_v2(weights=None)
    model.classifier[1] = nn.Linear(model.last_channel, NUM_CLASSES)
    model.load_state_dict(torch.load('dog_skin_disease_MobileNetV2.pth', map_location=DEVICE))
    model.to(DEVICE)
    model.eval()
    return model

# 图片预处理
def preprocess_image(image_bytes):
    transform = transforms.Compose([
        transforms.Resize(256),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    image = transform(image).unsqueeze(0)
    return image

# 预测函数
def predict_disease(model, image_tensor):
    with torch.no_grad():
        outputs = model(image_tensor)
        probabilities = torch.nn.functional.softmax(outputs, dim=1)
        confidence, predicted = torch.max(probabilities, 1)

        all_probs = probabilities[0].cpu().numpy()
        class_probs = []
        for i, class_name in enumerate(CLASS_NAMES):
            class_probs.append({
                'class': class_name,
                'probability': float(all_probs[i])
            })
        class_probs.sort(key=lambda x: x['probability'], reverse=True)

        return {
            'predicted_class': CLASS_NAMES[predicted.item()],
            'confidence': float(confidence.item()),
            'all_probabilities': class_probs
        }

# === 全局加载模型（方法1） ===
model = load_model()
print("模型加载完成")

@app.route('/predict', methods=['POST'])
def predict():
    try:
        # 支持两种格式：文件上传和base64数据
        if request.is_json:
            # 处理base64数据（来自小程序）
            data = request.get_json()
            if 'image' not in data:
                return jsonify({'error': '没有上传图片数据'}), 400
            
            import base64
            try:
                # 解码base64数据
                image_data = base64.b64decode(data['image'])
                image_tensor = preprocess_image(image_data)
            except Exception as e:
                return jsonify({'error': f'图片数据格式错误: {str(e)}'}), 400
        else:
            # 处理文件上传（来自网页或其他客户端）
            if 'image' not in request.files:
                return jsonify({'error': '没有上传图片'}), 400

            file = request.files['image']
            image_bytes = file.read()
            image_tensor = preprocess_image(image_bytes)
        
        image_tensor = image_tensor.to(DEVICE)
        result = predict_disease(model, image_tensor)
        predicted_class = result['predicted_class']
        confidence = result['confidence']

        # 为所有概率添加中文名称
        all_probabilities_with_cn = []
        for prob in result['all_probabilities']:
            all_probabilities_with_cn.append({
                'class': prob['class'],
                'probability': prob['probability'],
                'diseaseName': CHINESE_NAMES.get(prob['class'], prob['class'])
            })
        
        response = {
            'success': True,
            'predictedClass': predicted_class,
            'confidence': round(confidence * 100, 2),
            'diseaseName': CHINESE_NAMES[predicted_class],
            'allProbabilities': all_probabilities_with_cn,
            'description': get_disease_description(predicted_class),
            'severity': get_severity_level(predicted_class, confidence),
            'suggestions': get_disease_suggestions(predicted_class),
            'warning': '此结果仅供参考，请以专业兽医诊断为准。'
        }
        return jsonify(response)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/predict_multiple', methods=['POST'])
def predict_multiple():
    try:
        # 支持两种格式：文件上传和base64数据
        if request.is_json:
            # 处理base64数据（来自小程序）
            data = request.get_json()
            if 'images' not in data:
                return jsonify({'error': '没有上传图片数据'}), 400
            
            import base64
            results = []
            for image_data in data['images']:
                try:
                    # 解码base64数据
                    image_bytes = base64.b64decode(image_data)
                    image_tensor = preprocess_image(image_bytes)
                    image_tensor = image_tensor.to(DEVICE)
                    result = predict_disease(model, image_tensor)
                    results.append(result)
                except Exception as e:
                    return jsonify({'error': f'图片数据格式错误: {str(e)}'}), 400
        else:
            # 处理文件上传（来自网页或其他客户端）
            files = request.files.getlist('images')
            if not files:
                return jsonify({'error': '没有上传图片'}), 400

            results = []
            for file in files:
                image_bytes = file.read()
                image_tensor = preprocess_image(image_bytes)
                image_tensor = image_tensor.to(DEVICE)
                result = predict_disease(model, image_tensor)
                results.append(result)

        combined_result = combine_predictions(results)

        # 为所有概率添加中文名称
        all_probabilities_with_cn = []
        for prob in combined_result['all_probabilities']:
            all_probabilities_with_cn.append({
                'class': prob['class'],
                'probability': prob['probability'],
                'diseaseName': CHINESE_NAMES.get(prob['class'], prob['class'])
            })

        response = {
            'success': True,
            'predictedClass': combined_result['predicted_class'],
            'confidence': round(combined_result['confidence'] * 100, 2),
            'diseaseName': CHINESE_NAMES[combined_result['predicted_class']],
            'allProbabilities': all_probabilities_with_cn,
            'description': get_disease_description(combined_result['predicted_class']),
            'severity': get_severity_level(combined_result['predicted_class'], combined_result['confidence']),
            'suggestions': get_disease_suggestions(combined_result['predicted_class']),
            'warning': '此结果仅供参考，请以专业兽医诊断为准。',
            'imageCount': len(results),
            'individualPredictions': results
        }
        return jsonify(response)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def combine_predictions(predictions):
    if len(predictions) == 1:
        return predictions[0]

    class_probs = {}
    for prediction in predictions:
        for prob in prediction['all_probabilities']:
            class_name = prob['class']
            if class_name not in class_probs:
                class_probs[class_name] = []
            class_probs[class_name].append(prob['probability'])

    avg_probs = []
    for class_name, probs in class_probs.items():
        avg_prob = sum(probs) / len(probs)
        avg_probs.append({
            'class': class_name,
            'probability': avg_prob
        })
    avg_probs.sort(key=lambda x: x['probability'], reverse=True)

    return {
        'predicted_class': avg_probs[0]['class'],
        'confidence': avg_probs[0]['probability'],
        'all_probabilities': avg_probs
    }

def get_disease_description(disease_class):
    descriptions = {
        'Dermatitis': '皮炎是皮肤炎症的总称，可能由感染、刺激等多种原因引起。主要表现为皮肤发红、肿胀、瘙痒等症状。',
        'Fungal_infections': '真菌感染是由各种真菌引起的皮肤病，常见症状包括皮肤脱毛、发红、皮屑增多、瘙痒等。',
        'Healthy': '皮肤状态正常，未发现明显的皮肤病症状。',
        'Hypersensitivity': '过敏反应是机体对某些物质过度敏感导致的免疫反应，表现为皮肤发红、瘙痒、肿胀等症状。',
        'demodicosis': '蠕形螨病是由蠕形螨引起的皮肤病，主要表现为皮肤瘙痒、脱毛、结痂、皮肤增厚等症状。',
        'ringworm': '癣病是由真菌引起的传染性皮肤病，常见症状包括圆形脱毛斑、皮肤发红、皮屑增多等。'
    }
    return descriptions.get(disease_class, '未知疾病')

def get_severity_level(disease_class, confidence):
    if disease_class == 'Healthy':
        return 1
    base_severity = {
        'Dermatitis': 3,
        'Fungal_infections': 4,
        'Hypersensitivity': 2,
        'demodicosis': 4,
        'ringworm': 3
    }
    severity = base_severity.get(disease_class, 3)
    if confidence < 0.7:
        severity = max(1, severity - 1)
    elif confidence > 0.9:
        severity = min(5, severity + 1)
    return severity

def get_disease_suggestions(disease_class):
    suggestions = {
        'Dermatitis': {
            'homeAdvice': [
                '保持患处清洁干燥，避免抓挠',
                '使用温和的宠物专用洗液清洁',
                '避免使用刺激性化学物质',
                '观察症状变化，记录病情发展'
            ],
            'medicalAdvice': [
                '建议尽快前往宠物医院进行确诊',
                '可能需要进行皮肤刮片检查',
                '遵医嘱使用抗炎药物',
                '定期复诊观察恢复情况'
            ],
            'preventAdvice': [
                '定期给宠物洗澡并梳理毛发',
                '保持生活环境干净卫生',
                '避免接触可能的过敏原',
                '增强宠物免疫力，提供均衡饮食'
            ]
        }
    }
    return suggestions.get(disease_class, suggestions['Dermatitis'])

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'model_loaded': model is not None})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
