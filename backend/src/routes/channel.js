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

router.post("/customer", wrap(customerCtrl.create));
router.get("/customers", wrap(customerCtrl.list));
router.get("/customer/:id", wrap(customerCtrl.detail));
router.put("/customer/:id", wrap(customerCtrl.update));
router.post("/customer/:id/arrive", wrap(customerCtrl.arrive));

router.get("/expired-pool", wrap(expiredPoolCtrl.list));
router.post("/report-expired", wrap(expiredPoolCtrl.reReport));

module.exports = router;
