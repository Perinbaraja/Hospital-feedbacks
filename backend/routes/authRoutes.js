const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { protect } = require("../middleware/authMiddleware");

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET || "fallback_dev_secret", { expiresIn: "7d" });

// Seed default admin on startup
const seedDefaultAdmin = async () => {
  try {
    const exists = await User.findOne({ email: "admin@hospital.com" });
    if (!exists) {
      await User.create({ name: "Admin", email: "admin@hospital.com", password: "Admin@123", role: "superadmin" });
      console.log("✅ Default admin created → admin@hospital.com / Admin@123");
    }
  } catch (err) {
    console.error("Seed error:", err.message);
  }
};
seedDefaultAdmin();

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email and password required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    res.json({
      token: generateToken(user._id),
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/register (protected - only existing admins can create new ones)
router.post("/register", protect, async (req, res) => {
  try {
    const user = await User.create(req.body);
    res.json({ id: user._id, name: user.name, email: user.email });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// GET /api/auth/me
router.get("/me", protect, async (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
