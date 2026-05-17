# ScratchV — 从零构建的专业宠物皮肤病视觉诊断引擎

## 概述

ScratchV 是一个**模块化、可扩展、教育优先**的计算机视觉推理框架，专为 PetDerma 的宠物皮肤病 AI 诊断场景设计。它将模型推理工程化过程中涉及的**配置管理、图像预处理、多后端推理（PyTorch / ONNX）、性能基准、量化优化、API 服务**等环节，组织为结构清晰的子模块，每一行代码都带有明确的教育目的。

## 项目结构

```
ScratchV/
├── __init__.py              # 包入口，暴露核心类
├── core/                    # 核心模块（模型无关）
│   ├── config.py            #   类型安全的配置管理
│   ├── transforms.py        #   图像预处理流水线 + TTA
│   ├── model_adapter.py     #   模型抽象层（PyTorch / ONNX 统一接口）
│   └── pipeline.py          #   端到端推理流水线
├── onnx/                    # ONNX 子模块
│   ├── export.py            #   PyTorch → ONNX 导出
│   ├── session.py           #   ONNX Runtime 推理会话
│   └── test_onnx.py         #   ONNX 验证套件（精度/延迟/吞吐量）
├── optimize/                # 优化子模块
│   ├── benchmark.py         #   多后端/多配置性能基准
│   ├── quantize.py          #   FP16 / INT8 模型量化
│   └── profiler.py          #   流水线阶段 & 算子级 Profiling
├── server/                  # API 服务
│   └── api.py               #   Flask 生产级推理端点
├── examples/                # 使用示例
│   ├── inference_example.py
│   └── train_example.py
└── requirements.txt         # 依赖清单
```

## 快速开始

```bash
# 安装依赖
pip install -r ScratchV/requirements.txt

# 方式一：Python API（推荐）
python
>>> from ScratchV import ScratchPipeline
>>> pipe = ScratchPipeline()
>>> result = pipe.predict("photo.jpg")[0]
>>> print(result.disease_name_cn, result.confidence)

# 方式二：运行示例
python ScratchV/examples/inference_example.py

# 方式三：启动 API 服务
python -m ScratchV.server.api
```

## 核心设计

### 1. 配置管理 (`core/config.py`)

所有魔数集中管理，使用 `dataclass` 获得类型安全：

```python
cfg = ScratchConfig()
cfg.model.checkpoint_path = "model.pth"
cfg.model.onnx_path = "model.onnx"
cfg.transform.input_size = (224, 224)
```

### 2. 图像预处理 (`core/transforms.py`)

- OpenCV 优先解码（比 PIL 快 2-3x）
- 大图自动缩小，防止 OOM
- 内置 TTA（Test-Time Augmentation）：水平翻转、±10° 旋转

### 3. 模型抽象层 (`core/model_adapter.py`)

策略模式，统一 PyTorch 和 ONNX 后端：

```python
model = create_model(cfg, backend="onnx")
probs = model.predict(tensor)  # 接口一致
```

### 4. 推理流水线 (`core/pipeline.py`)

```python
pipe = ScratchPipeline(cfg, backend="auto")
results = pipe.predict(images)              # 普通推理
results = pipe.predict(images, tta=True)    # TTA 推理
results = pipe.predict_batch(paths, bs=8)   # 批量推理
```

## ONNX 测试

ScratchV 提供了完整的 ONNX 测试套件：

```bash
# 1. 导出 ONNX
python -m ScratchV.onnx.export --checkpoint model.pth --output model.onnx

# 2. 运行测试套件（精度/延迟/吞吐量）
python -m ScratchV.onnx.test_onnx --onnx model.onnx --pth model.pth
```

测试指标：
- **Top-1 一致性**: ONNX 与 PyTorch 输出类别必须 100% 一致
- **Cosine Similarity**: > 0.999
- **Max Abs Error**: < 0.001
- **P50/P95/P99 延迟**: 毫秒级统计
- **吞吐量**: 每秒处理图片数

## Cycle 优化

### 流水线阶段分析

```bash
python -m ScratchV.optimize.profiler --pth model.pth
```

输出每个阶段的耗时分解：
```
  Stage                      Mean(us)     占比
  decode                     2.3 ms       12%
  preprocess                 5.1 ms       26%
  inference                  14.2 ms      54%  ← 瓶颈
  postprocess                0.5 ms       2%
```

### 性能基准

```bash
python -m ScratchV.optimize.benchmark --pth model.pth --onnx model.onnx
```

对比 PyTorch vs ONNX、不同 batch size、TTA 开关的性能差异。

### 量化

```bash
# FP16 量化（推荐，几乎无损）
python -m ScratchV.optimize.quantize --input model.onnx --fp16

# INT8 量化（最大性能）
python -m ScratchV.optimize.quantize --input model.onnx --int8
```

## 学习路径

如果你是深度学习工程化的初学者，推荐按以下顺序阅读源码：

1. **`core/config.py`** — 学习如何用 dataclass 管理配置
2. **`core/transforms.py`** — 学习图像预处理流水线设计
3. **`core/model_adapter.py`** — 学习策略模式和多后端抽象
4. **`core/pipeline.py`** — 学习端到端流水线编排
5. **`onnx/export.py`** — 学习 ONNX 导出机制
6. **`onnx/session.py`** — 学习 ONNX Runtime 使用
7. **`optimize/profiler.py`** — 学习性能分析和 Profiling
8. **`server/api.py`** — 学习生产级 API 设计

## 设计原则

- **关注点分离**: 每个模块只做一件事
- **类型安全**: 全程使用 dataclass / type hints
- **教育优先**: 关键设计决策有注释说明原因
- **可测试**: 每个模块都可独立测试
- **性能感知**: 从设计之初就考虑延迟和吞吐量
