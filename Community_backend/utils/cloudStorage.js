const crypto = require("crypto");
const path = require("path");
const fs = require("fs").promises;
const { v4: uuidv4 } = require("uuid");

// 本地文件存储配置
const STORAGE_CONFIG = {
  basePath: process.env.LOCAL_STORAGE_PATH || "./uploads",
  baseUrl: process.env.LOCAL_STORAGE_URL || "http://localhost:3000/uploads",
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
};

// 确保目录存在
const ensureDirectoryExists = async (dirPath) => {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
};

// 生成唯一文件名
const generateFileName = (originalName, folder = "") => {
  const ext = path.extname(originalName);
  const name = uuidv4();
  const timestamp = Date.now();
  return `${folder}/${timestamp}_${name}${ext}`;
};

// 上传文件到本地存储
const uploadToCloudStorage = async (file, folder = "") => {
  try {
    // 检查文件类型
    if (!STORAGE_CONFIG.allowedTypes.includes(file.mimetype)) {
      throw new Error("不支持的文件类型");
    }

    // 检查文件大小
    if (file.size > STORAGE_CONFIG.maxFileSize) {
      throw new Error("文件大小超过限制");
    }

    const fileName = generateFileName(file.originalname, folder);
    const filePath = path.join(STORAGE_CONFIG.basePath, fileName);
    const fileUrl = `${STORAGE_CONFIG.baseUrl}/${fileName}`;

    // 确保目录存在
    await ensureDirectoryExists(path.dirname(filePath));

    // 写入文件
    await fs.writeFile(filePath, file.buffer);

    return {
      url: fileUrl,
      key: fileName,
      size: file.size,
      mimetype: file.mimetype,
      path: filePath,
    };
  } catch (error) {
    console.error("本地存储上传错误:", error);
    throw new Error("文件上传失败: " + error.message);
  }
};

// 从本地存储删除文件
const deleteFromCloudStorage = async (key) => {
  try {
    const filePath = path.join(STORAGE_CONFIG.basePath, key);

    // 检查文件是否存在
    try {
      await fs.access(filePath);
    } catch {
      console.log(`文件不存在: ${key}`);
      return { success: true };
    }

    // 删除文件
    await fs.unlink(filePath);
    console.log(`文件已删除: ${key}`);

    return { success: true };
  } catch (error) {
    console.error("本地存储删除错误:", error);
    throw new Error("文件删除失败: " + error.message);
  }
};

// 获取文件访问URL
const getFileUrl = (key) => {
  return `${STORAGE_CONFIG.baseUrl}/${key}`;
};

// 批量上传文件
const uploadMultipleFiles = async (files, folder = "") => {
  try {
    const uploadPromises = files.map((file) =>
      uploadToCloudStorage(file, folder)
    );
    const results = await Promise.all(uploadPromises);
    return results;
  } catch (error) {
    console.error("批量上传错误:", error);
    throw new Error("批量上传失败");
  }
};

module.exports = {
  uploadToCloudStorage,
  deleteFromCloudStorage,
  getFileUrl,
  uploadMultipleFiles,
};
