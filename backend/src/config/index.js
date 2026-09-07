require("dotenv").config();

const config = {
  env: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT, 10) || 3000,
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/bms",
  jwt: {
    secret: process.env.JWT_SECRET || "dev-secret-change-me",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },
  upload: {
    dir: process.env.UPLOAD_DIR || "uploads",
    baseUrl: process.env.UPLOAD_BASE_URL || "http://localhost:3000",
  },
  wechat: {
    appid: process.env.WX_APPID || "",
    secret: process.env.WX_SECRET || "",
  },
  defaultAdmin: {
    username: process.env.DEFAULT_ADMIN_USERNAME || "admin",
    password: process.env.DEFAULT_ADMIN_PASSWORD || "admin123",
    realName: process.env.DEFAULT_ADMIN_REALNAME || "系统管理员",
    phone: process.env.DEFAULT_ADMIN_PHONE || "13800000000",
  },
  // 业务默认参数（与 SystemConfig 模型保持一致）
  business: {
    visitCountdownHours: 4,        // 到访/推荐时间最大偏移小时
    followupReminderDays: 30,     // 无跟进预警天数
    publicPoolRetentionDays: 30,  // 无跟进自动入公共池
    expiredPoolRetentionDays: 7,  // 过期池保留天数
    duplicateWindowHours: 24,     // 渠道24h到访倒计时
  },
};

module.exports = config;
