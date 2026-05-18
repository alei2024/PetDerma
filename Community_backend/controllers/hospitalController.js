const Hospital = require("../models/Hospital");
const DiagnosisRecord = require("../models/DiagnosisRecord");

// 球面距离(单位:公里)
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// GET /api/hospitals?lat=&lng=&disease=
exports.listHospitals = async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const disease = (req.query.disease || "").trim();

    const all = await Hospital.find({}).lean();

    let withDistance = all.map((h) => {
      const distance =
        Number.isFinite(lat) && Number.isFinite(lng)
          ? haversine(lat, lng, h.latitude, h.longitude)
          : null;
      const matchScore = disease
        ? h.specialties.some((s) => s.includes(disease) || disease.includes(s))
          ? 100
          : 0
        : 0;
      return {
        ...h,
        distance,
        distanceText:
          distance != null
            ? distance < 1
              ? `${Math.round(distance * 1000)} m`
              : `${distance.toFixed(1)} km`
            : "—",
        matchScore,
        matchedSpecialty:
          disease &&
          h.specialties.find(
            (s) => s.includes(disease) || disease.includes(s)
          ),
      };
    });

    // 排序:有诊断时优先专长匹配,然后按距离;无诊断按距离/推荐
    withDistance.sort((a, b) => {
      if (a.matchScore !== b.matchScore) return b.matchScore - a.matchScore;
      if (a.isRecommended !== b.isRecommended)
        return b.isRecommended ? 1 : -1;
      const da = a.distance != null ? a.distance : Infinity;
      const db = b.distance != null ? b.distance : Infinity;
      return da - db;
    });

    res.json({
      success: true,
      data: withDistance,
      meta: {
        total: withDistance.length,
        recommendedCount: withDistance.filter((x) => x.matchScore > 0).length,
        disease: disease || null,
      },
    });
  } catch (err) {
    console.error("listHospitals 失败:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/hospitals/:id
exports.getHospital = async (req, res) => {
  try {
    const h = await Hospital.findById(req.params.id).lean();
    if (!h) return res.status(404).json({ success: false, message: "医院不存在" });
    res.json({ success: true, data: h });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 转义正则元字符,避免用户输入 [、(、+ 等导致 mongo 抛错或被当成模式利用
function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// GET /api/hospitals/recommend?disease=xxx&limit=3
exports.recommendHospitals = async (req, res) => {
  try {
    const disease = (req.query.disease || "").trim();
    const limit = Math.min(parseInt(req.query.limit, 10) || 3, 20);
    if (!disease)
      return res.json({ success: true, data: [], meta: { disease: null } });

    const safe = escapeRegex(disease);
    const matches = await Hospital.find({
      specialties: { $elemMatch: { $regex: safe, $options: "i" } },
    })
      .sort({ isRecommended: -1, rating: -1 })
      .limit(limit)
      .lean();

    res.json({
      success: true,
      data: matches,
      meta: { disease, count: matches.length },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

function isOpenNowFromText(openHours) {
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

// POST /api/hospitals/:id/share-diagnosis
exports.shareDiagnosisReport = async (req, res) => {
  try {
    const hospitalId = req.params.id;
    const userId = req.user?.userId;
    const { diagnosisRecordId, consent } = req.body || {};

    if (!consent) {
      return res.status(400).json({
        success: false,
        message: "请先授权发送诊断报告",
      });
    }

    const hospital = await Hospital.findById(hospitalId).lean();
    if (!hospital) {
      return res.status(404).json({ success: false, message: "医院不存在" });
    }

    let record;
    if (diagnosisRecordId) {
      record = await DiagnosisRecord.findOne({
        _id: diagnosisRecordId,
        userId,
        status: "active",
      })
        .populate("images")
        .lean();
    } else {
      record = await DiagnosisRecord.findOne({
        userId,
        status: "active",
      })
        .sort({ createdAt: -1 })
        .populate("images")
        .lean();
    }

    if (!record) {
      return res.status(400).json({
        success: false,
        message: "未找到可发送的诊断记录，请先完成并保存一次诊断",
      });
    }

    const material = {
      hospital: {
        id: hospital._id,
        name: hospital.name,
        address: hospital.address,
        is24h: hospital.is24h,
        openNow: isOpenNowFromText(hospital.openHours),
      },
      diagnosis: {
        recordId: record._id,
        diseaseName: record.diagnosisResult?.diseaseName || "未知疾病",
        confidence: record.diagnosisResult?.confidence || 0,
        severity: record.diagnosisResult?.severity || 1,
        symptomDescription: record.symptomDescription || "",
        warning: record.diagnosisResult?.warning || "",
        suggestions: record.diagnosisResult?.suggestions || {},
      },
      pet: {
        petId: record.petId,
        petName: record.petName,
        petType: record.petType,
      },
      images: (record.images || []).map((img) => ({
        id: img?._id,
        url: img?.url || "",
      })),
      sharedAt: new Date().toISOString(),
      deliveryStatus: "accepted",
      deliveryChannel: "PetDerma-Hospital-Referral",
    };

    return res.status(200).json({
      success: true,
      message: "诊断报告已发送给该机构",
      data: material,
    });
  } catch (err) {
    console.error("shareDiagnosisReport 失败:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
