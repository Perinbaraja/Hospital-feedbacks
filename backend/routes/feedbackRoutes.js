const express = require("express");
const router = express.Router();
const Feedback = require("../models/Feedback");
const { protect } = require("../middleware/authMiddleware");

// ─── PUBLIC ───────────────────────────────────────────────────────────────────

// POST /api/feedback  — submit new feedback
router.post("/", async (req, res) => {
  try {
    const feedback = await Feedback.create(req.body);

    // Optional email notification (non-blocking)
    try {
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        const transporter = require("../config/mail");
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: process.env.EMAIL_USER,
          subject: `New ${feedback.feedbackType} Feedback — ${feedback.department}`,
          html: `
            <h2>New Feedback Received</h2>
            <p><b>From:</b> ${feedback.patientName} (${feedback.patientEmail})</p>
            <p><b>Department:</b> ${feedback.department}</p>
            <p><b>Type:</b> ${feedback.feedbackType}</p>
            <p><b>Rating:</b> ${"⭐".repeat(feedback.rating)}</p>
            <p><b>Message:</b> ${feedback.message}</p>
          `
        });
      }
    } catch (mailErr) {
      console.warn("Email notification failed:", mailErr.message);
    }

    res.status(201).json({ success: true, message: "Feedback submitted successfully! Thank you.", data: feedback });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ─── ADMIN PROTECTED ──────────────────────────────────────────────────────────

// GET /api/feedback/stats  — dashboard statistics
router.get("/stats", protect, async (req, res) => {
  try {
    const [total, pending, inReview, resolved, avgRatingArr, byDepartment, byType, byRating, recent] = await Promise.all([
      Feedback.countDocuments(),
      Feedback.countDocuments({ status: "Pending" }),
      Feedback.countDocuments({ status: "In Review" }),
      Feedback.countDocuments({ status: "Resolved" }),
      Feedback.aggregate([{ $group: { _id: null, avg: { $avg: "$rating" } } }]),
      Feedback.aggregate([
        { $group: { _id: "$department", count: { $sum: 1 }, avgRating: { $avg: "$rating" } } },
        { $sort: { count: -1 } }
      ]),
      Feedback.aggregate([{ $group: { _id: "$feedbackType", count: { $sum: 1 } } }]),
      Feedback.aggregate([{ $group: { _id: "$rating", count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
      Feedback.find().sort({ createdAt: -1 }).limit(6)
    ]);

    res.json({
      success: true,
      data: {
        total, pending, inReview, resolved,
        avgRating: avgRatingArr[0]?.avg?.toFixed(1) || "0.0",
        byDepartment, byType, byRating, recent
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/feedback  — all feedbacks with filters & pagination
router.get("/", protect, async (req, res) => {
  try {
    const { department, status, feedbackType, page = 1, limit = 10, search } = req.query;
    const filter = {};
    if (department) filter.department = department;
    if (status) filter.status = status;
    if (feedbackType) filter.feedbackType = feedbackType;
    if (search) filter.$or = [
      { patientName: { $regex: search, $options: "i" } },
      { patientEmail: { $regex: search, $options: "i" } },
      { message: { $regex: search, $options: "i" } }
    ];

    const total = await Feedback.countDocuments(filter);
    const feedbacks = await Feedback.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ success: true, data: feedbacks, pagination: { total, page: Number(page), pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/feedback/:id  — single feedback
router.get("/:id", protect, async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) return res.status(404).json({ message: "Not found" });
    res.json({ success: true, data: feedback });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/feedback/:id/status  — update status & admin notes
router.patch("/:id/status", protect, async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    const update = { status, adminNotes };
    if (status === "Resolved") update.resolvedAt = new Date();

    const feedback = await Feedback.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!feedback) return res.status(404).json({ message: "Not found" });
    res.json({ success: true, data: feedback });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE /api/feedback/:id
router.delete("/:id", protect, async (req, res) => {
  try {
    await Feedback.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
