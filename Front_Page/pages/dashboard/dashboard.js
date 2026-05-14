const app = getApp();

const COLORS = ["#4a90b8", "#ee6c4d", "#5dd39e", "#f0a868", "#a8e6cf", "#ffb3c1"];

Page({
  data: {
    loading: true,
    cards: {},
    diseaseSvg: "",
    trendSvg: "",
    diseaseList: [],
    trackingStats: {},
    cityCoverage: [],
    recommendedHospitals: 0,
    generatedAt: "",
  },

  onLoad() {
    this.loadStats();
  },

  loadStats() {
    app
      .request({ url: "/api/dashboard/stats", method: "GET" })
      .then((res) => {
        if (res.statusCode === 200 && res.data.success) {
          const d = res.data.data;
          this.setData({
            loading: false,
            cards: d.cards,
            diseaseSvg: this.buildDiseaseSvg(d.diseaseDistribution),
            trendSvg: this.buildTrendSvg(d.dailyDiagnoses),
            diseaseList: d.diseaseDistribution,
            trackingStats: d.trackingStats,
            cityCoverage: d.cityCoverage,
            recommendedHospitals: d.recommendedHospitals,
            generatedAt: this.fmtTime(d.generatedAt),
          });
        }
      })
      .catch((err) => {
        console.error("load dashboard 失败:", err);
        wx.showToast({ title: "加载失败", icon: "none" });
        this.setData({ loading: false });
      });
  },

  fmtTime(iso) {
    const d = new Date(iso);
    const pad = (n) => (n < 10 ? "0" + n : n);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  },

  // 病种分布:横向柱状图
  buildDiseaseSvg(list) {
    if (!list || list.length === 0) return "";
    const W = 600,
      barH = 36,
      gap = 14;
    const labelW = 130;
    const valueW = 50;
    const maxBar = W - labelW - valueW - 10;
    const max = Math.max(...list.map((x) => x.count));
    const H = list.length * (barH + gap) + 10;

    let bars = "";
    list.forEach((it, idx) => {
      const y = idx * (barH + gap) + 4;
      const w = (it.count / max) * maxBar;
      const c = COLORS[idx % COLORS.length];
      bars += `
        <text x="0" y="${y + barH / 2 + 5}" font-size="14" fill="#1f2d3a" font-weight="600" font-family="-apple-system,sans-serif">${it.name}</text>
        <rect x="${labelW}" y="${y + 4}" width="${maxBar}" height="${barH - 8}" rx="${(barH - 8) / 2}" fill="rgba(165,215,232,0.18)"/>
        <rect x="${labelW}" y="${y + 4}" width="${w}" height="${barH - 8}" rx="${(barH - 8) / 2}" fill="${c}"/>
        <text x="${labelW + w + 8}" y="${y + barH / 2 + 5}" font-size="14" font-weight="700" fill="${c}" font-family="-apple-system,sans-serif">${it.count}</text>
      `;
    });
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${bars}</svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  },

  // 7 天诊断趋势:折线 + 面积
  buildTrendSvg(daily) {
    if (!daily || daily.length === 0) return "";
    const W = 600,
      H = 280;
    const padL = 40,
      padR = 20,
      padT = 20,
      padB = 32;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;
    const max = Math.max(...daily.map((d) => d.count), 1);

    const pts = daily.map((d, i) => {
      const x = padL + (chartW * i) / Math.max(1, daily.length - 1);
      const y = padT + chartH - (chartH * d.count) / max;
      const label = d.date.slice(5); // MM-DD
      return { x, y, count: d.count, label };
    });

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

    // y 网格 4 条
    const gridLines = [0, 0.25, 0.5, 0.75, 1]
      .map((p) => {
        const y = padT + chartH - p * chartH;
        const v = Math.round(p * max);
        return `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="rgba(165,215,232,0.35)" stroke-dasharray="3,3"/>
                <text x="${padL - 6}" y="${y + 4}" text-anchor="end" font-size="11" fill="#9aa6b2" font-family="-apple-system,sans-serif">${v}</text>`;
      })
      .join("");

    const dots = pts
      .map((p, i) => {
        const isLast = i === pts.length - 1;
        return `<circle cx="${p.x}" cy="${p.y}" r="${isLast ? 7 : 5}" fill="#fff"/>
                <circle cx="${p.x}" cy="${p.y}" r="${isLast ? 4 : 3}" fill="${isLast ? "#ee6c4d" : "#4a90b8"}"/>
                <text x="${p.x}" y="${p.y - 12}" text-anchor="middle" font-size="11" font-weight="700" fill="#2c5f7c" font-family="-apple-system,sans-serif">${p.count}</text>`;
      })
      .join("");

    const xLabels = pts
      .map(
        (p) =>
          `<text x="${p.x}" y="${padT + chartH + 18}" text-anchor="middle" font-size="11" fill="#9aa6b2" font-family="-apple-system,sans-serif">${p.label}</text>`
      )
      .join("");

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="aGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(74,144,184,0.45)"/>
          <stop offset="100%" stop-color="rgba(165,215,232,0.05)"/>
        </linearGradient>
      </defs>
      ${gridLines}
      <path d="${areaPath}" fill="url(#aGrad)"/>
      <path d="${linePath}" stroke="#2c5f7c" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      ${dots}
      ${xLabels}
    </svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  },
});
