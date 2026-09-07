const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const fs = require("fs");
const config = require("./config");
const logger = require("./utils/logger");
const { notFound, errorHandler } = require("./middleware/errorHandler");
const { ensureDefaultAdmin, ensureTestUsers } = require("./scripts/seed");
const jobs = require("./jobs");

async function start() {
  // 确保上传目录存在
  const uploadDir = path.join(__dirname, "../", config.upload.dir);
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  // 确保日志目录存在
  const logDir = path.join(__dirname, "../logs");
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

  // 连接数据库
  const connectDB = require("./config/db");
  await connectDB();

  // 初始化默认管理员
  try {
    await ensureDefaultAdmin();
    await ensureTestUsers();
  } catch (e) {
    logger.warn(`[seed] init skipped: ${e.message}`);
  }

  // 启动定时任务
  jobs.start();

  // 创建 Express 应用
  const app = express();
  // nginx 反向代理后必须开 trust proxy，否则 express-rate-limit 抛 ERR_ERL_UNEXPECTED_X_FORWARDED_FOR
  app.set("trust proxy", 1);
  app.use(cors());
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan(config.env === "production" ? "combined" : "dev"));

  // 静态文件：访问上传的图片
  app.use(`/${config.upload.dir}`, express.static(uploadDir));

  // 健康检查
  app.get("/api/health", (req, res) => res.json({ code: 0, message: "ok", data: { ts: Date.now() } }));

  // 业务路由
  app.use("/api", require("./routes"));

  // 404 + 错误处理
  app.use(notFound);
  app.use(errorHandler);

  app.listen(config.port, () => {
    logger.info(`[server] listening on http://localhost:${config.port} (${config.env})`);
  });

  // 全局异常兜底
  process.on("unhandledRejection", (reason) => {
    logger.error(`[unhandledRejection] ${reason}`);
  });
  process.on("uncaughtException", (err) => {
    logger.error(`[uncaughtException] ${err.message}\n${err.stack}`);
  });
}

start().catch((err) => {
  console.error("启动失败:", err);
  process.exit(1);
});
