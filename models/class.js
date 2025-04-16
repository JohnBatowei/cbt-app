const mongoose = require("mongoose");

const ClassSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      unique: true,
      required: true,
    },
    timer: {
      type: String,
      required: true,
    },
    subject: [{ type: mongoose.Schema.Types.ObjectId, ref: "subject" }],
    profileCodeInitials: { type: String },
  },
  { timestamps: true }
);

const classModel = mongoose.model("class", ClassSchema);
module.exports = classModel;
