const app = getApp();

Page({
  data: {
    trackingId: "",
    lesionName: "",
    images: [],
    severity: 3,
    rednessScore: 50,
    areaScore: 50,
    notes: "",
    submitting: false,
    computePreview: 39,
  },

  _refreshScore() {
    const { severity, rednessScore, areaScore } = this.data;
    const raw = 100 - severity * 12 - rednessScore * 0.25 - areaScore * 0.25;
    this.setData({ computePreview: Math.round(Math.max(0, Math.min(100, raw))) });
  },

  onLoad(options) {
    const trackingId = options.trackingId || "";
    const lesionName = options.lesionName ? decodeURIComponent(options.lesionName) : "";
    this.setData({ trackingId, lesionName });
  },

  pickImages() {
    wx.chooseMedia({
      count: 3 - this.data.images.length,
      mediaType: ["image"],
      sourceType: ["album", "camera"],
      success: (res) => {
        const newPaths = res.tempFiles.map((f) => f.tempFilePath);
        this.setData({ images: [...this.data.images, ...newPaths] });
      },
    });
  },

  removeImage(e) {
    const idx = e.currentTarget.dataset.idx;
    const images = [...this.data.images];
    images.splice(idx, 1);
    this.setData({ images });
  },

  onSeverity(e) {
    this.setData({ severity: e.detail.value }, () => this._refreshScore());
  },
  onRedness(e) {
    this.setData({ rednessScore: e.detail.value }, () => this._refreshScore());
  },
  onArea(e) {
    this.setData({ areaScore: e.detail.value }, () => this._refreshScore());
  },
  onNotes(e) {
    this.setData({ notes: e.detail.value });
  },

  // 把单张本地临时图上传到 /api/upload/image,返回服务器 URL
  _uploadOne(filePath) {
    const baseUrl = app.globalData.baseURL || app.globalData.baseUrl;
    const token = wx.getStorageSync("token");
    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url: `${baseUrl}/api/upload/image`,
        filePath,
        name: "file", // multer 设置:upload.single("file"),字段名必须与后端一致
        header: token ? { Authorization: `Bearer ${token}` } : {},
        success: (res) => {
          try {
            const body = JSON.parse(res.data || "{}");
            if (res.statusCode >= 200 && res.statusCode < 300 && body.success && body.data?.url) {
              resolve(body.data.url);
            } else {
              reject(new Error(body.message || "上传失败"));
            }
          } catch (e) {
            reject(new Error("响应解析失败"));
          }
        },
        fail: (err) => reject(new Error(err.errMsg || "网络错误")),
      });
    });
  },

  async submit() {
    if (this.data.submitting) return;
    if (!this.data.trackingId) {
      wx.showToast({ title: "缺少跟踪档案 ID", icon: "none" });
      return;
    }
    this.setData({ submitting: true });
    wx.showLoading({ title: "上传中...", mask: true });

    let imageUrls = [];
    try {
      // 先把所有本地临时图依次上传,失败则中止
      for (const p of this.data.images) {
        if (typeof p === "string" && /^https?:\/\//.test(p)) {
          imageUrls.push(p); // 已是远程 URL 直接用
        } else if (typeof p === "string" && p.startsWith("/images/")) {
          imageUrls.push(p); // 静态资源(seed 数据可能传)
        } else {
          const url = await this._uploadOne(p);
          imageUrls.push(url);
        }
      }
    } catch (err) {
      wx.hideLoading();
      this.setData({ submitting: false });
      wx.showToast({ title: `图片上传失败:${err.message || "未知"}`, icon: "none" });
      return;
    }

    wx.showLoading({ title: "保存中...", mask: true });

    app
      .request({
        url: `/api/tracking/${this.data.trackingId}/entry`,
        method: "POST",
        data: {
          imageList: imageUrls,
          severity: this.data.severity,
          confidence: 0,
          rednessScore: this.data.rednessScore,
          areaScore: this.data.areaScore,
          notes: this.data.notes,
        },
      })
      .then((res) => {
        wx.hideLoading();
        if (res.statusCode === 201 && res.data.success) {
          wx.showToast({ title: "已保存", icon: "success" });
          setTimeout(() => {
            wx.navigateBack({ delta: 1 });
          }, 800);
        } else {
          this.setData({ submitting: false });
          wx.showToast({ title: res.data?.message || "保存失败", icon: "none" });
        }
      })
      .catch(() => {
        wx.hideLoading();
        this.setData({ submitting: false });
        wx.showToast({ title: "网络错误", icon: "none" });
      });
  },
});
