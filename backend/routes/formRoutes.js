const express = require("express");
const router = express.Router();
const Form = require("../models/FormConfig");
const { protect } = require("../middleware/authMiddleware");

router.post("/", protect, async (req, res) => {
  const form = await Form.create(req.body);
  res.json(form);
});

router.get("/active", async (req, res) => {
  const form = await Form.findOne({ isActive: true });
  res.json(form);
});

module.exports = router;