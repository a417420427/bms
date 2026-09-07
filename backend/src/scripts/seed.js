const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Project = require("../models/Project");
const SystemConfig = require("../models/SystemConfig");
const config = require("../config");
const logger = require("../utils/logger");
const { BCRYPT_ROUNDS } = require("../utils/constants");

// 启动时确保默认管理员存在
async function ensureDefaultAdmin() {
  const { username, password, realName, phone } = config.defaultAdmin;
  const exists = await User.findOne({ username });
  if (exists) {
    if (!exists.accessibleProjects?.length) {
      const projects = await Project.find({ status: "ACTIVE" }).select("_id").lean();
      exists.accessibleProjects = projects.map((p) => p._id);
      if (!exists.currentProject) exists.currentProject = projects[0]?._id || null;
    }
    // 0907: 确保默认管理员为系统管理员
    if (!exists.isSystemAdmin) {
      exists.isSystemAdmin = true;
    }
    await exists.save();
    return false;
  }

  // 自动创建一个示例项目
  let project = await Project.findOne({ name: "示例项目" });
  if (!project) {
    project = await Project.create({
      name: "示例项目",
      code: "DEMO",
      address: "示例地址",
      developer: "示例开发商",
      status: "ACTIVE",
    });
  }

  const user = await User.create({
    username,
    password: await bcrypt.hash(password, BCRYPT_ROUNDS),
    realName,
    phone,
    role: "ROLE_ADMIN",
    accessibleProjects: [project._id],
    currentProject: project._id,
    status: "ACTIVE",
    isSystemAdmin: true, // 0907: 默认管理员为系统管理员（唯一账号，全部权限）
  });

  // 默认全局系统配置
  await SystemConfig.findOneAndUpdate(
    { projectId: null },
    { $setOnInsert: { projectId: null } },
    { upsert: true, new: true }
  );

  logger.info(`[seed] default admin created: ${user.username} / ${password}`);
  return true;
}

// 启动时确保测试用户存在（开发环境用，方便前端切换角色测试）
const TEST_USERS = [
  { username: "sale", password: "sale", realName: "销售员", role: "ROLE_SALES", phone: "13800000001" },
  { username: "chanel", password: "chanel", realName: "渠道员", role: "ROLE_CHANNEL", phone: "13800000002" },
];

async function ensureTestUsers() {
  if (config.env !== "development") return;
  const project = await Project.findOne({ code: "DEMO" });
  if (!project) return;
  for (const item of TEST_USERS) {
    const exists = await User.findOne({ username: item.username });
    if (exists) continue;
    await User.create({
      ...item,
      password: await bcrypt.hash(item.password, BCRYPT_ROUNDS),
      accessibleProjects: [project._id],
      currentProject: project._id,
      status: "ACTIVE",
    });
    logger.info(`[seed] test user created: ${item.username} / ${item.password} (${item.role})`);
  }
}

module.exports = { ensureDefaultAdmin, ensureTestUsers };
