// 图片加载工具 - 微信小程序兼容
const app = getApp();

/**
 * 处理图片URL，确保微信小程序能正常显示
 * @param {Object|String} imageObj - 图片对象、图片路径或图片ID
 * @returns {String} 处理后的图片URL
 */
function processImageUrl(imageObj) {
  if (!imageObj) return "";

  // 获取baseUrl，添加容错处理
  const baseUrl =
    app.globalData?.baseUrl ||
    app.globalData?.baseURL ||
    "http://192.168.31.247:3000";

  // 如果是字符串
  if (typeof imageObj === "string") {
    // 如果是完整的HTTP URL，直接返回
    if (imageObj.startsWith("http")) {
      return imageObj;
    }

    // 如果是以 / 开头的路径
    if (imageObj.startsWith("/")) {
      // 如果是API路径，直接使用baseUrl拼接
      if (imageObj.startsWith("/api/")) {
        return `${baseUrl}${imageObj}`;
      }
      // 如果是静态资源路径，也使用baseUrl拼接
      return `${baseUrl}${imageObj}`;
    }

    // 如果是图片ID（24位十六进制字符串）
    if (/^[0-9a-fA-F]{24}$/.test(imageObj)) {
      return `${baseUrl}/api/images/${imageObj}`;
    }

    // 其他情况，当作相对路径处理
    return `${baseUrl}/${imageObj}`;
  }

  // 如果是对象（新格式）
  if (typeof imageObj === "object") {
    // 如果对象有 _id 属性（MongoDB 图片对象）
    if (imageObj._id) {
      return `${baseUrl}/api/images/${imageObj._id}`;
    }

    // 如果对象有 imageId 属性
    if (imageObj.imageId) {
      return `${baseUrl}/api/images/${imageObj.imageId}`;
    }

    // 如果对象有 url 属性
    if (imageObj.url) {
      if (imageObj.url.startsWith("http")) {
        return imageObj.url;
      } else if (imageObj.url.startsWith("/api/")) {
        return `${baseUrl}${imageObj.url}`;
      } else if (imageObj.url.startsWith("/")) {
        return `${baseUrl}${imageObj.url}`;
      } else {
        return `${baseUrl}/${imageObj.url}`;
      }
    }
  }

  return "";
}

/**
 * 获取图片的Base64数据URL（备用方案）
 * @param {String} imageId - 图片ID
 * @returns {Promise<String>} Base64数据URL
 */
async function getImageBase64(imageId) {
  try {
    const response = await new Promise((resolve, reject) => {
      wx.request({
        url: `${app.globalData.baseUrl}/api/images/${imageId}/base64`,
        method: "GET",
        success: resolve,
        fail: reject,
      });
    });

    if (response.data && response.data.success) {
      return response.data.data.dataUrl;
    } else {
      throw new Error(response.data?.message || "获取Base64失败");
    }
  } catch (error) {
    console.error("获取图片Base64失败:", error);
    return "";
  }
}

/**
 * 智能图片加载 - 自动选择最佳方案
 * @param {Object|String} imageObj - 图片对象或路径
 * @param {Function} onSuccess - 成功回调
 * @param {Function} onError - 失败回调
 */
function smartLoadImage(imageObj, onSuccess, onError) {
  const directUrl = processImageUrl(imageObj);

  if (!directUrl) {
    onError && onError("无效的图片对象");
    return;
  }

  // 尝试直接加载
  const image = wx.createImage ? wx.createImage() : new Image();

  image.onload = () => {
    console.log("✅ 直接图片加载成功:", directUrl);
    onSuccess && onSuccess(directUrl);
  };

  image.onerror = async () => {
    console.log("⚠️ 直接图片加载失败，尝试Base64方案");

    // 如果是对象且有ID，尝试Base64
    if (typeof imageObj === "object" && imageObj._id) {
      try {
        const base64Url = await getImageBase64(imageObj._id);
        if (base64Url) {
          console.log("✅ Base64图片加载成功");
          onSuccess && onSuccess(base64Url);
        } else {
          onError && onError("Base64加载失败");
        }
      } catch (error) {
        onError && onError(error.message);
      }
    } else {
      onError && onError("直接加载失败且无法使用Base64");
    }
  };

  image.src = directUrl;
}

/**
 * 批量处理图片URL列表
 * @param {Array} images - 图片对象数组
 * @returns {Array} 处理后的URL数组
 */
function processImageList(images) {
  if (!Array.isArray(images)) return [];

  return images.map(processImageUrl).filter((url) => url);
}

module.exports = {
  processImageUrl,
  getImageBase64,
  smartLoadImage,
  processImageList,
};
