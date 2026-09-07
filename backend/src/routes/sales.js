const express = require("express");
const router = express.Router();
const { wrap } = require("../utils/response");
const { auth } = require("../middleware/auth");
const { onlySales, requireRole } = require("../middleware/role");
const { projectContext } = require("../middleware/projectContext");

const dashboardCtrl = require("../controllers/sales/dashboardController");
const customerCtrl = require("../controllers/sales/customerController");
const followupCtrl = require("../controllers/sales/followupController");
const publicPoolCtrl = require("../controllers/sales/publicPoolController");
const unvisitedPoolCtrl = require("../controllers/sales/unvisitedPoolController");
const reminderCtrl = require("../controllers/sales/reminderController");

router.use(auth, onlySales, projectContext);

router.get("/dashboard", wrap(dashboardCtrl.dashboard));

router.post("/customer/check-duplicate", wrap(customerCtrl.checkDuplicate));
router.post("/customer", wrap(customerCtrl.create));
router.get("/customers", wrap(customerCtrl.list));
router.get("/customer/:id", wrap(customerCtrl.detail));
router.put("/customer/:id/intent", wrap(customerCtrl.updateIntent));
router.put("/customer/:id", wrap(customerCtrl.update));

router.get("/followups/:customerId", wrap(followupCtrl.list));
router.post("/followup", wrap(followupCtrl.create));

router.get("/public-pool", wrap(publicPoolCtrl.list));
router.post("/public-pool/claim", wrap(publicPoolCtrl.claim));

router.get("/unvisited-pool", wrap(unvisitedPoolCtrl.list));
router.post("/unvisited-pool/claim", wrap(unvisitedPoolCtrl.claim));

router.get("/followup-reminder", wrap(reminderCtrl.reminder));

module.exports = router;
