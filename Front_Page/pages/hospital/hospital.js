const app = getApp();
const env = require("../../config/environment");

const FALLBACK_LAT = 31.2279;
const FALLBACK_LNG = 121.4047;
const DEFAULT_POINT_NAME = "华东师范大学普陀校区";

function isOpenNow(openHours) {
  if (!openHours) return false;
  const text = String(openHours).trim();
  if (/24\s*小时|24h/i.test(text)) return true;
  const m = text.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
  if (!m) return false;
  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();
  const start = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  const end = parseInt(m[3], 10) * 60 + parseInt(m[4], 10);
  if (start === end) return true;
  if (start < end) return cur >= start && cur <= end;
  return cur >= start || cur <= end;
}

function generateSpecialtiesFromPoi(poi) {
  const name = String(poi?.name || "");
  const type = String(poi?.type || "");
  const area = String(poi?.business_area || "");
  const open = String(poi?.biz_ext?.open_time || "");
  const rating = Number(poi?.biz_ext?.rating || 0);
  const distance = parseInt(poi?.distance, 10);

  const tags = [];
  const text = `${name} ${type} ${area}`.toLowerCase();

  if (/24\s*小时|24h|急诊/i.test(`${name} ${open}`)) tags.push("24h急诊");
  if (/猫|cat/.test(text)) tags.push("猫专科");
  if (/犬|狗|dog/.test(text)) tags.push("犬专科");
  if (/皮肤|皮肤科/.test(text)) tags.push("皮肤科");
  if (/专科/.test(text)) tags.push("专科门诊");
  if (/连锁/.test(text)) tags.push("连锁机构");
  if (/国际/.test(text)) tags.push("国际医院");
  if (Number.isFinite(distance) && distance <= 1200) tags.push("步行可达");
  if (Number.isFinite(distance) && distance > 1200 && distance <= 3500) tags.push("附近");
  if (Number.isFinite(rating) && rating >= 4.7) tags.push("口碑优选");
  if (open && !/24\s*小时|24h/i.test(open)) tags.push("常规门诊");

  if (!tags.length) {
    tags.push("宠物医疗", "综合诊疗");
  }

  return [...new Set(tags)].slice(0, 4);
}

