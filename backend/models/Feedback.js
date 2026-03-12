const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema({
  // Patient info
  patientName: { type: String, required: [true, "Name is required"], trim: true },
  patientEmail: { type: String, required: false, trim: true, lowercase: true },
  patientPhone: { type: String, trim: true },

  // Feedback details
  department: {
    type: String,
    required: [true, "Department is required"],
    enum: ["Emergency", "Cardiology", "Neurology", "Orthopedics", "Pediatrics",
           "Oncology", "Radiology", "General Surgery", "Outpatient", "Pharmacy",
           "Nursing", "Administration"]
  },
  visitDate: { type: Date, required: [true, "Visit date is required"] },
  feedbackType: {
    type: String,
    enum: ["Compliment", "Complaint", "Suggestion", "General"],
    default: "General"
  },
  rating: { type: Number, min: 1, max: 5, required: [true, "Rating is required"] },
  message: { type: String, required: [true, "Message is required"], minlength: 10 },

  // Admin management
  status: {
    type: String,
    enum: ["Pending", "In Review", "Resolved"],
    default: "Pending"
  },
  adminNotes: { type: String, default: "" },
  resolvedAt: { type: Date },

  // Legacy dynamic form support (keep for backwards compatibility)
  formId: { type: mongoose.Schema.Types.ObjectId, ref: "FormConfig" },
  responses: { type: Map, of: mongoose.Schema.Types.Mixed }

}, { timestamps: true });

module.exports = mongoose.model("Feedback", feedbackSchema);
