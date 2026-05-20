const mongoose = require('mongoose');

const journalEntrySchema = new mongoose.Schema({
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 3000,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const journalSchema = new mongoose.Schema({
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true,
  },
  date: {
    type: String,  // stored as 'YYYY-MM-DD'
    required: true,
  },
  entries: [journalEntrySchema],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Unique per room per date
journalSchema.index({ roomId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Journal', journalSchema);
