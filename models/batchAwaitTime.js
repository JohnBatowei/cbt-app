const mongoose = require('mongoose');

const batchAwaitTime = new mongoose.Schema({
    batchAwaitTime : {type: Number , default: 15},
    set: {type: Boolean, default: true}
},{timestamps:true})

const batchAwaitTimeModel = mongoose.model('batchAwaitTime', batchAwaitTime)

module.exports = batchAwaitTimeModel