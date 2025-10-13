# 开发环境配置说明

## 域名校验问题解决方案

### 问题描述
微信小程序在开发环境中访问本地服务器时会出现域名校验错误：
```
request 合法域名校验出错
http://127.0.0.1:5000 不在以下 request 合法域名列表中
uploadFile:fail createUploadTask:fail url not in domain list
```

### 解决方案

#### 方案1：使用 wx.request 替代 wx.uploadFile（已实现）

**问题原因：**
- `wx.uploadFile` 和 `wx.request` 的域名校验是分开的
- 即使关闭域名校验，`wx.uploadFile` 仍然受到限制

**解决方案：**
- 使用 `wx.getFileSystemManager().readFile()` 读取文件为base64
- 使用 `wx.request` 发送base64数据到服务器
- 服务器端同时支持文件上传和base64数据两种格式

**代码实现：**
```javascript
// 小程序端：读取文件为base64
wx.getFileSystemManager().readFile({
  filePath: filePath,
  encoding: 'base64',
  success: (fileRes) => {
    // 使用 wx.request 发送数据
    wx.request({
      url: API_URL,
      method: 'POST',
      data: { image: fileRes.data }
    });
  }
});
```

#### 方案2：关闭域名校验（辅助）

1. **在微信开发者工具中：**
   - 点击右上角的"详情"按钮
   - 切换到"本地设置"选项卡
   - 勾选"不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书"
   - 点击"确定"保存设置
   - 重新编译项目

#### 方案2：使用模拟数据（临时方案）

如果无法访问本地服务器，可以临时使用模拟数据进行测试：

1. **修改 modelService_real.js：**
   ```javascript
   // 将 isDev 改为 false，启用模拟数据
   const isDev = false;
   ```

2. **添加模拟数据函数：**
   ```javascript
   // 在文件末尾添加模拟数据函数
   function getMockPredictionResult() {
     return {
       success: true,
       predictedClass: 'Dermatitis',
       confidence: 85.5,
       diseaseName: '皮炎',
       description: '这是模拟的诊断结果，用于开发测试。',
       severity: 3,
       suggestions: {
         homeAdvice: ['保持患处清洁干燥', '观察症状变化'],
         medicalAdvice: ['建议前往宠物医院确诊'],
         preventAdvice: ['定期给宠物洗澡']
       },
       allProbabilities: [
         { class: 'Dermatitis', probability: 0.855 },
         { class: 'Healthy', probability: 0.100 },
         { class: 'Fungal_infections', probability: 0.045 }
       ],
       warning: '此结果仅供参考，请以专业兽医诊断为准。'
     };
   }
   ```

#### 方案3：配置合法域名（生产环境）

1. **在微信公众平台：**
   - 登录微信公众平台
   - 进入"开发" -> "开发管理" -> "开发设置"
   - 在"服务器域名"中添加你的服务器域名
   - 注意：必须是HTTPS域名

2. **修改API配置：**
   ```javascript
   const API_CONFIG = {
     BASE_URL: 'https://your-domain.com', // 替换为你的HTTPS域名
     // ... 其他配置
   };
   ```

## 开发环境调试

### 启用详细日志
代码中已添加开发环境的详细日志输出：

```javascript
// 在 modelService_real.js 中
const isDev = true; // 开发环境标识

// 会输出以下日志：
// - 上传文件时的URL
// - 服务器响应详情
// - 错误信息详情
```

### 常见问题排查

1. **Flask服务器未启动**
   ```bash
   # 确保服务器正在运行
   python server_example.py
   ```

2. **端口被占用**
   ```bash
   # 检查5000端口是否被占用
   netstat -ano | findstr :5000
   ```

3. **防火墙阻止**
   - 检查Windows防火墙设置
   - 确保允许Python应用通过防火墙

4. **网络连接问题**
   - 尝试在浏览器中访问 `http://127.0.0.1:5000/health`
   - 检查是否能正常返回JSON数据

### 测试步骤

1. **启动Flask服务器**
   ```bash
   cd pages/diagnosis/model
   python server_example.py
   ```

2. **配置微信开发者工具**
   
   - 关闭域名校验
   - 重新编译项目
   
3. **测试诊断功能**
   - 上传宠物图片
   - 查看控制台日志
   - 验证诊断结果

### 生产环境部署

当准备部署到生产环境时：

1. **部署Flask应用到云服务器**
2. **配置HTTPS域名**
3. **在微信公众平台添加合法域名**
4. **修改API配置为生产环境地址**
5. **将 isDev 设置为 false**

## 注意事项

- 开发环境配置仅用于本地测试
- 生产环境必须使用HTTPS域名
- 定期检查服务器状态和日志
- 保持代码中的错误处理机制
