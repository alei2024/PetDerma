// 更新帖子内容脚本 - 正确处理中文编码
const axios = require("axios");

const baseUrl = "http://172.28.16.1:3000";

// 获取token
async function getToken() {
  try {
    const response = await axios.get(`${baseUrl}/api/auth/dev-token`);
    return response.data.token;
  } catch (error) {
    console.error("获取token失败:", error.message);
    throw error;
  }
}

// 更新5张图片帖子
async function update5ImagePost(token) {
  const postData = {
    title: "宠物皮肤护理经验分享",
    content: `作为一名资深的宠物主人，我想和大家分享一些关于宠物皮肤护理的实用经验。经过多年的养宠生活，我发现很多宠物皮肤问题其实是可以预防的。

首先，定期给宠物洗澡是非常重要的，但不能过于频繁。一般来说，狗狗每周洗一次澡就足够了，而猫咪由于自己会清洁，可以适当减少洗澡频率。选择合适的宠物专用洗护产品也很关键，人用的洗发水绝对不能给宠物使用。

其次，饮食对宠物皮肤健康影响很大。我会给我的宠物选择含有Omega-3脂肪酸的优质狗粮，这对维持皮肤和毛发健康非常有帮助。另外，保持环境清洁干燥也很重要，潮湿的环境容易滋生细菌和真菌。

最后，如果发现宠物有持续的皮肤问题，一定要及时就医，不要自己盲目用药。专业的兽医诊断和治疗才是最安全有效的方法。`,
    images: [
      "/images_test/big_dog.jpg",
      "/images_test/little_dog.jpg",
      "/images_test/grey_cat.jpg",
      "/images_test/black_cat.jpg",
      "/images_test/upload_1.png",
    ],
    tags: ["宠物护理", "皮肤健康", "经验分享", "预防保健"],
  };

  try {
    const response = await axios.put(
      `${baseUrl}/api/posts/68e74b21ea6311b979e3cd75`,
      postData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json; charset=utf-8",
        },
      }
    );
    console.log("✅ 5张图片帖子更新成功");
    return response.data;
  } catch (error) {
    console.error("❌ 5张图片帖子更新失败:", error.message);
    throw error;
  }
}

// 更新8张图片帖子
async function update8ImagePost(token) {
  const postData = {
    title: "我家宠物的成长记录与皮肤病康复历程",
    content: `今天想和大家分享一下我家毛孩子们的成长历程，特别是关于皮肤病的预防和治疗经验。希望能帮助到有类似困扰的宠物主人们。

我家现在有两只狗狗和两只猫咪，它们都是我从小养大的。最开始养宠物的时候，由于经验不足，曾经遇到过不少皮肤问题。记得我家的大金毛刚来家里的时候，由于环境变化和饮食不当，出现了严重的皮肤过敏症状，毛发大量脱落，皮肤红肿发痒。

经过多次就医和调整，我总结出了一套完整的宠物皮肤护理方案：

1. 环境管理：保持居住环境干燥通风，定期清洁宠物用品，使用空气净化器减少过敏原。

2. 饮食调理：选择无谷物、低敏配方的优质宠物食品，适当补充鱼油和维生素E。

3. 日常护理：使用温和的宠物专用洗护产品，定期梳理毛发，及时清理耳朵和脚趾间的污垢。

4. 定期检查：每周仔细检查宠物的皮肤状况，发现异常及时处理。

5. 专业治疗：遇到严重问题时，一定要寻求专业兽医的帮助，不要自己盲目用药。

现在我的毛孩子们都很健康，毛发光亮，皮肤状态良好。这些照片记录了它们从小到大的变化，也见证了我们一起度过的美好时光。养宠物不仅仅是陪伴，更是一种责任和学习的过程。`,
    images: [
      "/images_test/big_dog.jpg",
      "/images_test/little_dog.jpg",
      "/images_test/grey_cat.jpg",
      "/images_test/black_cat.jpg",
      "/images_test/upload_1.png",
      "/images_test/upload_2.jpg",
      "/images_test/big_dog.jpg",
      "/images_test/grey_cat.jpg",
    ],
    tags: ["宠物成长", "皮肤病治疗", "康复经验", "护理心得", "多宠家庭"],
  };

  try {
    const response = await axios.put(
      `${baseUrl}/api/posts/68e74bdeb0e4f6f45fb06f50`,
      postData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json; charset=utf-8",
        },
      }
    );
    console.log("✅ 8张图片帖子更新成功");
    return response.data;
  } catch (error) {
    console.error("❌ 8张图片帖子更新失败:", error.message);
    throw error;
  }
}

// 验证更新结果
async function verifyUpdates(token) {
  try {
    console.log("\n📋 验证更新结果...");

    // 验证5张图片帖子
    const post5 = await axios.get(
      `${baseUrl}/api/posts/68e74b21ea6311b979e3cd75`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    console.log("5张图片帖子标题:", post5.data.data.post.title);
    console.log("5张图片帖子图片数量:", post5.data.data.post.images.length);

    // 验证8张图片帖子
    const post8 = await axios.get(
      `${baseUrl}/api/posts/68e74bdeb0e4f6f45fb06f50`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    console.log("8张图片帖子标题:", post8.data.data.post.title);
    console.log("8张图片帖子图片数量:", post8.data.data.post.images.length);
  } catch (error) {
    console.error("验证失败:", error.message);
  }
}

// 主函数
async function main() {
  try {
    console.log("🚀 开始更新帖子...");

    // 获取token
    const token = await getToken();
    console.log("✅ Token获取成功");

    // 更新帖子
    await update5ImagePost(token);
    await update8ImagePost(token);

    // 验证结果
    await verifyUpdates(token);

    console.log("\n🎉 所有帖子更新完成！");
  } catch (error) {
    console.error("❌ 更新过程中出现错误:", error.message);
    process.exit(1);
  }
}

// 运行脚本
if (require.main === module) {
  main();
}

module.exports = { main };
