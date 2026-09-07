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

// 0907: 系统管理员（唯一账号）才能新增项目/角色/公司，新增管理员（多项目）仅可调阅
function requireSystemAdmin(req, res, next) {
  if (!req.user) return res.status(401).json(fail("未登录", 401));
  if (!req.user.isSystemAdmin) {
    return res.status(403).json(fail("仅系统管理员可执行此操作", 403));
  }
  next();
}

const onlyAdmin = requireRole(ROLE.ROLE_ADMIN);
const onlySales = requireRole(ROLE.ROLE_SALES);
const onlyChannel = requireRole(ROLE.ROLE_CHANNEL);
const salesOrAdmin = requireRole(ROLE.ROLE_SALES, ROLE.ROLE_ADMIN);
const channelOrAdmin = requireRole(ROLE.ROLE_CHANNEL, ROLE.ROLE_ADMIN);

module.exports = { requireRole, requireSystemAdmin, onlyAdmin, onlySales, onlyChannel, salesOrAdmin, channelOrAdmin };
