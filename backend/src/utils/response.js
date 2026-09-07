// 统一响应封装：{ code, message, data }
// 业务约定：code = 0 表示成功，非 0 表示业务错误

function success(data = null, message = "ok") {
  return { code: 0, message, data };
}

function fail(message = "请求失败", code = 1, data = null) {
  return { code, message, data };
}

// Express 中间件：把 Controller 返回的 { data, message } 包装成统一格式
function wrap(handler) {
  return async (req, res, next) => {
    try {
      const ret = await handler(req, res, next);
      if (ret === undefined || ret === null) {
        return res.json(success(null));
      }
      // 已经是 { code, message, data } 结构
      if (ret && typeof ret === "object" && "code" in ret && "message" in ret) {
        return res.json(ret);
      }
      // { data, message }
      if (ret && typeof ret === "object" && "data" in ret && !("code" in ret)) {
        return res.json(success(ret.data, ret.message || "ok"));
      }
      return res.json(success(ret));
    } catch (err) {
      next(err);
    }
  };
}

// 业务异常
class BizError extends Error {
  constructor(message, code = 1, data = null) {
    super(message);
    this.code = code;
    this.data = data;
    this.name = "BizError";
  }
}

function isBizError(err) {
  return err && err.name === "BizError";
}

module.exports = { success, fail, wrap, BizError, isBizError };
