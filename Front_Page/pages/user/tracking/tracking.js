const app = getApp();

Page({
  data: {
    list: [],
    loading: true,
    empty: false,
  },

  onShow() {
    this.loadList();
  },

  loadList() {
    const token = wx.getStorageSync("token");
    if (!token) {
      wx.showToast({ title: "请先登录", icon: "none" });
      this.setData({ loading: false, empty: true });
      return;
    }
    this.setData({ loading: true });
    app
      .request({ url: "/api/tracking", method: "GET" })
      .then((res) => {
        if (res.statusCode === 200 && res.data.success) {
          const list = (res.data.data || []).map((doc) => {
            const a = doc.analysis || {};
            return {
              ...doc,
              currentScore: a.currentScore || 0,
              trend: a.trend || "暂无数据",
              trendType: a.trendType || "stable",
              trendIcon: a.trendIcon || "→",
              daysToHeal: a.daysToHeal,
              entryCount: doc.entries ? doc.entries.length : 0,
              latestImage:
                doc.latestEntry && doc.latestEntry.imageList && doc.latestEntry.imageList[0]
                  ? doc.latestEntry.imageList[0]
                  : "/images/default_pet.png",
            };
          });
          this.setData({ list, loading: false, empty: list.length === 0 });
        } else {
          this.setData({ loading: false, empty: true });
        }
      })
      .catch(() => {
        this.setData({ loading: false, empty: true });
        wx.showToast({ title: "加载失败", icon: "none" });
      });
  },

  onTapItem(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/user/tracking/detail/detail?id=${id}` });
  },

  goNewEntry() {
    const list = this.data.list;
    if (!list || list.length === 0) {
      wx.showToast({ title: "请先在诊断结果页创建档案", icon: "none" });
      return;
    }
    const t = list[0];
    wx.navigateTo({
      url: `/pages/user/tracking/new-entry/new-entry?trackingId=${t._id}&lesionName=${encodeURIComponent(t.lesionName)}`,
    });
  },

  goBack() {
    wx.navigateBack({ delta: 1 });
  },
});
