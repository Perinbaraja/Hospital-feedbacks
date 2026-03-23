const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema({
  formId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "FormConfig"
  },
  responses: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, { timestamps: true });

module.exports = mongoose.model("Feedback", feedbackSchema);