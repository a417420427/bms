const express = require("express");
const router = express.Router();

router.get("/health", (req, res) => res.json({ code: 0, message: "ok", data: { ts: Date.now() } }));
router.use("/auth", require("./auth"));
router.use("/user", require("./user"));
router.use("/sales", require("./sales"));
router.use("/channel", require("./channel"));
router.use("/admin", require("./admin"));
router.use("/upload", require("./upload"));

module.exports = router;
