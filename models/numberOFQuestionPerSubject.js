const mongoose = require('mongoose');

const numberOfQuestionPerSubject = new mongoose.Schema({
    numberOfQuestionPerSubject : {type: Number , default: 50},
},{timestamps:true})

const numberOfQuestionPerSubjectModel = mongoose.model('numberOfQuestionPerSubject', numberOfQuestionPerSubject)

module.exports = numberOfQuestionPerSubjectModel