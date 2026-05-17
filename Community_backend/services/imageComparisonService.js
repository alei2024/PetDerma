/**
 * 图像相似度比较服务
 * 提供多种图像相似度计算方法
 */

const crypto = require("crypto");

class ImageComparisonService {
  /**
   * 计算两张图片的相似度
   * @param {string} image1Base64 - 第一张图片的base64编码
   * @param {string} image2Base64 - 第二张图片的base64编码
   * @param {string} method - 比较方法 ('hash', 'pixel', 'histogram')
   * @returns {Promise<number>} 相似度 (0-1)
   */
  static async calculateSimilarity(
    image1Base64,
    image2Base64,
    method = "hash"
  ) {
    try {
      switch (method) {
        case "hash":
          return this.hashSimilarity(image1Base64, image2Base64);
        case "pixel":
          return this.pixelSimilarity(image1Base64, image2Base64);
        case "histogram":
          return this.histogramSimilarity(image1Base64, image2Base64);
        default:
          return this.hashSimilarity(image1Base64, image2Base64);
      }
    } catch (error) {
      console.error("计算图像相似度失败:", error);
      return 0;
    }
  }

  /**
   * 基于感知哈希的相似度计算
   * 使用dHash算法进行图像相似度检测
   */
  static hashSimilarity(image1Base64, image2Base64) {
    try {
      // 使用感知哈希算法
      const hash1 = this.generatePerceptualHash(image1Base64);
      const hash2 = this.generatePerceptualHash(image2Base64);

      if (!hash1 || !hash2) {
        return 0;
      }

      const hammingDistance = this.calculateHammingDistance(hash1, hash2);
      const maxDistance = hash1.length;

      // 感知哈希的相似度计算
      const similarity = 1 - hammingDistance / maxDistance;

      // 对于图像搜索，我们需要更严格的阈值
      return similarity > 0.8 ? similarity : 0;
    } catch (error) {
      console.error("哈希相似度计算失败:", error);
      return 0;
    }
  }

  /**
   * 基于像素的相似度计算
   * 精度中等，速度中等
   */
  static pixelSimilarity(image1Base64, image2Base64) {
    // 简化的像素比较
    // 实际项目中可以使用图像处理库如sharp或jimp

    // 计算文件大小相似度作为简化方案
    const size1 = Buffer.from(image1Base64, "base64").length;
    const size2 = Buffer.from(image2Base64, "base64").length;

    const sizeDiff = Math.abs(size1 - size2);
    const maxSize = Math.max(size1, size2);

    if (maxSize === 0) return 1;

    const sizeSimilarity = 1 - sizeDiff / maxSize;

    // 结合哈希相似度
    const hashSim = this.hashSimilarity(image1Base64, image2Base64);

    return sizeSimilarity * 0.3 + hashSim * 0.7;
  }

  /**
   * 基于直方图的相似度计算
   * 精度较高，但速度较慢
   */
  static histogramSimilarity(image1Base64, image2Base64) {
    // 简化的直方图比较
    // 实际项目中需要使用专业的图像处理库

    const hist1 = this.generateSimpleHistogram(image1Base64);
    const hist2 = this.generateSimpleHistogram(image2Base64);

    return this.compareHistograms(hist1, hist2);
  }

  /**
   * 生成感知哈希（简化版dHash算法）
   * 这是一个简化的实现，实际项目中建议使用专业的图像处理库
   */
  static generatePerceptualHash(base64Image) {
    try {
      // 这里使用简化的感知哈希算法
      // 实际项目中应该使用真正的图像处理库如sharp、jimp等

      // 1. 基于图像内容特征生成哈希
      const buffer = Buffer.from(base64Image, "base64");

      // 2. 分析图像数据的分布特征
      const features = this.extractImageFeatures(buffer);

      // 3. 生成64位感知哈希
      return this.generateHashFromFeatures(features);
    } catch (error) {
      console.error("生成感知哈希失败:", error);
      return null;
    }
  }

