const app = getApp();

Page({
  data: {
    loading: true,
    pet: null,
    radar: [],
    overall: 0,
    overallLabel: "",
    topRisk: null,
    season: "",
    advice: [],
    radarSvg: "",
    historyCount: 0,
  },

  onLoad(options) {
    let petId = options.petId;
    if (!petId) {
      const list = wx.getStorageSync("petList") || [];
      if (list.length > 0) petId = list[0].id || list[0]._id;
    }
    if (!petId) {
      wx.showToast({ title: "请先添加宠物", icon: "none" });
      this.setData({ loading: false });
      return;
    }
    this.loadRisk(petId);
  },

  loadRisk(petId) {
    app
      .request({ url: `/api/risk/${petId}`, method: "GET" })
      .then((res) => {
        if (res.statusCode === 200 && res.data.success) {
          const d = res.data.data;
          this.setData({
            loading: false,
            pet: d.pet,
            radar: d.radar,
            overall: d.overall,
            overallLabel: d.overallLabel,
            topRisk: d.topRisk,
            season: d.season,
            advice: d.advice,
            historyCount: d.historyCount,
            radarSvg: this.buildRadarSvg(d.radar),
          });
        } else {
          wx.showToast({ title: res.data?.message || "加载失败", icon: "none" });
          this.setData({ loading: false });
        }
      })
      .catch((err) => {
        console.error("loadRisk 失败:", err);
        wx.showToast({ title: "网络错误", icon: "none" });
        this.setData({ loading: false });
      });
  },

  /**
   * 5 维风险雷达图。SVG 等比缩放,跟随页面滚动正常。
   */
  buildRadarSvg(radar) {
    if (!radar || radar.length < 3) return "";
    const W = 600,
      H = 540;
    const cx = W / 2;
    const cy = H / 2 - 10;
    const radius = 200;
    const n = radar.length;

    // 每个轴的角度(从顶上开始,顺时针)
    const angles = radar.map((_, i) => -Math.PI / 2 + (2 * Math.PI * i) / n);

    // 4 层网格 + 5 个顶点
    let grid = "";
    [0.25, 0.5, 0.75, 1].forEach((p) => {
      const pts = angles
        .map((a) => `${cx + Math.cos(a) * radius * p},${cy + Math.sin(a) * radius * p}`)
        .join(" ");
      grid += `<polygon points="${pts}" fill="none" stroke="rgba(74,144,184,0.18)" stroke-width="1"/>`;
    });

    // 5 条轴
    let axes = "";
    angles.forEach((a) => {
      const x = cx + Math.cos(a) * radius;
      const y = cy + Math.sin(a) * radius;
      axes += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="rgba(74,144,184,0.22)" stroke-width="1"/>`;
    });

    // 数据多边形
    const dataPts = angles
      .map((a, i) => {
        const r = (radar[i].value / 100) * radius;
        return `${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`;
      })
      .join(" ");
    const dataPoly = `<polygon points="${dataPts}" fill="rgba(238,108,77,0.32)" stroke="#ee6c4d" stroke-width="2.5" stroke-linejoin="round"/>`;

    // 数据点
    const dots = angles
      .map((a, i) => {
        const r = (radar[i].value / 100) * radius;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        return `<circle cx="${x}" cy="${y}" r="6" fill="#fff"/><circle cx="${x}" cy="${y}" r="3.5" fill="#ee6c4d"/>`;
      })
      .join("");

    // 轴标签
    let labels = "";
    angles.forEach((a, i) => {
      const lr = radius + 32;
      const x = cx + Math.cos(a) * lr;
      const y = cy + Math.sin(a) * lr;
      const anchor =
        Math.abs(Math.cos(a)) < 0.2 ? "middle" : Math.cos(a) > 0 ? "start" : "end";
      labels += `
        <text x="${x}" y="${y}" text-anchor="${anchor}" dominant-baseline="middle"
              font-size="16" font-weight="700" fill="#2c5f7c" font-family="-apple-system,sans-serif">${radar[i].label}</text>
        <text x="${x}" y="${y + 18}" text-anchor="${anchor}" dominant-baseline="middle"
              font-size="14" font-weight="700" fill="#ee6c4d" font-family="-apple-system,sans-serif">${radar[i].value}</text>`;
    });

    // 中心总分
    const center = "";

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
      ${grid}
      ${axes}
      ${dataPoly}
      ${dots}
      ${labels}
      ${center}
    </svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  },
});
