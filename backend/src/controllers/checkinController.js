const CheckIn = require("../models/CheckIn");
const { BizError } = require("../utils/response");
const { writeAudit } = require("../utils/audit");
const { AUDIT_ACTION } = require("../utils/constants");
const { haversineDistance, todayDateCN } = require("../utils/geo");
const { parsePaging } = require("../utils/validators");

// POST /api/checkin
// 入参: { latitude, longitude, remark }
exports.create = async (req, res) => {
  const { latitude, longitude, remark } = req.body || {};
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    throw new BizError("latitude/longitude 必填且为数字", 400);
  }

  const { projectId, project } = req.projectContext;
  const loc = project && project.checkinLocation;
  // 兜底：projectContext 未注入 project 对象时查 DB
  let centerLat, centerLng, radius;
  if (loc && typeof loc.latitude === "number") {
    centerLat = loc.latitude;
    centerLng = loc.longitude;
    radius = loc.radius || 500;
  } else {
    const Project = require("../models/Project");
    const p = await Project.findById(projectId).lean();
    if (!p || !p.checkinLocation || typeof p.checkinLocation.latitude !== "number") {
      throw new BizError("项目未配置打卡位置，请联系管理员", 400);
    }
    centerLat = p.checkinLocation.latitude;
    centerLng = p.checkinLocation.longitude;
    radius = p.checkinLocation.radius || 500;
  }

  const distance = haversineDistance(latitude, longitude, centerLat, centerLng);
  const status = distance <= radius ? "IN_RANGE" : "OUT_OF_RANGE";

  const checkinDate = todayDateCN();
  // 查今日是否已打卡
  const exists = await CheckIn.findOne({ userId: req.user._id, projectId, checkinDate });
  if (exists) throw new BizError("今日已打卡", 400);

  const record = await CheckIn.create({
    userId: req.user._id,
    projectId,
    latitude,
    longitude,
    distance,
    radius,
    status,
    remark,
    checkinDate,
  });

  await writeAudit({
    operator: req.user._id,
    operatorName: req.user.realName || req.user.username,
    action: AUDIT_ACTION.CHECKIN_CREATE,
    module: "CHECKIN",
    target: req.user.realName || req.user.username,
    projectId,
    detail: { checkinId: record._id, distance, status },
    ip: req.ip,
  });

  return { data: { distance, status, radius, checkinTime: record.createdAt, id: record._id } };
};

// GET /api/checkin/today
exports.today = async (req, res) => {
  const { projectId } = req.projectContext;
  const checkinDate = todayDateCN();
  const record = await CheckIn.findOne({ userId: req.user._id, projectId, checkinDate }).lean();
  return { data: record };
};

// GET /api/checkin/records
exports.list = async (req, res) => {
  const { projectId } = req.projectContext;
  const { page, pageSize, skip } = parsePaging(req.query);
  const filter = { userId: req.user._id, projectId };

  const [list, total] = await Promise.all([
    CheckIn.find(filter).sort({ createdAt: -1 }).skip(skip).limit(pageSize).lean(),
    CheckIn.countDocuments(filter),
  ]);

  return { data: { list, total, page, pageSize } };
};
