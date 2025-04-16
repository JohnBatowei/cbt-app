const mongoose = require("mongoose");

const scratch = mongoose.Schema(
  {
    card: { type: String, required: true, unique: true }
  },
  { timestamps: true }
);

const scratchCard = mongoose.model("scratchcard", scratch);
module.exports = scratchCard;
