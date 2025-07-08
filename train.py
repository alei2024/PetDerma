import os
import torch
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms
from PIL import Image
from transformers import ViTFeatureExtractor, ViTForImageClassification, AdamW


class SkinDataset(Dataset):
    def __init__(self, root_dir, feature_extractor, transform=None):
        self.root_dir = root_dir
        self.feature_extractor = feature_extractor
        self.transform = transform
        self.images = []
        self.labels = []
        self.classes = sorted(os.listdir(root_dir))
        self.class_to_idx = {cls_name: idx for idx, cls_name in enumerate(self.classes)}
        
        for cls_name in self.classes:
            cls_folder = os.path.join(root_dir, cls_name)
            if not os.path.isdir(cls_folder):
                continue
            for fname in os.listdir(cls_folder):
                if fname.lower().endswith((".jpg", ".jpeg", ".png")):
                    self.images.append(os.path.join(cls_folder, fname))
                    self.labels.append(self.class_to_idx[cls_name])

    def __len__(self):
        return len(self.images)

    def __getitem__(self, idx):
        img_path = self.images[idx]
        label = self.labels[idx]
        image = Image.open(img_path).convert("RGB")
        
        # extract features / pixel values
        inputs = self.feature_extractor(images=image, return_tensors="pt")
        pixel_values = inputs['pixel_values'].squeeze()  # [C, H, W]
        
        return pixel_values, torch.tensor(label)


def train():
    # Paths
    train_dir = "./数据集/train/Dogs"
    valid_dir = "./数据集/valid/Dogs"
    
    # Feature extractor and model
    model_name = "google/vit-base-patch16-224-in21k"
    feature_extractor = ViTFeatureExtractor.from_pretrained(model_name)
    model = ViTForImageClassification.from_pretrained(
        model_name,
        num_labels=len(os.listdir(train_dir)),
        ignore_mismatched_sizes=True
    )
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model.to(device)

    # Datasets and loaders
    train_ds = SkinDataset(train_dir, feature_extractor)
    valid_ds = SkinDataset(valid_dir, feature_extractor)
    train_loader = DataLoader(train_ds, batch_size=8, shuffle=True)
    valid_loader = DataLoader(valid_ds, batch_size=8)

    # Optimizer
    optimizer = AdamW(model.parameters(), lr=5e-5)
    criterion = torch.nn.CrossEntropyLoss()

    num_epochs = 5
    model.train()
    for epoch in range(num_epochs):
        total_loss = 0.0
        for pixel_values, labels in train_loader:
            pixel_values = pixel_values.to(device)
            labels = labels.to(device)

            outputs = model(pixel_values=pixel_values, labels=labels)
            loss = outputs.loss
            total_loss += loss.item()

            optimizer.zero_grad()
            loss.backward()
            optimizer.step()

        avg_loss = total_loss / len(train_loader)
        print(f"Epoch {epoch+1}/{num_epochs} - Loss: {avg_loss:.4f}")

        # Validation
        model.eval()
        correct = 0
        total = 0
        with torch.no_grad():
            for pixel_values, labels in valid_loader:
                pixel_values = pixel_values.to(device)
                labels = labels.to(device)
                outputs = model(pixel_values=pixel_values)
                preds = outputs.logits.argmax(dim=-1)
                correct += (preds == labels).sum().item()
                total += labels.size(0)
        acc = correct / total
        print(f"Validation Accuracy: {acc:.4f}\n")
        model.train()

    # Save model
    model.save_pretrained("./vit_dog_skin_model")
    feature_extractor.save_pretrained("./vit_dog_skin_model")


if __name__ == "__main__":
    train()
