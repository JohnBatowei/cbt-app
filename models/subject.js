const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      // unique: true,
    },
    questions: [{ type: mongoose.Schema.Types.ObjectId, ref: "question" }],
  },
  { timestamps: true }
);

const subjectModel = mongoose.model("subject", subjectSchema);

module.exports = subjectModel;
