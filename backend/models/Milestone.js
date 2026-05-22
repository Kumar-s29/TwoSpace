const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema({
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 80,
  },
  date: {
    type: Date,
    required: true,
  },
  note: {
    type: String,
    default: null,
    trim: true,
    maxlength: 300,
  },
  emoji: {
    type: String,
    default: '⭐',
    maxlength: 8,
  },
  isRecurring: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model(
  'Milestone', milestoneSchema
);
