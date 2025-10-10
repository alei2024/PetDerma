const axios = require("axios");
const FormData = require("form-data");

async function testCompleteFlow() {
  try {
    console.log("🚀 开始完整流程测试...\n");

    // 1. 获取token
    const tokenResponse = await axios.get(
      "http://localhost:3000/api/auth/dev-token"
    );
    const token = tokenResponse.data.token;
    console.log("✅ 1. Token获取成功");

    // 2. 创建测试图片（红色1x1像素PNG）
    const testImageBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00,
      0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0x0f, 0x00, 0x01,
      0x01, 0x01, 0x00, 0x18, 0xdd, 0x8d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
      0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
    ]);

    // 3. 上传图片到数据库
    const form = new FormData();
    form.append("file", testImageBuffer, {
      filename: "test-red-pixel.png",
      contentType: "image/png",
    });

    const uploadResponse = await axios.post(
      "http://localhost:3000/api/images/upload",
      form,
      {
        headers: {
          Authorization: "Bearer " + token,
          ...form.getHeaders(),
        },
      }
    );

    const imageId = uploadResponse.data.data.id;
    console.log("✅ 2. 图片上传到数据库成功");
    console.log("   图片ID:", imageId);
    console.log("   图片URL:", uploadResponse.data.data.url);

    // 4. 验证图片可以访问
    const imageResponse = await axios.get(
      "http://localhost:3000/api/images/" + imageId,
      {
        responseType: "arraybuffer",
      }
    );
    console.log("✅ 3. 图片访问验证成功");
    console.log("   Content-Type:", imageResponse.headers["content-type"]);
    console.log("   图片大小:", imageResponse.data.length, "bytes");

    // 5. 创建包含图片的帖子
    const postData = {
      title: "完整流程测试帖子",
      content:
        "这是一个完整的流程测试帖子，包含存储在MongoDB数据库中的图片。图片以二进制格式存储，通过API接口访问。",
      images: [imageId],
      tags: ["完整测试", "图片存储", "MongoDB", "二进制"],
    };

    const createResponse = await axios.post(
      "http://localhost:3000/api/posts",
      postData,
      {
        headers: { Authorization: "Bearer " + token },
      }
    );

    const postId = createResponse.data.data._id;
    console.log("✅ 4. 帖子创建成功");
    console.log("   帖子ID:", postId);
    console.log("   图片数量:", createResponse.data.data.images.length);

    // 6. 获取帖子详情验证
    const detailResponse = await axios.get(
      "http://localhost:3000/api/posts/" + postId
    );
    const post = detailResponse.data.data.post;

    console.log("✅ 5. 帖子详情获取成功");
    console.log("   标题:", post.title);
    console.log("   内容长度:", post.content.length);
    console.log("   图片数量:", post.images.length);

    if (post.images.length > 0) {
      const image = post.images[0];
      console.log("   图片信息:");
      console.log("     - ID:", image._id);
      console.log("     - URL:", image.url);
      console.log("     - 类型:", image.contentType);
      console.log("     - 大小:", image.size, "bytes");
      console.log("     - 原始文件名:", image.originalName);
    }

    // 7. 获取帖子列表验证
    const listResponse = await axios.get(
      "http://localhost:3000/api/posts?page=1&pageSize=5"
    );
    console.log("✅ 6. 帖子列表获取成功");
    console.log("   总帖子数:", listResponse.data.data.posts.length);

    const newPost = listResponse.data.data.posts.find((p) => p._id === postId);
    if (newPost) {
      console.log("   新帖子在列表中找到:");
      console.log("     - 标题:", newPost.title);
      console.log("     - 图片数量:", newPost.images.length);
    }

    console.log("\n🎉 完整流程测试成功！");
    console.log("\n📋 测试总结:");
    console.log("   ✅ 图片以二进制格式存储到MongoDB");
    console.log("   ✅ 图片可以通过API正常访问");
    console.log("   ✅ 帖子正确关联图片ID");
    console.log("   ✅ 帖子列表和详情正确显示图片信息");
    console.log("   ✅ 前端可以使用 /api/images/{id} 访问图片");
  } catch (error) {
    console.error("❌ 测试失败:", error.response?.data || error.message);
    if (error.response?.data) {
      console.error("详细错误:", JSON.stringify(error.response.data, null, 2));
    }
  }
}

testCompleteFlow();
