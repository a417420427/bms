const multer = require("multer");
const path = require("path");
const fs = require("fs");
const config = require("../config");
const { BizError } = require("../utils/response");
const { saveWatermarkedPhoto, uploadToOss } = require("../utils/watermark");
const Project = require("../models/Project");

// 内存存储（用于水印处理后再写盘）
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const ok = /image\/(jpeg|png|webp|jpg)/.test(file.mimetype);
    if (!ok) return cb(new BizError("仅支持 jpg/png/webp 图片", 400));
    cb(null, true);
  },
});

const uploadVisitPhoto = upload.single("file");

// POST /api/upload/visit-photo
// 自动加水印：项目名 + 系统时间
exports.visitPhoto = (req, res, next) => {
  uploadVisitPhoto(req, res, async (err) => {
    if (err) return next(err);
    try {
      if (!req.file) throw new BizError("未上传文件", 400);

      // 获取当前项目名称（用于水印）
      const projectId = req.user.currentProject?._id || req.user.currentProject;
      let projectName = "";
      if (projectId) {
        const p = await Project.findById(projectId).lean();
        projectName = p?.name || "";
      }

      // 支持前端传 visitTime 参数（毫秒或 ISO 字符串），否则用当前时间
      const visitTime = req.body.visitTime ? new Date(req.body.visitTime) : new Date();

      const url = await saveWatermarkedPhoto(req.file.buffer, { projectName, visitTime });
      return res.json({ code: 0, message: "ok", data: { url } });
    } catch (e) {
      next(e);
    }
  });
};

// 通用文件上传（不加水印，头像等）
exports.generic = (req, res, next) => {
  const genericUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
  }).single("file");

  genericUpload(req, res, async (err) => {
    if (err) return next(err);
    if (!req.file) return next(new BizError("未上传文件", 400));

    const ext = path.extname(req.file.originalname) || ".jpg";
    const filename = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}${ext}`;

    // 0907: 优先 OSS
    const ossUrl = await uploadToOss(req.file.buffer, filename).catch(() => null);
    if (ossUrl) {
      return res.json({ code: 0, message: "ok", data: { url: ossUrl } });
    }

    // 回退本地磁盘
    const dir = path.join(__dirname, "../../", config.upload.dir);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const full = path.join(dir, filename);
    await fs.promises.writeFile(full, req.file.buffer);
    const url = `${config.upload.baseUrl}/${config.upload.dir}/${filename}`;
    return res.json({ code: 0, message: "ok", data: { url } });
  });
};

module.exports = { visitPhoto: exports.visitPhoto, generic: exports.generic };
