import os
import json
import torch
from torch.utils.data import Dataset, DataLoader
from PIL import Image
from transformers import ViTImageProcessor, ViTForImageClassification, AdamW


def preprocess_and_save(root_dir, json_path, processor):
    """
    遍历 root_dir 下的分类子文件夹，提取每张图像的 processor 输出，并存为 JSON 文件。
    JSON 格式：{"classes": [...], "data": [{"pixel_values": [...], "label": int}, ...]}
    """
    data_list = []
    classes = sorted([d for d in os.listdir(root_dir) if os.path.isdir(os.path.join(root_dir, d))])
    class_to_idx = {cls: idx for idx, cls in enumerate(classes)}

    for cls in classes:
        cls_path = os.path.join(root_dir, cls)
        for fname in os.listdir(cls_path):
            if not fname.lower().endswith((".jpg", ".jpeg", ".png")):
                continue
            img_path = os.path.join(cls_path, fname)
            try:
                img = Image.open(img_path).convert("RGB")
            except Exception as e:
                print(f"Warning: could not open {img_path}: {e}")
                continue
            inputs = processor(images=img, return_tensors="pt")
            pixel_values = inputs['pixel_values'].squeeze().tolist()
            data_list.append({"pixel_values": pixel_values, "label": class_to_idx[cls]})

    with open(json_path, 'w') as f:
        json.dump({"classes": classes, "data": data_list}, f)
    print(f"Preprocessed {len(data_list)} images into {json_path}")


class JSONDataset(Dataset):
    def __init__(self, json_path):
        with open(json_path, 'r') as f:
            obj = json.load(f)
        self.classes = obj['classes']
        self.data = obj['data']

    def __len__(self):
        return len(self.data)

    def __getitem__(self, idx):
        entry = self.data[idx]
        pixel_values = torch.tensor(entry['pixel_values'])  # [C, H, W]
        label = torch.tensor(entry['label'])
        return pixel_values, label


def train():
    # 使用根目录下的 train 和 valid 文件夹，直接按疾病类别组织
    train_dir = os.path.join(".", "data", "train","demodicosis")
    valid_dir = os.path.join(".", "data", "valid","demodicosis")
    train_json = "train_data.json"
    valid_json = "valid_data.json"

    # 初始化 ImageProcessor（替代 ViTFeatureExtractor）
    model_name = "google/vit-base-patch16-224-in21k"
    processor = ViTImageProcessor.from_pretrained(model_name)

    # 预处理
    if not os.path.exists(train_json):
        preprocess_and_save(train_dir, train_json, processor)
    if not os.path.exists(valid_json):
        preprocess_and_save(valid_dir, valid_json, processor)

    # 加载模型
    num_labels = len(JSONDataset(train_json).classes)
    model = ViTForImageClassification.from_pretrained(
        model_name,
        num_labels=num_labels,
        ignore_mismatched_sizes=True
    )
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model.to(device)

    # 数据加载
    train_loader = DataLoader(JSONDataset(train_json), batch_size=8, shuffle=True)
    valid_loader = DataLoader(JSONDataset(valid_json), batch_size=8)

    # 训练
    optimizer = AdamW(model.parameters(), lr=5e-5)
    for epoch in range(5):
        model.train()
        total_loss = 0
        for pixel_values, labels in train_loader:
            pixel_values, labels = pixel_values.to(device), labels.to(device)
            outputs = model(pixel_values=pixel_values, labels=labels)
            loss = outputs.loss
            loss.backward()
            optimizer.step()
            optimizer.zero_grad()
            total_loss += loss.item()
        print(f"Epoch {epoch+1} train loss: {total_loss/len(train_loader):.4f}")

        # 验证
        model.eval()
        correct = total = 0
        with torch.no_grad():
            for pixel_values, labels in valid_loader:
                pixel_values, labels = pixel_values.to(device), labels.to(device)
                logits = model(pixel_values=pixel_values).logits
                preds = logits.argmax(dim=-1)
                correct += (preds == labels).sum().item()
                total += labels.size(0)
        print(f"Epoch {epoch+1} valid acc: {correct/total:.4f}\n")

    # 保存
    model.save_pretrained("./vit_dog_skin_model")
    processor.save_pretrained("./vit_dog_skin_model")


if __name__ == "__main__":
    train()


