const { fail } = require("../utils/response");
const { ROLE } = require("../utils/constants");

// 角色拦截：requireRole(ROLE.ROLE_ADMIN, ROLE.ROLE_SALES) 任意匹配
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json(fail("未登录", 401));
    if (!roles.includes(req.user.role)) {
      return res.status(403).json(fail("拒绝访问：权限不足", 403));
    }
    next();
  };
}

const onlyAdmin = requireRole(ROLE.ROLE_ADMIN);
const onlySales = requireRole(ROLE.ROLE_SALES);
const onlyChannel = requireRole(ROLE.ROLE_CHANNEL);
const salesOrAdmin = requireRole(ROLE.ROLE_SALES, ROLE.ROLE_ADMIN);
const channelOrAdmin = requireRole(ROLE.ROLE_CHANNEL, ROLE.ROLE_ADMIN);

module.exports = { requireRole, onlyAdmin, onlySales, onlyChannel, salesOrAdmin, channelOrAdmin };
