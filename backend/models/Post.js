const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true,
  },
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['post', 'timed-wish', 'reply'],
    required: true,
  },
  content: {
    type: String,
    trim: true,
    maxlength: 5000,
    default: null,
  },
  moodTag: {
    type: String,
    enum: ['good', 'okay', 'low'],
    default: null,
  },
  mediaUrl: {
    type: String,
    default: null,
    maxlength: 500,
  },
  audioUrl: {
    type: String,
    default: null,
    maxlength: 500,
  },
  reactions: {
    type: Map,
    of: String,
    default: {},
  },
  isEdited: {
    type: Boolean,
    default: false,
  },
  editedAt: {
    type: Date,
    default: null,
  },
  unlocksAt: {
    type: Date,
    default: null,
  },
  isSealed: {
    type: Boolean,
    default: false,
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    default: null,
  },
  capsuleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Capsule',
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Post', postSchema);
