const { fail, isBizError } = require("../utils/response");
const logger = require("../utils/logger");

// 404
function notFound(req, res) {
  return res.status(404).json(fail("请求资源不存在", 404));
}

// 错误处理
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (isBizError(err)) {
    return res.status(200).json(fail(err.message, err.code || 1, err.data));
  }
  if (err && err.name === "ValidationError") {
    return res.status(400).json(fail(err.message, 400));
  }
  if (err && err.name === "MongoServerError" && err.code === 11000) {
    return res.status(409).json(fail("数据重复冲突", 409));
  }
  logger.error(`[error] ${req.method} ${req.url} - ${err.message}\n${err.stack}`);
  return res.status(500).json(fail("服务器错误", 500));
}

module.exports = { notFound, errorHandler };
