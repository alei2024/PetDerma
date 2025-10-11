/** 
 * 真实模型预测服务 
 * 调用服务器端API进行皮肤病分类
 */

// API配置
const API_CONFIG = {
  // 开发环境使用本地地址，生产环境需要配置合法域名
  BASE_URL: 'http://127.0.0.1:5000',
  // 备用地址（如果主地址不可用）
  BACKUP_URL: 'http://localhost:5000',
  ENDPOINTS: {
    SINGLE_PREDICT: '/predict',
    MULTIPLE_PREDICT: '/predict_multiple', // 如果你没实现，可以先不用
    HEALTH_CHECK: '/health'
  }
};

// 检查是否为开发环境
const isDev = true; // 开发环境标识

// 疾病类别映射（与服务器端保持一致）
const DISEASE_CLASSES = [
  'Dermatitis',           // 皮炎
  'Fungal_infections',    // 真菌感染
  'Healthy',              // 健康
  'Hypersensitivity',     // 过敏反应
  'demodicosis',          // 蠕形螨病
  'ringworm'              // 癣病
];

// 中文疾病名称映射
const DISEASE_NAMES_CN = {
  'Dermatitis': '皮炎',
  'Fungal_infections': '真菌感染',
  'Healthy': '健康',
  'Hypersensitivity': '过敏反应',
  'demodicosis': '蠕形螨病',
  'ringworm': '癣病'
};

/**
 * 上传文件到服务器
 * @param {string} filePath - 本地文件路径
 * @returns {Promise<Object>} 预测结果
 */
function uploadFile(filePath) {
  return new Promise((resolve, reject) => {
    // 开发环境特殊处理
    if (isDev) {
      console.log('开发环境：尝试上传文件到', API_CONFIG.BASE_URL);
    }
    
    // 先读取文件为base64
    wx.getFileSystemManager().readFile({
      filePath: filePath,
      encoding: 'base64',
      success: (fileRes) => {
        // 使用 wx.request 发送base64数据
        wx.request({
          url: API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.SINGLE_PREDICT,
          method: 'POST',
          header: {
            'Content-Type': 'application/json'
          },
          data: {
            image: fileRes.data,
            filename: 'image.jpg'
          },
          success: (res) => {
            console.log('上传响应:', res);
            try {
              if (res.statusCode === 200) {
                const data = res.data;
                if (data.success) {
                  resolve(data);
                } else {
                  reject(new Error(data.error || '预测失败'));
                }
              } else {
                reject(new Error(`服务器错误: ${res.statusCode}`));
              }
            } catch (e) {
              console.error('解析响应失败:', e, '原始数据:', res.data);
              reject(new Error('服务器响应格式错误'));
            }
          },
          fail: (error) => {
            console.error('上传失败:', error);
            // 开发环境提供更详细的错误信息
            if (isDev) {
              console.error('详细错误信息:', JSON.stringify(error, null, 2));
            }
            reject(new Error('网络请求失败: ' + (error.errMsg || '未知错误')));
          }
        });
      },
      fail: (error) => {
        console.error('读取文件失败:', error);
        reject(new Error('读取文件失败: ' + (error.errMsg || '未知错误')));
      }
    });
  });
}

/**
 * 上传多张图片到服务器
 * @param {Array<string>} filePaths - 本地文件路径数组
 * @returns {Promise<Object>} 综合预测结果
 */
function uploadMultipleFiles(filePaths) {
  return new Promise((resolve, reject) => {
    // 读取所有图片为base64
    const readPromises = filePaths.map(filePath => {
      return new Promise((resolve, reject) => {
        wx.getFileSystemManager().readFile({
          filePath: filePath,
          encoding: 'base64',
          success: resolve,
          fail: reject
        });
      });
    });
    
    Promise.all(readPromises)
      .then(fileResults => {
        const base64Images = fileResults.map(res => res.data);
        
        // 使用 wx.request 发送多张图片
        wx.request({
          url: API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.MULTIPLE_PREDICT,
          method: 'POST',
          header: {
            'Content-Type': 'application/json'
          },
          data: {
            images: base64Images
          },
          success: (res) => {
            console.log('多图片预测响应:', res);
            try {
              if (res.statusCode === 200) {
                const data = res.data;
                if (data.success) {
                  resolve(data);
                } else {
                  reject(new Error(data.error || '预测失败'));
                }
              } else {
                reject(new Error(`服务器错误: ${res.statusCode}`));
              }
            } catch (e) {
              console.error('解析响应失败:', e, '原始数据:', res.data);
              reject(new Error('服务器响应格式错误'));
            }
          },
          fail: (error) => {
            console.error('多图片预测失败:', error);
            reject(new Error('网络请求失败: ' + (error.errMsg || '未知错误')));
          }
        });
      })
      .catch(error => {
        console.error('读取文件失败:', error);
        reject(new Error('读取文件失败: ' + (error.errMsg || '未知错误')));
      });
  });
}