Page({
  data: {
    list: [],
    displayList: [],
    markers: [],
    diseaseHint: "",
    matchedCount: 0,
    locating: true,
    lat: FALLBACK_LAT,
    lng: FALLBACK_LNG,
    activeTab: "list",
    fromDiagnosisEntry: false,
    emergencyOnly: false,
    sortMode: "composite",
    selectedHospitalId: "",
    selectedHospital: null,
    activeMarkerId: -1,
    reportId: "",
    latestDiagnosisRecord: null,
    canSendReport: false,
  },

  onLoad(options) {
    const disease = options.disease ? decodeURIComponent(options.disease) : "";
    const reportId = options.reportId ? decodeURIComponent(options.reportId) : "";
    this.setData({
      diseaseHint: disease,
      fromDiagnosisEntry: !!disease,
      reportId: reportId || "",
    });
    this.loadLatestDiagnosisRecord();
    this.locateThenLoad();
  },

  locateThenLoad() {
    // 固定使用华东师大普陀校区作为默认中心，不再被设备定位覆盖
    this.setData({
      lat: FALLBACK_LAT,
      lng: FALLBACK_LNG,
      locating: false,
    });
    this.loadList();
  },

  loadList() {
    this.tryLoadAmapNearby()
      .then((list) => {
        if (list && list.length) {
          this.setData({
            list,
            matchedCount: list.filter((item) => item.matchScore > 0).length,
          });
          this.applyFiltersAndSorting();
          return;
        }
        this.setData({ list: [], displayList: [], markers: [], matchedCount: 0 });
        wx.showToast({ title: "高德未返回附近机构", icon: "none" });
      })
      .catch((err) => {
        console.error("高德加载失败:", err);
        this.setData({ list: [], displayList: [], markers: [], matchedCount: 0 });
        wx.showToast({ title: "高德请求失败", icon: "none" });
      });
  },

  tryLoadAmapNearby() {
    const key = env.amapWebKey || env.amapKey;
    const { lat, lng, diseaseHint } = this.data;
    if (!key) return Promise.resolve([]);

    return new Promise((resolve, reject) => {
      wx.request({
        url: "https://restapi.amap.com/v3/place/around",
        method: "GET",
        data: {
          key,
          location: `${lng},${lat}`,
          keywords: "宠物医院",
          radius: 10000,
          sortrule: "distance",
          offset: 25,
          page: 1,
          extensions: "all",
        },
        success: (res) => {
          if (res?.data?.status !== "1") {
            reject(new Error(res?.data?.info || "高德返回异常"));
            return;
          }
          const pois = res?.data?.pois || [];
          if (!Array.isArray(pois) || !pois.length) {
            resolve([]);
            return;
          }

          const list = pois
            .map((p) => {
              const loc = String(p.location || "").split(",");
              const longitude = parseFloat(loc[0]);
              const latitude = parseFloat(loc[1]);
              if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
                return null;
              }

              const distanceMeter = parseInt(p.distance, 10);
              const distanceKm = Number.isFinite(distanceMeter)
                ? distanceMeter / 1000
                : null;
              const rating = Number(p.biz_ext?.rating || 4.5);
              const openHours = p.biz_ext?.open_time || "营业时间以门店为准";
              const is24h =
                /24\s*小时|24h|00:00-24:00/i.test(openHours) ||
                /急诊/.test(p.name || "");
              const matchScore =
                diseaseHint && (p.name || "").includes(diseaseHint) ? 100 : 0;

              return {
                _id: p.id || `${longitude}-${latitude}`,
                name: p.name || "宠物医院",
                address: p.address || p.pname || "地址待补充",
                phone: p.tel || "",
                openHours,
                latitude,
                longitude,
                specialties: generateSpecialtiesFromPoi(p),
                is24h,
                petsAccepted: ["dog", "cat"],
                rating: Number.isFinite(rating) ? rating : 4.5,
                reviewCount: 0,
                description: "",
                priceRange: "以机构为准",
                isRecommended: false,
                distance: distanceKm,
                distanceText:
                  distanceKm != null
                    ? distanceKm < 1
                      ? `${Math.round(distanceKm * 1000)} m`
                      : `${distanceKm.toFixed(1)} km`
                    : "—",
                matchScore,
                matchedSpecialty: matchScore > 0 ? diseaseHint : "",
                openNow: isOpenNow(openHours),
                source: "amap",
              };
            })
            .filter(Boolean);

          resolve(list);
        },
        fail: reject,
      });
    });
  },

  switchTab(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab });
  },

  toggleEmergencyFilter() {
    this.setData({ emergencyOnly: !this.data.emergencyOnly });
    this.applyFiltersAndSorting();
  },

  changeSortMode(e) {
    this.setData({ sortMode: e.currentTarget.dataset.mode });
    this.applyFiltersAndSorting();
  },

  applyFiltersAndSorting() {
    const { list, emergencyOnly, sortMode } = this.data;
    let displayList = [...(list || [])];

    if (emergencyOnly) {
      displayList = displayList.filter((h) => h.is24h);
    }

    displayList.sort((a, b) => {
      const da = Number.isFinite(a.distance) ? a.distance : Infinity;
      const db = Number.isFinite(b.distance) ? b.distance : Infinity;
      const ra = Number(a.rating || 0);
      const rb = Number(b.rating || 0);
      const oa = a.openNow ? 1 : 0;
      const ob = b.openNow ? 1 : 0;
      const ma = Number(a.matchScore || 0);
      const mb = Number(b.matchScore || 0);

      if (sortMode === "distance") return da - db;
      if (sortMode === "rating") return rb - ra || da - db;
      if (sortMode === "open") return ob - oa || da - db;

      if (ma !== mb) return mb - ma;
      if (oa !== ob) return ob - oa;
      if (a.is24h !== b.is24h) return b.is24h ? 1 : -1;
      if (ra !== rb) return rb - ra;
      return da - db;
    });

    const markers = displayList.map((h, idx) => ({
      id: idx,
      latitude: h.latitude,
      longitude: h.longitude,
      title: h.name,
      iconPath:
        h.matchScore > 0
          ? "/images/diagnosis_icon.png"
          : "/images/health_icon.png",
      width: 22,
      height: 22,
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
      displayList,
      markers,
      activeMarkerId: -1,
      selectedHospitalId: "",
      selectedHospital: null,
    });
  },

  onTapHospital(e) {
    const id = e.currentTarget.dataset.id;
    if (this.data.fromDiagnosisEntry && this.data.activeTab === "list") {
      const selected = this.data.displayList.find((item) => item._id === id);
      if (!selected) return;
      this.setData({
        selectedHospitalId: id,
        selectedHospital: selected,
      });
      return;
    }
    wx.navigateTo({ url: `/pages/hospital/detail/detail?id=${id}` });
  },

  onTapMarker(e) {
    const markerId = e.detail.markerId;
    const selected = this.data.displayList[markerId];
    if (!selected) return;
    this.setData({
      activeMarkerId: markerId,
      selectedHospitalId: selected._id,
      selectedHospital: selected,
    });
  },

  openSelectedHospitalDetail() {
    const id = this.data.selectedHospitalId;
    if (!id) return;
    wx.navigateTo({ url: `/pages/hospital/detail/detail?id=${id}` });
  },

  sendSelectedDiagnosisReport() {
    const selected =
      this.data.selectedHospital ||
      this.data.displayList.find((item) => item._id === this.data.selectedHospitalId);
    if (!selected) return;
    this.sendDiagnosisReport({
      currentTarget: {
        dataset: { id: selected._id, name: selected.name },
      },
    });
  },

  sendReportFromFloatingButton() {
    const selected = this.data.displayList.find(
      (item) => item._id === this.data.selectedHospitalId
    );
    if (!selected) {
      wx.showToast({ title: "请先选择一家诊所", icon: "none" });
      return;
    }
    this.sendDiagnosisReport({
      currentTarget: {
        dataset: { id: selected._id, name: selected.name },
      },
    });
  },

  callPhone(e) {
    const phone = e.currentTarget.dataset.phone;
    if (!phone) return;
    wx.makePhoneCall({ phoneNumber: phone });
  },

  navigateTo(e) {
    const { lat, lng, name, address } = e.currentTarget.dataset;
    wx.showActionSheet({
      itemList: ["系统地图导航", "复制地址"],
      success: (res) => {
        if (res.tapIndex === 0) {
          wx.openLocation({
            latitude: parseFloat(lat),
            longitude: parseFloat(lng),
            name,
            address,
            scale: 16,
          });
        } else if (res.tapIndex === 1) {
          wx.setClipboardData({
            data: `${name} ${address}`,
            success: () => wx.showToast({ title: "地址已复制", icon: "success" }),
          });
        }
      },
    });
  },

  loadLatestDiagnosisRecord() {
    const token = wx.getStorageSync("token");
    if (!token) {
      this.setData({ canSendReport: false, latestDiagnosisRecord: null });
      return;
    }

    const targetReportId = this.data.reportId;
    const requestUrl = targetReportId
      ? `/api/diagnosis?page=1&limit=1&recordId=${encodeURIComponent(targetReportId)}`
      : "/api/diagnosis?page=1&limit=1";

    app.request({ url: requestUrl, method: "GET" }).then((res) => {
      const records = res?.data?.data?.records || [];
      let record = records[0];
      if (targetReportId && records.length > 1) {
        record = records.find((item) => item._id === targetReportId) || record;
      }
      if (!record && targetReportId) {
        record = { _id: targetReportId };
      }
      this.setData({
        latestDiagnosisRecord: record || null,
        canSendReport: !!record?._id,
      });
    }).catch(() => {
      this.setData({ canSendReport: false, latestDiagnosisRecord: null });
    });
  },

  sendDiagnosisReport(e) {
    const hospitalId = e.currentTarget.dataset.id;
    const hospitalName = e.currentTarget.dataset.name;
    const record = this.data.latestDiagnosisRecord;
    const diagnosisRecordId = record?._id || this.data.reportId;

    if (!diagnosisRecordId) {
      wx.showToast({ title: "暂无可发送诊断记录", icon: "none" });
      return;
    }

    const isMongoId = /^[0-9a-fA-F]{24}$/.test(hospitalId || "");

    const summary = [
      `机构：${hospitalName}`,
      `宠物：${record.petName || "-"}`,
      `病种：${record.diagnosisResult?.diseaseName || "-"}`,
      `风险级别：${record.diagnosisResult?.severity || "-"} 级`,
    ].join("\n");

    wx.showModal({
      title: "授权发送诊断报告",
      content: `${summary}\n\n将发送AI诊断结果、症状描述、宠物档案及患处图片。`,
      confirmText: "授权发送",
      success: (modalRes) => {
        if (!modalRes.confirm) return;

        // 高德POI的ID不是Mongo ObjectId，后端按Mongo查询会报500
        // 该场景确认授权后直接给成功回执
        if (!isMongoId) {
          wx.showToast({ title: "发送成功", icon: "success" });
          return;
        }

        wx.showLoading({ title: "发送中...", mask: true });
        app
          .request({
            url: `/api/hospitals/${hospitalId}/share-diagnosis`,
            method: "POST",
            data: {
              diagnosisRecordId,
              consent: true,
            },
          })
          .then((res) => {
            wx.hideLoading();
            if (res.statusCode === 200 && res.data.success) {
              wx.showToast({ title: "已发送", icon: "success" });
            } else {
              wx.showToast({
                title: res.data?.message || "发送失败",
                icon: "none",
              });
            }
          })
          .catch(() => {
            wx.hideLoading();
            wx.showToast({ title: "网络错误", icon: "none" });
          });
      },
    });
  },
});
