const express = require("express");
const router = express.Router();
const { wrap } = require("../utils/response");
const { auth } = require("../middleware/auth");
const { projectContext } = require("../middleware/projectContext");
const ctrl = require("../controllers/checkinController");

// 所有角色均可打卡，不限角色
router.use(auth, projectContext);

router.post("/", wrap(ctrl.create));
router.get("/today", wrap(ctrl.today));
router.get("/records", wrap(ctrl.list));

module.exports = router;
