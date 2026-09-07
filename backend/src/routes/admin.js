const express = require("express");
const router = express.Router();
const { wrap } = require("../utils/response");
const { auth } = require("../middleware/auth");
const { onlyAdmin } = require("../middleware/role");
const { projectContext } = require("../middleware/projectContext");

const dashboardCtrl = require("../controllers/admin/dashboardController");
const customerCtrl = require("../controllers/admin/customerController");
const approvalCtrl = require("../controllers/admin/approvalController");
const publicPoolCtrl = require("../controllers/admin/publicPoolController");
const expiredPoolCtrl = require("../controllers/admin/expiredPoolController");
const exportCtrl = require("../controllers/admin/exportController");
const projectCtrl = require("../controllers/admin/projectController");
const userCtrl = require("../controllers/admin/userController");
const companyCtrl = require("../controllers/admin/companyController");
const configCtrl = require("../controllers/admin/configController");
const auditLogCtrl = require("../controllers/admin/auditLogController");

router.use(auth, onlyAdmin, projectContext);

router.get("/dashboard", wrap(dashboardCtrl.dashboard));

// 客户
router.get("/customers", wrap(customerCtrl.list));
router.get("/customer/:id", wrap(customerCtrl.detail));
router.put("/customer/:id", wrap(customerCtrl.update));
router.post("/assign-customer", wrap(customerCtrl.assign));
router.get("/followups/:customerId", wrap(customerCtrl.listFollowups));
router.get("/customer/:id/transfer-log", wrap(customerCtrl.transferLogs));

// 审批
router.get("/unvisited-approvals", wrap(approvalCtrl.unvisitedApprovals));
router.post("/approve-unvisited", wrap(approvalCtrl.approveUnvisited));
router.post("/approve-claim", wrap(approvalCtrl.approveClaim));
router.post("/approve-conflict", wrap(approvalCtrl.approveConflict));

// 公共池
router.get("/public-pool", wrap(publicPoolCtrl.list));
router.post("/assign-from-public", wrap(publicPoolCtrl.assignFromPublic));

// 过期池
router.get("/expired-pool", wrap(expiredPoolCtrl.list));

// 导出
router.post("/export-customers", exportCtrl.exportCustomers);

// 项目
router.get("/projects", wrap(projectCtrl.list));
router.post("/projects", wrap(projectCtrl.create));
router.put("/projects/:id", wrap(projectCtrl.update));

// 用户
router.get("/users", wrap(userCtrl.list));
router.post("/users", wrap(userCtrl.create));
router.put("/users/:id", wrap(userCtrl.update));
router.post("/users/:id/reset-password", wrap(userCtrl.resetPassword));

// 合作公司
router.get("/companies", wrap(companyCtrl.list));
router.post("/companies", wrap(companyCtrl.create));
router.put("/companies/:id", wrap(companyCtrl.update));

// 系统配置
router.get("/config", wrap(configCtrl.get));
router.put("/config", wrap(configCtrl.update));

// 审计日志
router.get("/audit-logs", wrap(auditLogCtrl.list));

module.exports = router;
