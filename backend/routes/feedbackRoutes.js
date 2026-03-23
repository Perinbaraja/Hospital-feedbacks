const express = require("express");
const router = express.Router();
const Feedback = require("../models/Feedback");
const Form = require("../models/FormConfig");
const transporter = require("../config/mail");

router.post("/", async (req, res) => {
  const { formId, responses } = req.body;

  const form = await Form.findById(formId);
  if (!form) return res.status(404).json({ message: "Form not found" });

  await Feedback.create({ formId, responses });

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_USER,
    subject: "New Feedback Received",
    html: Object.entries(responses)
      .map(([key, val]) => `<p><b>${key}:</b> ${val}</p>`)
      .join("")
  });

  res.json({ message: "Feedback submitted successfully" });
});

module.exports = router;