  /**
   * 提取图像特征（简化版）
   */
  static extractImageFeatures(buffer) {
    const features = [];
    const sampleSize = Math.min(buffer.length, 1024); // 采样前1024字节

    // 1. 计算像素值分布
    const histogram = new Array(256).fill(0);
    for (let i = 0; i < sampleSize; i++) {
      histogram[buffer[i]]++;
    }

    // 2. 计算统计特征
    let mean = 0;
    let variance = 0;

    for (let i = 0; i < 256; i++) {
      mean += i * histogram[i];
    }
    mean /= sampleSize;

    for (let i = 0; i < 256; i++) {
      variance += Math.pow(i - mean, 2) * histogram[i];
    }
    variance /= sampleSize;

    // 3. 生成特征向量
    features.push(mean);
    features.push(variance);
    features.push(Math.max(...histogram)); // 最大频率
    features.push(histogram.indexOf(Math.max(...histogram))); // 最大频率对应的值

    // 4. 添加分布特征
    const quartiles = this.calculateQuartiles(histogram);
    features.push(...quartiles);

    return features;
  }

  /**
   * 计算四分位数
   */
  static calculateQuartiles(histogram) {
    const total = histogram.reduce((sum, count) => sum + count, 0);
    let cumulative = 0;
    const quartiles = [];

    for (let q = 1; q <= 3; q++) {
      const target = (total * q) / 4;
      cumulative = 0;

      for (let i = 0; i < histogram.length; i++) {
        cumulative += histogram[i];
        if (cumulative >= target) {
          quartiles.push(i);
          break;
        }
      }
    }

    return quartiles;
  }

  /**
   * 从特征生成哈希
   */
  static generateHashFromFeatures(features) {
    let hash = "";

    // 将特征值转换为二进制哈希
    for (let i = 0; i < features.length && hash.length < 64; i++) {
      const value = Math.floor(features[i]) % 256;
      const binary = value.toString(2).padStart(8, "0");
      hash += binary;
    }

    // 确保哈希长度为64位
    return hash.substring(0, 64).padEnd(64, "0");
  }

  /**
   * 计算汉明距离
   */
  static calculateHammingDistance(hash1, hash2) {
    if (hash1.length !== hash2.length) {
      return Math.max(hash1.length, hash2.length);
    }

    let distance = 0;
    for (let i = 0; i < hash1.length; i++) {
      if (hash1[i] !== hash2[i]) {
        distance++;
      }
    }

    return distance;
  }

  /**
   * 生成简化的颜色直方图
   */
  static generateSimpleHistogram(base64Image) {
    // 这是一个非常简化的直方图生成方法
    // 实际项目中应该使用专业的图像处理库

    const buffer = Buffer.from(base64Image, "base64");
    const histogram = new Array(256).fill(0);

    // 简化处理：统计字节值分布
    for (let i = 0; i < buffer.length; i += 100) {
      // 采样处理
      const value = buffer[i];
      histogram[value]++;
    }

    // 归一化
    const total = histogram.reduce((sum, count) => sum + count, 0);
    return histogram.map((count) => (total > 0 ? count / total : 0));
  }

  /**
   * 比较两个直方图
   */
  static compareHistograms(hist1, hist2) {
    if (hist1.length !== hist2.length) {
      return 0;
    }

    // 使用巴氏距离（Bhattacharyya distance）的简化版本
    let similarity = 0;
    for (let i = 0; i < hist1.length; i++) {
      similarity += Math.sqrt(hist1[i] * hist2[i]);
    }

    return similarity;
  }

  /**
   * 批量计算图像相似度
   * @param {string} targetImage - 目标图像base64
   * @param {Array} imageList - 图像列表
   * @param {number} threshold - 相似度阈值
   * @returns {Array} 相似图像列表
   */
  static async batchCalculateSimilarity(
    targetImage,
    imageList,
    threshold = 0.3
  ) {
    const results = [];

    for (let i = 0; i < imageList.length; i++) {
      const image = imageList[i];
      try {
        const similarity = await this.calculateSimilarity(
          targetImage,
          image.data
        );

        if (similarity >= threshold) {
          results.push({
            ...image,
            similarity: similarity,
          });
        }
      } catch (error) {
        console.error(`计算第${i}张图片相似度失败:`, error);
      }
    }

    // 按相似度排序
    return results.sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * 获取推荐的相似度阈值
   * @param {string} imageType - 图像类型 ('pet', 'general')
   * @returns {number} 推荐阈值
   */
  static getRecommendedThreshold(imageType = "general") {
    const thresholds = {
      pet: 0.5, // 宠物图片相似度要求很高
      general: 0.4, // 一般图片
      strict: 0.5, // 严格模式
      loose: 0.5, // 宽松模式
    };

    return thresholds[imageType] || thresholds.general;
  }
}

module.exports = ImageComparisonService;
