const app = getApp();

Page({
  data: {
    trackingId: "",
    tracking: null,
    analysis: null,
    entries: [],
    loading: true,
    chartSrc: "",
  },

  onLoad(options) {
    this.setData({ trackingId: options.id || "" });
    this.loadDetail();
  },

  onShow() {
    if (this.data.trackingId) this.loadDetail();
  },

  loadDetail() {
    const { trackingId } = this.data;
    if (!trackingId) return;
    app
      .request({ url: `/api/tracking/${trackingId}`, method: "GET" })
      .then((res) => {
        if (res.statusCode === 200 && res.data.success) {
          const data = res.data.data;
          const entries = (data.entries || []).map((e, idx) => ({
            ...e,
            dayLabel: `第 ${idx + 1} 次`,
            dateLabel: this.formatDate(e.recordedAt),
          }));
          this.setData({
            tracking: data,
            entries,
            analysis: data.analysis,
            loading: false,
            chartSrc: this.buildChartSvgUrl(entries),
          });
        } else {
          this.setData({ loading: false });
          wx.showToast({ title: "加载失败", icon: "none" });
        }
      })
      .catch((err) => {
        console.error("loadDetail 失败:", err);
        this.setData({ loading: false });
        wx.showToast({ title: "网络错误", icon: "none" });
      });
  },

  formatDate(iso) {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  },

  /**
   * 用 SVG 生成愈合曲线,返回 data:image/svg+xml URL。
   * 比 canvas 更稳——SVG 作为普通 image 元素跟随 scroll-view 自然滚动,
   * 不会出现 WebView 模式下原生 canvas 不跟滚的问题。
   */
  buildChartSvgUrl(entries) {
    if (!entries || entries.length === 0) return "";

    const W = 600,
      H = 360;
    const padL = 44,
      padR = 24,
      padT = 24,
      padB = 36;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;

    const pts = entries.map((e, i) => {
      const x = padL + (chartW * i) / Math.max(1, entries.length - 1);
      const y = padT + chartH - (chartH * e.healingScore) / 100;
      return { x, y, score: e.healingScore, label: e.dateLabel };
    });

    // 平滑曲线用 cubic Bézier,控制点取相邻点的中点 x
    let linePath = `M ${pts[0].x} ${pts[0].y}`;
    let areaPath = `M ${pts[0].x} ${padT + chartH} L ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i],
        p1 = pts[i + 1];
      const cpx = (p0.x + p1.x) / 2;
      linePath += ` C ${cpx} ${p0.y}, ${cpx} ${p1.y}, ${p1.x} ${p1.y}`;
      areaPath += ` C ${cpx} ${p0.y}, ${cpx} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    areaPath += ` L ${pts[pts.length - 1].x} ${padT + chartH} Z`;

    // 5 条横向网格 + Y 轴标签
    const gridLines = [0, 25, 50, 75, 100]
      .map((v) => {
        const y = padT + chartH - (chartH * v) / 100;
        return `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="rgba(165,215,232,0.4)" stroke-width="1" stroke-dasharray="3,3"/>
                <text x="${padL - 8}" y="${y + 4}" text-anchor="end" font-size="11" fill="#9aa6b2" font-family="-apple-system, sans-serif">${v}</text>`;
      })
      .join("");

    // 数据点
    const circles = pts
      .map((p, i) => {
        const isLast = i === pts.length - 1;
        const ro = isLast ? 8 : 6;
        const ri = isLast ? 4.5 : 3.5;
        const fill = isLast ? "#ee6c4d" : "#4a90b8";
        return `<circle cx="${p.x}" cy="${p.y}" r="${ro}" fill="#fff"/>
                <circle cx="${p.x}" cy="${p.y}" r="${ri}" fill="${fill}"/>`;
      })
      .join("");

    // 当前点分数气泡
    const last = pts[pts.length - 1];
    const bubbleW = 44,
      bubbleH = 22;
    const bx = Math.max(padL, Math.min(W - padR - bubbleW, last.x - bubbleW / 2));
    const by = Math.max(2, last.y - bubbleH - 12);
    const bubble = `
      <rect x="${bx}" y="${by}" rx="6" ry="6" width="${bubbleW}" height="${bubbleH}" fill="#2c5f7c"/>
      <text x="${bx + bubbleW / 2}" y="${by + bubbleH / 2 + 4}" text-anchor="middle"
            font-size="13" fill="#fff" font-weight="700" font-family="-apple-system, sans-serif">${last.score}</text>`;

    // X 轴时间标签:只显示首/中/尾,防止拥挤
    const xLabelIdx = new Set([0, Math.floor(pts.length / 2), pts.length - 1]);
    const xLabels = pts
      .map((p, i) =>
        xLabelIdx.has(i)
          ? `<text x="${p.x}" y="${padT + chartH + 18}" text-anchor="middle" font-size="11" fill="#9aa6b2" font-family="-apple-system, sans-serif">${p.label}</text>`
          : ""
      )
      .join("");

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(74,144,184,0.45)"/>
          <stop offset="100%" stop-color="rgba(165,215,232,0.05)"/>
        </linearGradient>
      </defs>
      ${gridLines}
      <path d="${areaPath}" fill="url(#areaGrad)"/>
      <path d="${linePath}" stroke="#2c5f7c" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      ${circles}
      ${bubble}
      ${xLabels}
    </svg>`;

    // 用 URL encode 而非 base64,避免依赖 btoa
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  },

  goAdd() {
    const { tracking } = this.data;
    if (!tracking) return;
    wx.navigateTo({
      url: `/pages/user/tracking/new-entry/new-entry?trackingId=${tracking._id}&lesionName=${encodeURIComponent(tracking.lesionName)}`,
    });
  },

  previewImage(e) {
    const url = e.currentTarget.dataset.url;
    if (!url) return;
    wx.previewImage({ current: url, urls: [url] });
  },
});
