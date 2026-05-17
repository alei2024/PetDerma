// pages/community/post/post.js
Page({
  data: {
    postContent: "",
    imageList: [], // 存储本地路径或服务器URL
    selectedTags: [],
    customTagInput: "",
    isPublishing: false,
    canPublish: false,

    petTypeTags: ["猫咪", "狗狗"],
    problemTags: [
      "过敏性皮炎",
      "真菌感染",
      "皮肤癣",
      "螨虫病",
      "过敏反应",
      "皮肤肿瘤",
      "寄生虫",
      "湿疹",
    ],
    contentTags: [
      "疾病求助",
      "经验分享",
      "产品推荐",
      "治疗记录",
      "日常护理",
      "科普知识",
    ],
  },

  // 输入内容
  onContentInput(e) {
    const content = e.detail.value;
    this.setData({
      postContent: content,
      canPublish: this.checkCanPublish(
        content,
        this.data.imageList,
        this.data.selectedTags
      ),
    });
  },

  // 判断是否可发
  checkCanPublish(content, images, tags) {
    return content.trim().length > 0 || images.length > 0;
  },

  // 选择图片
  chooseImage() {
    const that = this;
    const remainingCount = 9 - this.data.imageList.length;

    wx.chooseMedia({
      count: remainingCount,
      mediaType: ["image"],
      sourceType: ["album", "camera"],
      success(res) {
        const newImages = res.tempFiles.map((f) => f.tempFilePath);
        const updated = [...that.data.imageList, ...newImages];
        that.setData({
          imageList: updated,
          canPublish: that.checkCanPublish(
            that.data.postContent,
            updated,
            that.data.selectedTags
          ),
        });
      },
    });
  },

  // 删除图片
  deleteImage(e) {
    const index = e.currentTarget.dataset.index;
    const list = [...this.data.imageList];
    list.splice(index, 1);
    this.setData({
      imageList: list,
      canPublish: this.checkCanPublish(
        this.data.postContent,
        list,
        this.data.selectedTags
      ),
    });
  },

  // 标签逻辑
  toggleTag(e) {
    const tag = e.currentTarget.dataset.tag;
    let selected = [...this.data.selectedTags];
    const idx = selected.indexOf(tag);

    if (idx >= 0) selected.splice(idx, 1);
    else if (selected.length < 5) selected.push(tag);
    else {
      wx.showToast({ title: "最多选择5个标签", icon: "none" });
      return;
    }

    this.setData({
      selectedTags: selected,
      canPublish: this.checkCanPublish(
        this.data.postContent,
        this.data.imageList,
        selected
      ),
    });
  },

  removeTag(e) {
    const tag = e.currentTarget.dataset.tag;
    const selected = this.data.selectedTags.filter((t) => t !== tag);
    this.setData({
      selectedTags: selected,
      canPublish: this.checkCanPublish(
        this.data.postContent,
        this.data.imageList,
        selected
      ),
    });
  },

  onCustomTagInput(e) {
    this.setData({ customTagInput: e.detail.value });
  },

  addCustomTag() {
    const tag = this.data.customTagInput.trim();
    if (!tag) return wx.showToast({ title: "请输入标签内容", icon: "none" });
    if (this.data.selectedTags.includes(tag))
      return wx.showToast({ title: "标签已存在", icon: "none" });
    if (this.data.selectedTags.length >= 5)
      return wx.showToast({ title: "最多5个标签", icon: "none" });

    const selected = [...this.data.selectedTags, tag];
    this.setData({
      selectedTags: selected,
      customTagInput: "",
      canPublish: this.checkCanPublish(
        this.data.postContent,
        this.data.imageList,
        selected
      ),
    });
  },

  // 发布按钮
  publishPost() {
    if (!this.data.canPublish)
      return wx.showToast({ title: "请输入内容或添加图片", icon: "none" });

    this.setData({ isPublishing: true });
    this.uploadImagesAndPublish();
  },

  // 上传图片 + 发帖
  async uploadImagesAndPublish() {
    const app = getApp();
    const { postContent, imageList, selectedTags } = this.data;
    const token = wx.getStorageSync("token");

    try {
      let uploadedImageIds = [];

      if (imageList.length > 0) {
        wx.showLoading({ title: "上传图片中..." });

        const uploadPromises = imageList.map((imagePath, idx) => {
          return new Promise((resolve, reject) => {
            wx.uploadFile({
              url: `${app.globalData.baseUrl}/api/images/upload`,
              filePath: imagePath,
              name: "file",
              header: {
                Authorization: `Bearer ${token}`,
              },
              timeout: 30000, // ⏱️ 延长超时30s
              success: (res) => {
                try {
                  const data = JSON.parse(res.data);
                  if (data.success && data.data) {
                    // ✅ 用服务器返回的 HTTPS 地址替换本地路径
                    const imageUrl =
                      data.data.url ||
                      `${app.globalData.baseUrl}/api/images/${data.data.id}`;
                    const newList = [...this.data.imageList];
                    newList[idx] = imageUrl;
                    this.setData({ imageList: newList });
                    resolve(data.data.id || data.data.imageId);
                  } else reject(new Error(data.message || "上传失败"));
                } catch {
                  reject(new Error("解析上传结果失败"));
                }
              },
              fail: (err) => {
                // ⏱️ 超时重试一次
                if (err.errMsg.includes("timeout")) {
                  console.warn("⚠️ 上传超时，重试一次:", imagePath);
                  wx.uploadFile({
                    url: `${app.globalData.baseUrl}/api/images/upload`,
                    filePath: imagePath,
                    name: "file",
                    header: { Authorization: `Bearer ${token}` },
                    timeout: 30000,
                    success: (r2) => {
                      try {
                        const data2 = JSON.parse(r2.data);
                        if (data2.success && data2.data) {
                          const url2 =
                            data2.data.url ||
                            `${app.globalData.baseUrl}/api/images/${data2.data.id}`;
                          const newList = [...this.data.imageList];
                          newList[idx] = url2;
                          this.setData({ imageList: newList });
                          resolve(data2.data.id || data2.data.imageId);
                        } else reject(new Error("上传重试失败"));
                      } catch {
                        reject(new Error("上传重试解析失败"));
                      }
                    },
                    fail: reject,
                  });
                } else reject(err);
              },
            });
          });
        });

        uploadedImageIds = await Promise.all(uploadPromises);
        wx.hideLoading();
      }

      // 🟢 发帖请求
      wx.showLoading({ title: "发布中..." });
      const postData = {
        title:
          postContent.length > 50
            ? postContent.substring(0, 50) + "..."
            : postContent,
        content: postContent,
        images: uploadedImageIds,
        tags: selectedTags,
      };

      const res = await app.request({
        url: "/api/posts",
        method: "POST",
        data: postData,
      });

      wx.hideLoading();

      if (res.data?.success) {
        const eventChannel = this.getOpenerEventChannel();
        if (eventChannel)
          eventChannel.emit("postPublished", {
            post: res.data.data,
            message: "新帖子发布成功",
          });

        app.globalData.needRefreshCommunity = true;
        wx.showToast({ title: "发布成功", icon: "success", duration: 1500 });
        setTimeout(() => wx.navigateBack(), 1500);
      } else throw new Error(res.data?.message || "发布失败");
    } catch (err) {
      wx.hideLoading();
      console.error("发布帖子失败:", err);
      wx.showModal({
        title: "发布失败",
        content: err.message || "网络错误，请重试",
        showCancel: false,
      });
    } finally {
      this.setData({ isPublishing: false });
    }
  },

  // 预览图片
  previewImage(e) {
    const current = e.currentTarget.dataset.src;
    wx.previewImage({
      urls: this.data.imageList,
      current,
    });
  },
});
