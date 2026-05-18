const mongoose = require('mongoose');

const capsuleSchema = new mongoose.Schema({
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
    maxlength: 60,
  },
  opensAt: {
    type: Date,
    required: true,
  },
  isSealed: {
    type: Boolean,
    default: true,
  },
  confirmedBy: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  ],
  status: {
    type: String,
    enum: ['collecting', 'sealed', 'opened'],
    default: 'collecting',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Capsule', capsuleSchema);

