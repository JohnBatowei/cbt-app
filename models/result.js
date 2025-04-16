const mongoose = require('mongoose');

const ResultSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },
    classId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class',
        required: true
    },
    className: {
        type: String,
        required: true
    },
    candidateName: {
        type: String,
        required: true
    },
    profileCode: {
        type: String,
        required: true
    },
    totalScore: {
        type: Number,
        required: true
    },
    subjects: [
        {
            subjectId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Subject',
                required: true
            },
            subjectName: {
                type: String,
                required: true
            },
            score: {
                type: Number,
                required: true
            }
        }
    ],
    count: {type: Number, default: 0},
    scratchCard: {type: String},
    date: {
        type: Date,
        default: Date.now
    }
});

module.exports.Result = mongoose.model('Result', ResultSchema);
