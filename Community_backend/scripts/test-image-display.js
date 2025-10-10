const axios = require("axios");

async function testImageDisplay() {
  try {
    console.log("🚀 测试图片显示流程...\n");

    // 1. 获取帖子列表
    const listResponse = await axios.get(
      "http://localhost:3000/api/posts?page=1&pageSize=1"
    );
    const post = listResponse.data.data.posts[0];

    console.log("✅ 1. 获取帖子成功");
    console.log("   帖子ID:", post._id);
    console.log("   标题:", post.title);
    console.log("   图片数量:", post.images.length);

    if (post.images.length === 0) {
      console.log("❌ 该帖子没有图片，无法测试");
      return;
    }

    // 2. 分析图片数据结构
    const firstImage = post.images[0];
    console.log("\n✅ 2. 图片数据结构分析");
    console.log("   图片ID:", firstImage._id);
    console.log("   图片URL:", firstImage.url);
    console.log("   文件类型:", firstImage.contentType);
    console.log("   文件大小:", firstImage.size, "bytes");
    console.log(
      "   包含data字段:",
      "data" in firstImage ? "是（错误）" : "否（正确）"
    );

    // 3. 模拟前端URL构建
    const baseUrl = "http://172.28.16.1:3000";
    const frontendImageUrl = `${baseUrl}${firstImage.url}`;
    console.log("\n✅ 3. 前端URL构建");
    console.log("   baseUrl:", baseUrl);
    console.log("   image.url:", firstImage.url);
    console.log("   最终URL:", frontendImageUrl);

    // 4. 测试图片访问
    const imageResponse = await axios.get(frontendImageUrl, {
      responseType: "arraybuffer",
      timeout: 5000,
    });

    console.log("\n✅ 4. 图片访问测试");
    console.log("   状态码:", imageResponse.status);
    console.log("   Content-Type:", imageResponse.headers["content-type"]);
    console.log("   实际大小:", imageResponse.data.length, "bytes");
    console.log(
      "   大小匹配:",
      imageResponse.data.length === firstImage.size ? "是" : "否"
    );

    // 5. 测试所有图片
    console.log("\n✅ 5. 测试所有图片访问");
    for (let i = 0; i < Math.min(post.images.length, 3); i++) {
      const img = post.images[i];
      const imgUrl = `${baseUrl}${img.url}`;

      try {
        const response = await axios.head(imgUrl); // 只获取头信息
        console.log(`   图片 ${i + 1}: ✅ 可访问 (${response.status})`);
      } catch (error) {
        console.log(
          `   图片 ${i + 1}: ❌ 无法访问 (${
            error.response?.status || error.message
          })`
        );
      }
    }

    console.log("\n🎉 图片显示流程测试完成！");
    console.log("\n📋 前端使用说明:");
    console.log("   1. 从API获取帖子数据");
    console.log("   2. 遍历 post.images 数组");
    console.log("   3. 对每个图片对象，使用: baseUrl + imageObj.url");
    console.log(
      "   4. 示例: http://172.28.16.1:3000/api/images/68e7a6e61ed8f1016d278c0c"
    );
  } catch (error) {
    console.error("❌ 测试失败:", error.response?.data || error.message);
  }
}

testImageDisplay();
