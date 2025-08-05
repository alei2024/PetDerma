import os
import argparse
import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import datasets, transforms, models
from torch.utils.data import DataLoader
import optuna
from optuna.trial import TrialState


def get_data_loaders(data_dir, batch_size, num_workers=4):
    data_transforms = {
        'train': transforms.Compose([
            transforms.RandomResizedCrop(224),
            transforms.RandomHorizontalFlip(),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406],
                                 [0.229, 0.224, 0.225])
        ]),
        'valid': transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406],
                                 [0.229, 0.224, 0.225])
        ]),
        'test': transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406],
                                 [0.229, 0.224, 0.225])
        ]),
    }

    image_datasets = {
        x: datasets.ImageFolder(
            os.path.join(data_dir, x),
            transform=data_transforms[x]
        )
        for x in ['train', 'valid', 'test']
    }
    dataloaders = {
        x: DataLoader(
            image_datasets[x],
            batch_size=batch_size,
            shuffle=(x == 'train'),
            num_workers=num_workers
        )
        for x in ['train', 'valid', 'test']
    }
    return dataloaders, image_datasets['train'].classes


def build_model(num_classes, freeze_backbone=True, dropout_rate=0.0):
    model = models.efficientnet_b0(pretrained=True)
    if freeze_backbone:
        for param in model.features.parameters():
            param.requires_grad = False
    in_feat = model.classifier[1].in_features
    model.classifier = nn.Sequential(
        nn.Dropout(dropout_rate),
        nn.Linear(in_feat, num_classes)
    )
    return model


def objective(trial, args):
    # 超参搜索空间
    lr = trial.suggest_loguniform('lr', 1e-5, 1e-2)
    batch_size = trial.suggest_categorical('batch_size', [16, 32, 64])
    weight_decay = trial.suggest_loguniform('wd', 1e-6, 1e-2)
    dropout = trial.suggest_uniform('dropout', 0.0, 0.5)
    freeze = trial.suggest_categorical('freeze_backbone', [True, False])

    # 数据
    loaders, classes = get_data_loaders(args.data_dir, batch_size, args.num_workers)
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    num_classes = len(classes)

    # 模型、损失、优化器、调度器
    model = build_model(num_classes, freeze_backbone=freeze, dropout_rate=dropout).to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(
        model.parameters(), lr=lr, weight_decay=weight_decay
    )
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(
        optimizer, mode='max', patience=2, factor=0.5, verbose=True
    )

    best_val_acc = 0.0
    early_stop_count = 0

    for epoch in range(1, args.epochs + 1):
        # 训练
        model.train()
        for x, y in loaders['train']:
            x, y = x.to(device), y.to(device)
            optimizer.zero_grad()
            loss = criterion(model(x), y)
            loss.backward()
            optimizer.step()

        # 验证
        model.eval()
        correct = 0
        total = 0
        with torch.no_grad():
            for x, y in loaders['valid']:
                x, y = x.to(device), y.to(device)
                preds = model(x).argmax(dim=1)
                correct += (preds == y).sum().item()
                total += y.size(0)
        val_acc = correct / total

        # 调度 & 早停
        scheduler.step(val_acc)
        trial.report(val_acc, epoch)
        if trial.should_prune():
            raise optuna.exceptions.TrialPruned()

        if val_acc > best_val_acc:
            best_val_acc = val_acc
            early_stop_count = 0
        else:
            early_stop_count += 1
        if early_stop_count >= args.early_stop:
            break

    return best_val_acc


def train_best_model(best_params, args):
    # 与 objective 中基本一致，但用最优超参并保存模型
    loaders, classes = get_data_loaders(
        args.data_dir,
        best_params['batch_size'],
        args.num_workers
    )
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model = build_model(
        len(classes),
        freeze_backbone=best_params['freeze_backbone'],
        dropout_rate=best_params['dropout']
    ).to(device)

    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(
        model.parameters(),
        lr=best_params['lr'],
        weight_decay=best_params['wd']
    )
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(
        optimizer, mode='max', patience=2, factor=0.5
    )

    # 完整训练
    for epoch in range(1, args.epochs + 1):
        model.train()
        for x, y in loaders['train']:
            x, y = x.to(device), y.to(device)
            optimizer.zero_grad()
            criterion(model(x), y).backward()
            optimizer.step()
        # 验证
        model.eval()
        correct, total = 0, 0
        with torch.no_grad():
            for x, y in loaders['valid']:
                x, y = x.to(device), y.to(device)
                correct += (model(x).argmax(1) == y).sum().item()
                total += y.size(0)
        val_acc = correct / total
        scheduler.step(val_acc)

    # 测试并保存
    model.load_state_dict(model.state_dict())
    model.eval()
    correct, total = 0, 0
    with torch.no_grad():
        for x, y in loaders['test']:
            x, y = x.to(device), y.to(device)
            correct += (model(x).argmax(1) == y).sum().item()
            total += y.size(0)
    print(f"Test Acc: {correct/total:.4f}")
    torch.save(model.state_dict(), args.save_path)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--data_dir', type=str, default='data')
    parser.add_argument('--num_workers', type=int, default=4)
    parser.add_argument('--epochs', type=int, default=10)
    parser.add_argument('--save_path', type=str, default='best_model.pth')
    parser.add_argument('--n_trials', type=int, default=20,
                        help='number of Optuna trials')
    parser.add_argument('--early_stop', type=int, default=3,
                        help='epochs to wait for improvement')
    args = parser.parse_args()

    study = optuna.create_study(
        direction='maximize',
        sampler=optuna.samplers.TPESampler(seed=42),
        pruner=optuna.pruners.MedianPruner()
    )
    study.optimize(lambda t: objective(t, args), n_trials=args.n_trials)

    print("Study best trial:")
    trial = study.best_trial
    print(f"  Value: {trial.value:.4f}")
    for key, val in trial.params.items():
        print(f"    {key}: {val}")

    # 使用最优超参做最终训练与测试
    train_best_model(trial.params, args)
# python train.py --data_dir ./data --n_trials 30 --epochs 15 --early_stop 4
