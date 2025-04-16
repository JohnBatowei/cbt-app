const mongoose = require("mongoose");

const ExamInstance = new mongoose.Schema(
  {
    studentId : { type: String },
    classId: { type: String },
    className: { type: String },
    timer: { type: String },
    candidateName: { type: String },
    profileCode: { type: String },
    subject: [
      {
        _id: {type:String},
        name: {
            type: String
        },
        questions: [
            {
                subjectName: { type: String },
                subjectId: { type: String },
                question: { type: String },
                option_A: { type: String },
                option_B: { type: String },
                option_C: { type: String },
                answer: { type: String },
                selectedOption: { type: String },
                image: { type: String },
                _id: {type:String},
          }
        ]
      }
    ],
    phone: { type: String },
    endExam: { type: String },
    image: { type: String }
  },
  { timestamps: true }
);

module.exports.ExamInstances = mongoose.model("ExamInstance", ExamInstance);
