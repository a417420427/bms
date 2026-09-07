// 简单校验工具

// 11位中国大陆手机号
function isValidPhone(phone) {
  return /^1[3-9]\d{9}$/.test(String(phone || ""));
}

// 前三后四脱敏：138****1234
function maskPhone(phone) {
  if (!phone || phone.length < 7) return phone;
  return phone.slice(0, 3) + "****" + phone.slice(-4);
}

// 校验到访/推荐时间偏移：不能晚于当前时间 offset 小时以上
function isWithinOffset(inputTime, offsetHours) {
  const now = Date.now();
  const t = new Date(inputTime).getTime();
  if (Number.isNaN(t)) {
    const { BizError } = require("./response");
    throw new BizError("时间格式无效", 400);
  }
  // 不能晚于未来 offset 小时
  if (t - now > offsetHours * 3600 * 1000) return false;
  return true;
}

// 分页参数解析
function parsePaging(query, { maxPageSize = 100, defaultPageSize = 20 } = {}) {
  let page = parseInt(query.page, 10);
  let pageSize = parseInt(query.pageSize, 10);
  if (!Number.isFinite(page) || page < 1) page = 1;
  if (!Number.isFinite(pageSize) || pageSize < 1) pageSize = defaultPageSize;
  if (pageSize > maxPageSize) pageSize = maxPageSize;
  return { page, pageSize, skip: (page - 1) * pageSize };
}

module.exports = { isValidPhone, maskPhone, isWithinOffset, parsePaging };
