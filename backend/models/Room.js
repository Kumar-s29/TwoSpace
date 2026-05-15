const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  userIds: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  ],
  inviteToken: {
    type: String,
    default: null,
  },
  inviteExpiry: {
    type: Date,
    default: null,
  },
  status: {
    type: String,
    enum: ['active', 'archived', 'closed'],
    default: 'active',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

roomSchema.path('userIds').validate(
  (v) => Array.isArray(v) && v.length > 0 && v.length <= 2,
  'userIds must have 1 to 2 entries.'
);

module.exports = mongoose.model('Room', roomSchema);
