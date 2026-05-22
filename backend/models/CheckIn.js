const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const checkInSchema = new mongoose.Schema({
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true,
  },
  date: {
    type: String, // 'YYYY-MM-DD'
    required: true,
  },
  question: {
    type: String,
    required: true,
  },
  isCustom: {
    type: Boolean,
    default: false,
  },
  answers: [answerSchema],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Unique per room per date
checkInSchema.index(
  { roomId: 1, date: 1 }, 
  { unique: true }
);

module.exports = mongoose.model(
  'CheckIn', checkInSchema
);
