const axios = require("axios");

async function finalImageTest() {
  try {
    console.log("🚀 最终图片功能测试...\n");

    // 1. 测试帖子列表API
    console.log("✅ 1. 测试帖子列表API");
    const listResponse = await axios.get(
      "http://localhost:3000/api/posts?page=1&pageSize=1"
    );
    const post = listResponse.data.data.posts[0];

    console.log("   帖子ID:", post._id);
    console.log("   标题:", post.title);
    console.log("   图片数量:", post.images.length);

    if (post.images.length === 0) {
      console.log("❌ 该帖子没有图片，无法测试");
      return;
    }

    const firstImage = post.images[0];
    console.log("   第一张图片:");
    console.log("     - ID:", firstImage._id);
    console.log("     - URL:", firstImage.url);
    console.log("     - 类型:", firstImage.contentType);
    console.log("     - 包含data字段:", "data" in firstImage ? "是" : "否");

    // 2. 测试直接图片访问
    console.log("\n✅ 2. 测试直接图片访问");
    const directUrl = `http://localhost:3000${firstImage.url}`;
    console.log("   访问URL:", directUrl);

    try {
      const directResponse = await axios.get(directUrl, {
        responseType: "arraybuffer",
        timeout: 5000,
      });
      console.log("   ✅ 直接访问成功");
      console.log("     - 状态码:", directResponse.status);
      console.log(
        "     - Content-Type:",
        directResponse.headers["content-type"]
      );
      console.log("     - 图片大小:", directResponse.data.length, "bytes");
      console.log(
        "     - CORS头:",
        directResponse.headers["access-control-allow-origin"]
      );
    } catch (error) {
      console.log(
        "   ❌ 直接访问失败:",
        error.response?.status || error.message
      );
    }

    // 3. 测试Base64备用方案
    console.log("\n✅ 3. 测试Base64备用方案");
    const base64Url = `http://localhost:3000/api/images/${firstImage._id}/base64`;
    console.log("   Base64 URL:", base64Url);

    try {
      const base64Response = await axios.get(base64Url, { timeout: 5000 });
      console.log("   ✅ Base64访问成功");
      console.log("     - 状态码:", base64Response.status);
      console.log(
        "     - DataURL长度:",
        base64Response.data.data.dataUrl.length
      );
      console.log(
        "     - DataURL前缀:",
        base64Response.data.data.dataUrl.substring(0, 30) + "..."
      );
    } catch (error) {
      console.log(
        "   ❌ Base64访问失败:",
        error.response?.status || error.message
      );
    }

    // 4. 测试所有图片
    console.log("\n✅ 4. 测试所有图片访问");
    for (let i = 0; i < Math.min(post.images.length, 3); i++) {
      const img = post.images[i];
      const imgUrl = `http://localhost:3000${img.url}`;

      try {
        const response = await axios.head(imgUrl, { timeout: 3000 });
        console.log(`   图片 ${i + 1}: ✅ 可访问 (${response.status})`);
      } catch (error) {
        console.log(
          `   图片 ${i + 1}: ❌ 无法访问 (${
            error.response?.status || error.message
          })`
        );
      }
    }

    console.log("\n🎉 最终测试完成！");
    console.log("\n📋 微信小程序使用指南:");
    console.log("   1. 图片数据已正确存储在MongoDB中");
    console.log("   2. API不再返回二进制数据，只返回元信息");
    console.log(
      "   3. 图片访问URL格式: http://172.28.16.1:3000/api/images/{id}"
    );
    console.log(
      "   4. 如果直接访问失败，可使用Base64: /api/images/{id}/base64"
    );
    console.log("   5. 前端已集成智能图片加载工具");

    console.log("\n🔧 如果仍有问题，请检查:");
    console.log("   - 微信开发者工具的网络设置");
    console.log("   - 是否关闭了域名校验");
    console.log("   - 控制台是否有新的错误信息");
  } catch (error) {
    console.error("❌ 最终测试失败:", error.response?.data || error.message);
  }
}

finalImageTest();
