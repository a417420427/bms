const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const uploadCtrl = require("../controllers/uploadController");

router.post("/visit-photo", auth, uploadCtrl.visitPhoto);
router.post("/file", auth, uploadCtrl.generic);

module.exports = router;
