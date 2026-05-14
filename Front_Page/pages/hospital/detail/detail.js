const app = getApp();

Page({
  data: { hospital: null, loading: true, markers: [] },

  onLoad(options) {
    const id = options.id;
    if (!id) {
      wx.showToast({ title: "缺少医院 ID", icon: "none" });
      return;
    }
    app
      .request({ url: `/api/hospitals/${id}`, method: "GET" })
      .then((res) => {
        if (res.statusCode === 200 && res.data.success) {
          const h = res.data.data;
          this.setData({
            hospital: h,
            loading: false,
            markers: [
              {
                id: 1,
                latitude: h.latitude,
                longitude: h.longitude,
                title: h.name,
                width: 32,
                height: 32,
                callout: {
                  content: h.name,
                  color: "#2c5f7c",
                  fontSize: 12,
                  padding: 6,
                  borderRadius: 8,
                  bgColor: "#ffffff",
                  display: "ALWAYS",
                },
              },
            ],
          });
        } else {
          wx.showToast({ title: "加载失败", icon: "none" });
          this.setData({ loading: false });
        }
      })
      .catch(() => {
        wx.showToast({ title: "网络错误", icon: "none" });
        this.setData({ loading: false });
      });
  },

  callPhone() {
    const phone = this.data.hospital?.phone;
    if (phone) wx.makePhoneCall({ phoneNumber: phone });
  },
  navigateTo() {
    const h = this.data.hospital;
    if (!h) return;
    wx.openLocation({
      latitude: h.latitude,
      longitude: h.longitude,
      name: h.name,
      address: h.address,
      scale: 16,
    });
  },
});
