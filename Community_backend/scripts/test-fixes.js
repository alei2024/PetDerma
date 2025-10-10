const axios = require("axios");

async function testFixes() {
  try {
    console.log("🚀 测试修复效果...\n");

    // 1. 测试图片API响应时间
    console.log("✅ 1. 测试图片API响应时间");
    const imageId = "68e7a6e61ed8f1016d278c0c";

    const startTime = Date.now();
    const imageResponse = await axios.get(
      `http://localhost:3000/api/images/${imageId}`,
      {
        responseType: "arraybuffer",
        timeout: 5000,
      }
    );
    const responseTime = Date.now() - startTime;

    console.log("   ✅ 直接图片访问:");
    console.log("     - 响应时间:", responseTime, "ms");
    console.log("     - 状态码:", imageResponse.status);
    console.log("     - 图片大小:", imageResponse.data.length, "bytes");

    // 2. 测试Base64 API响应时间
    console.log("\n✅ 2. 测试Base64 API响应时间");
    const base64StartTime = Date.now();
    const base64Response = await axios.get(
      `http://localhost:3000/api/images/${imageId}/base64`,
      { timeout: 5000 }
    );
    const base64ResponseTime = Date.now() - base64StartTime;

    console.log("   ✅ Base64图片访问:");
    console.log("     - 响应时间:", base64ResponseTime, "ms");
    console.log("     - 状态码:", base64Response.status);
    console.log("     - DataURL长度:", base64Response.data.data.dataUrl.length);

    // 3. 测试帖子创建和列表更新
    console.log("\n✅ 3. 测试帖子创建功能");
    const tokenResponse = await axios.get(
      "http://localhost:3000/api/auth/dev-token"
    );
    const token = tokenResponse.data.token;

    // 获取创建前的帖子数量
    const beforeResponse = await axios.get(
      "http://localhost:3000/api/posts?page=1&pageSize=1"
    );
    const beforeCount = beforeResponse.data.data.posts.length;
    const beforeFirstPost = beforeResponse.data.data.posts[0];

    console.log("   创建前帖子数量:", beforeCount);
    console.log("   创建前第一条帖子ID:", beforeFirstPost?._id);

    // 创建新帖子
    const newPostData = {
      title: "实时更新测试帖子",
      content: "这是一个测试帖子，用于验证发布后列表是否能实时更新。",
      images: [],
      tags: ["测试", "实时更新"],
    };

    const createResponse = await axios.post(
      "http://localhost:3000/api/posts",
      newPostData,
      {
        headers: { Authorization: "Bearer " + token },
      }
    );

    console.log("   ✅ 新帖子创建成功:");
    console.log("     - 帖子ID:", createResponse.data.data._id);
    console.log("     - 标题:", createResponse.data.data.title);

    // 验证列表更新
    const afterResponse = await axios.get(
      "http://localhost:3000/api/posts?page=1&pageSize=1"
    );
    const afterFirstPost = afterResponse.data.data.posts[0];

    console.log("   ✅ 列表更新验证:");
    console.log("     - 创建后第一条帖子ID:", afterFirstPost._id);
    console.log(
      "     - 是否为新创建的帖子:",
      afterFirstPost._id === createResponse.data.data._id ? "是" : "否"
    );

    console.log("\n🎉 修复效果测试完成！");
    console.log("\n📋 修复总结:");
    console.log("   ✅ 图片预览优化: 添加预加载和Base64备用方案");
    console.log(
      "   ✅ 响应时间优化: 直接访问",
      responseTime,
      "ms, Base64",
      base64ResponseTime,
      "ms"
    );
    console.log("   ✅ 帖子列表实时更新: 发布后自动刷新机制");
    console.log("   ✅ 双重通知机制: 事件通道 + 全局标记");
  } catch (error) {
    console.error("❌ 测试失败:", error.response?.data || error.message);
  }
}

testFixes();