/**
 * 综合多张图片的预测结果
 * @param {Array<Object>} results - 预测结果数组
 * @returns {Object} 综合预测结果
 */
function combineMultipleResults(results) {
  if (results.length === 0) {
    throw new Error('没有预测结果');
  }
  
  if (results.length === 1) {
    return results[0];
  }
  
  // 统计各类别的平均概率
  const classProbabilities = {};
  const classCounts = {};
  
  results.forEach(result => {
    result.allProbabilities.forEach(prob => {
      if (!classProbabilities[prob.class]) {
        classProbabilities[prob.class] = 0;
        classCounts[prob.class] = 0;
      }
      classProbabilities[prob.class] += prob.probability;
      classCounts[prob.class]++;
    });
  });
  
  // 计算平均概率
  const avgProbabilities = Object.keys(classProbabilities).map(className => ({
    class: className,
    probability: classProbabilities[className] / classCounts[className]
  }));
  
  // 按概率排序
  avgProbabilities.sort((a, b) => b.probability - a.probability);
  
  const topPrediction = avgProbabilities[0];
  const firstResult = results[0]; // 取第一个结果的附加信息（描述/建议/警告）

  return {
    predictedClass: topPrediction.class,
    confidence: Math.round(topPrediction.probability * 100),
    diseaseName: DISEASE_NAMES_CN[topPrediction.class],
    description: firstResult.description,
    allProbabilities: avgProbabilities,
    severity: firstResult.severity,
    suggestions: firstResult.suggestions,
    warning: firstResult.warning,
    imageCount: results.length,
    individualPredictions: results
  };
}

/**
 * 单张图片预测
 * @param {string} imagePath - 图片路径
 * @returns {Promise<Object>} 预测结果
 */
function predictSkinDisease(imagePath) {
  return new Promise((resolve, reject) => {
    console.log('开始预测单张图片:', imagePath);
    
    uploadFile(imagePath)
      .then(result => {
        console.log('预测结果:', result);
        resolve(result);
      })
      .catch(error => {
        console.error('预测失败:', error);
        reject(error);
      });
  });
}

/**
 * 多张图片预测
 * @param {Array<string>} imagePaths - 图片路径数组
 * @returns {Promise<Object>} 综合预测结果
 */
function predictMultipleImages(imagePaths) {
  return new Promise((resolve, reject) => {
    console.log('开始预测多张图片:', imagePaths);
    
    uploadMultipleFiles(imagePaths)
      .then(result => {
        console.log('综合预测结果:', result);
        resolve(result);
      })
      .catch(error => {
        console.error('多图片预测失败:', error);
        reject(error);
      });
  });
}

/**
 * 检查服务器健康状态
 * @returns {Promise<boolean>} 服务器是否健康
 */
function checkServerHealth() {
  return new Promise((resolve, reject) => {
    // 开发环境跳过健康检查，直接返回true
    if (isDev) {
      console.log('开发环境：跳过健康检查');
      resolve(true);
      return;
    }
    
    wx.request({
      url: API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.HEALTH_CHECK,
      method: 'GET',
      success: (res) => {
        console.log('健康检查响应:', res);
        if (res.statusCode === 200) {
          const data = res.data;
          resolve(data.status === 'healthy' && data.model_loaded);
        } else {
          resolve(false);
        }
      },
      fail: (error) => {
        console.error('健康检查失败:', error);
        resolve(false);
      }
    });
  });
}

/**
 * 带重试的预测函数
 * @param {string|Array<string>} imagePathOrPaths - 图片路径或路径数组
 * @param {number} maxRetries - 最大重试次数
 * @returns {Promise<Object>} 预测结果
 */
async function predictWithRetry(imagePathOrPaths, maxRetries = 3) {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const isHealthy = await checkServerHealth();
      if (!isHealthy) {
        throw new Error('服务器不可用');
      }
      
      if (Array.isArray(imagePathOrPaths)) {
        return await predictMultipleImages(imagePathOrPaths);
      } else {
        return await predictSkinDisease(imagePathOrPaths);
      }
    } catch (error) {
      lastError = error;
      console.warn(`预测失败，第${i + 1}次重试:`, error);
      
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }
  
  throw lastError;
}

module.exports = {
  predictSkinDisease: predictWithRetry,
  predictMultipleImages: (imagePaths) => predictWithRetry(imagePaths),
  checkServerHealth,
  DISEASE_CLASSES,
  DISEASE_NAMES_CN
};
