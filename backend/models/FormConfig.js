const mongoose = require("mongoose");

const fieldSchema = new mongoose.Schema({
  label: String,
  name: String,
  type: String,
  required: Boolean,
  options: [String]
});

const formSchema = new mongoose.Schema({
  title: String,
  fields: [fieldSchema],
  isActive: { type: Boolean, default: true }
});

module.exports = mongoose.model("FormConfig", formSchema);
