const mongoose = require("mongoose");

const headersSchema = mongoose.Schema(
  {
    deff: {type: String},
    frontPage: { type: String },
    corPage: { type: String },
    canPage: { type: String },
    resultPage: { type: String },
    confirmation: { type: String ,default: 'no'},
  },
  { timestamps: true }
);

const headersModel = mongoose.model('headers',headersSchema);
module.exports = headersModel