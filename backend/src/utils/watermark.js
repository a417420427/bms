const sharp = require("sharp");
const path = require("path");
const fs = require("fs");
const config = require("../config");
const logger = require("./logger");

// 把 SVG 文字渲染到图片右下角作为水印：项目名 + 系统时间
async function addWatermark(inputBuffer, { projectName = "", visitTime = new Date() } = {}) {
  const ts = new Date(visitTime).toLocaleString("zh-CN", { hour12: false });
  const text = `${projectName || ""} ${ts}`.trim();

  // 使用 SVG 文本（sharp 内置 SVG 解析，避免依赖额外字体工具）
  const svg = Buffer.from(
    `<svg width="800" height="60" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="800" height="60" fill="rgba(0,0,0,0.35)" />
      <text x="10" y="38" font-family="sans-serif" font-size="28" fill="#fff">${escapeXml(text)}</text>
    </svg>`
  );

  try {
    const overlay = await sharp(svg).png().toBuffer();
    return await sharp(inputBuffer)
      .composite([{ input: overlay, gravity: "southeast" }])
      .jpeg({ quality: 85 })
      .toBuffer();
  } catch (e) {
    logger.error(`[watermark] failed: ${e.message}`);
    return inputBuffer; // 失败时返回原图
  }
}

function escapeXml(s) {
  return String(s).replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case "'": return "&apos;";
      case '"': return "&quot;";
      default: return c;
    }
  });
}

// 保存带水印的图片到 uploads 目录，返回可访问 URL
async function saveWatermarkedPhoto(buffer, { projectName = "", visitTime = new Date() } = {}) {
  const watermarked = await addWatermark(buffer, { projectName, visitTime });

  const dir = path.join(__dirname, "../../", config.upload.dir);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const filename = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}.jpg`;
  const full = path.join(dir, filename);
  await fs.promises.writeFile(full, watermarked);

  return `${config.upload.baseUrl}/${config.upload.dir}/${filename}`;
}

module.exports = { addWatermark, saveWatermarkedPhoto };
