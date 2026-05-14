const app = getApp();

const FALLBACK_LAT = 30.65;
const FALLBACK_LNG = 104.07;

Page({
  data: {
    list: [],
    markers: [],
    diseaseHint: "",
    matchedCount: 0,
    locating: true,
    lat: FALLBACK_LAT,
    lng: FALLBACK_LNG,
    activeTab: "list", // list | map
  },

  onLoad(options) {
    const disease = options.disease ? decodeURIComponent(options.disease) : "";
    this.setData({ diseaseHint: disease });
    this.locateThenLoad();
  },

  locateThenLoad() {
    // demo:不强制申请定位,直接用成都中心点。这样在模拟器/无定位时也能展示
    this.setData({
      lat: FALLBACK_LAT,
      lng: FALLBACK_LNG,
      locating: false,
    });
    this.loadList();
  },

  loadList() {
    const { lat, lng, diseaseHint } = this.data;
    const params = `lat=${lat}&lng=${lng}${diseaseHint ? `&disease=${encodeURIComponent(diseaseHint)}` : ""}`;
    app
      .request({ url: `/api/hospitals?${params}`, method: "GET" })
      .then((res) => {
        if (res.statusCode === 200 && res.data.success) {
          const list = res.data.data || [];
          const markers = list.map((h, idx) => ({
            id: idx,
            latitude: h.latitude,
            longitude: h.longitude,
            title: h.name,
            iconPath:
              h.matchScore > 0
                ? "/images/diagnosis_icon.png"
                : "/images/health_icon.png",
            width: 32,
            height: 32,
            callout: {
              content: h.name,
              color: "#2c5f7c",
              fontSize: 12,
              padding: 6,
              borderRadius: 8,
              bgColor: "#ffffff",
              display: "BYCLICK",
            },
          }));
          this.setData({
            list,
            markers,
            matchedCount: res.data.meta?.recommendedCount || 0,
          });
        }
      })
      .catch((err) => {
        console.error("加载医院失败:", err);
        wx.showToast({ title: "加载失败", icon: "none" });
      });
  },

  switchTab(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab });
  },

  onTapHospital(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/hospital/detail/detail?id=${id}` });
  },

  callPhone(e) {
    const phone = e.currentTarget.dataset.phone;
    if (!phone) return;
    wx.makePhoneCall({ phoneNumber: phone });
  },

  navigateTo(e) {
    const { lat, lng, name, address } = e.currentTarget.dataset;
    wx.openLocation({
      latitude: parseFloat(lat),
      longitude: parseFloat(lng),
      name,
      address,
      scale: 16,
    });
  },
});
