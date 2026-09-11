const express = require("express");
const router = express.Router();
const { wrap } = require("../utils/response");
const { auth } = require("../middleware/auth");
const { onlyChannel } = require("../middleware/role");
const { projectContext } = require("../middleware/projectContext");

const dashboardCtrl = require("../controllers/channel/dashboardController");
const customerCtrl = require("../controllers/channel/customerController");
const expiredPoolCtrl = require("../controllers/channel/expiredPoolController");

router.use(auth, onlyChannel, projectContext);

router.get("/dashboard", wrap(dashboardCtrl.dashboard));
// 渠道员获取当前项目的合作公司列表（用于推荐录入时选择）
router.get("/companies", wrap(customerCtrl.listCompanies));

// 渠道员获取当前项目的销售员列表（用于标记已到访时选择接待销售员）
router.get("/sales", wrap(customerCtrl.listSales));

router.post("/customer", wrap(customerCtrl.create));
router.get("/customers", wrap(customerCtrl.list));
router.get("/customer/:id", wrap(customerCtrl.detail));
router.put("/customer/:id", wrap(customerCtrl.update));
router.post("/customer/:id/arrive", wrap(customerCtrl.arrive));

router.get("/expired-pool", wrap(expiredPoolCtrl.list));
router.post("/report-expired", wrap(expiredPoolCtrl.reReport));

module.exports = router;
