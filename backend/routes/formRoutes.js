const express = require("express");
const router = express.Router();
const Form = require("../models/FormConfig");
const { protect } = require("../middleware/authMiddleware");

router.post("/", protect, async (req, res) => {
  try {
    const form = await Form.create(req.body);
    res.json(form);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.get("/", protect, async (req, res) => {
  const forms = await Form.find().sort({ createdAt: -1 });
  res.json(forms);
});

router.get("/active", async (req, res) => {
  const form = await Form.findOne({ isActive: true });
  res.json(form);
});

router.get("/:id", async (req, res) => {
  try {
    const form = await Form.findById(req.params.id);
    if (!form) return res.status(404).json({ message: "Form not found" });
    res.json(form);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
