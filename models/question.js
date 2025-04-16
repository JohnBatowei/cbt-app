const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  subjectName: { type: String },
  subjectId: { type: String },
  question: { type: String },
  option_A: { type: String },
  option_B: { type: String },
  option_C: { type: String },
  answer: { type: String },
  image: { type: String }
}, { timestamps: true });


const questionModel = mongoose.model("question", questionSchema);

module.exports = questionModel;
