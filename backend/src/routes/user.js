const express = require("express");
const router = express.Router();
const { wrap } = require("../utils/response");
const { auth } = require("../middleware/auth");
const userCtrl = require("../controllers/userController");

router.get("/projects", auth, wrap(userCtrl.listProjects));
router.post("/switch-project", auth, wrap(userCtrl.switchProject));

module.exports = router;
