const express = require('express');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Post = require('../models/Post');
const Room = require('../models/Room');
const User = require('../models/User');
const Capsule = require('../models/Capsule');
const { notifyPartner } = require('../utils/notify');
const multer = require('multer');
const { uploadToCloudinary } = require('../utils/upload');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('INVALID_FILE_TYPE'));
  },
});

const sendServerError = (res) =>
  res.status(500).json({ success: false, error: 'SERVER_ERROR' });

const requireRoomId = (req, res) => {
  if (!req.user || req.user.roomId === null) {
    res.status(403).json({ success: false, error: 'NOT_IN_ROOM' });
    return null;
  }
  if (!mongoose.isValidObjectId(req.user.roomId)) {
    res.status(403).json({ success: false, error: 'NOT_IN_ROOM' });
    return null;
  }
  return req.user.roomId;
};

const parsePageLimit = (req) => {
  const pageRaw = req.query.page;
  const limitRaw = req.query.limit;
  let page = Number.isFinite(Number(pageRaw)) ? parseInt(pageRaw, 10) : 1;
  let limit = Number.isFinite(Number(limitRaw)) ? parseInt(limitRaw, 10) : 20;
  if (!page || page < 1) page = 1;
  if (!limit || limit < 1) limit = 20;
  if (limit > 50) limit = 50;
  return { page, limit };
};

const sanitizePostForResponse = (postDoc) => {
  const isSealed = Boolean(postDoc.isSealed);
  const base = {
    _id: postDoc._id,
    roomId: postDoc.roomId,
    authorId: postDoc.authorId && postDoc.authorId._id ? postDoc.authorId._id : postDoc.authorId,
    authorName:
      postDoc.authorId && postDoc.authorId.displayName
        ? postDoc.authorId.displayName
        : undefined,
    type: postDoc.type,
    content: isSealed ? null : postDoc.content,
    moodTag: postDoc.moodTag,
    mediaUrl: postDoc.mediaUrl,
    isSealed: postDoc.isSealed,
    unlocksAt: postDoc.unlocksAt,
    parentId: postDoc.parentId,
    createdAt: postDoc.createdAt,
  };
  return base;
};

router.get('/', auth, async (req, res) => {
  try {
    const roomId = requireRoomId(req, res);
    if (!roomId) return;

    const { page, limit } = parsePageLimit(req);

    const typeFilter = req.query.type;
    const filter = {
      roomId,
      parentId: null,
      ...(typeFilter ? { type: typeFilter } : {}),
    };
    const totalPosts = await Post.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(totalPosts / limit));

    const posts = await Post.find(filter)
      .sort({ createdAt: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('authorId', 'displayName')
      .lean();

    const postIds = posts.map((p) => p._id);
    const replyCounts = await Post.aggregate([
      { $match: { roomId: new mongoose.Types.ObjectId(roomId), parentId: { $in: postIds } } },
      { $group: { _id: '$parentId', count: { $sum: 1 } } },
    ]);
    const replyCountById = new Map(
      replyCounts.map((r) => [r._id.toString(), r.count])
    );

    const responsePosts = posts.map((p) => {
      const sanitized = sanitizePostForResponse(p);
      return {
        ...sanitized,
        replyCount: replyCountById.get(p._id.toString()) || 0,
      };
    });

    return res.status(200).json({
      success: true,
      posts: responsePosts,
      pagination: { page, limit, totalPages, totalPosts },
    });
  } catch (err) {
    return sendServerError(res);
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const roomId = requireRoomId(req, res);
    if (!roomId) return;

    const { content, moodTag, mediaUrl } = req.body || {};

    const contentStr = content === undefined || content === null ? '' : String(content);
    const trimmedContent = contentStr.trim();
    const mediaUrlStr = mediaUrl === undefined || mediaUrl === null ? null : String(mediaUrl).trim();
    const moodTagStr = moodTag === undefined || moodTag === null ? null : String(moodTag).trim();

    if ((!trimmedContent || trimmedContent.length === 0) && (!mediaUrlStr || mediaUrlStr.length === 0)) {
      return res.status(400).json({ success: false, error: 'CONTENT_REQUIRED' });
    }

    if (trimmedContent && trimmedContent.length > 2000) {
      return res.status(400).json({ success: false, error: 'CONTENT_TOO_LONG' });
    }

    if (moodTagStr && !['good', 'okay', 'low'].includes(moodTagStr)) {
      return res.status(400).json({ success: false, error: 'INVALID_MOOD_TAG' });
    }

    if (mediaUrlStr) {
      if (mediaUrlStr.length > 500) {
        return res.status(400).json({ success: false, error: 'VALIDATION_ERROR' });
      }
      if (!mediaUrlStr.startsWith('https://res.cloudinary.com/')) {
        return res.status(400).json({ success: false, error: 'VALIDATION_ERROR' });
      }
    }

    const post = await Post.create({
      roomId,
      authorId: req.user._id,
      type: 'post',
      content: trimmedContent ? trimmedContent : null,
      moodTag: moodTagStr || null,
      mediaUrl: mediaUrlStr || null,
      unlocksAt: null,
      isSealed: false,
      parentId: null,
    });

    if (req.io && typeof req.io.emit === 'function') {
      req.io.emit('new_post', { roomId: roomId.toString(), post });
    }

    try {
      await notifyPartner({
        roomId,
        senderUserId: req.user._id,
        title: 'TwoSpace',
        body: 'Someone is thinking of you.',
        data: { type: 'new_post' },
      });
    } catch (err) {
      // swallow
    }

    const populated = await Post.findById(post._id).populate('authorId', 'displayName').lean();
    const responsePost = sanitizePostForResponse(populated);

    return res.status(200).json({
      success: true,
      post: {
        _id: responsePost._id,
        type: responsePost.type,
        content: responsePost.content,
        moodTag: responsePost.moodTag,
        createdAt: responsePost.createdAt,
      },
    });
  } catch (err) {
    return sendServerError(res);
  }
});

router.post('/timed-wish', auth, async (req, res) => {
  try {
    const roomId = requireRoomId(req, res);
    if (!roomId) return;

    const { content, unlocksAt, label } = req.body || {};

    const contentStr = content === undefined || content === null ? '' : String(content);
    const trimmedContent = contentStr.trim();
    if (!trimmedContent) {
      return res.status(400).json({ success: false, error: 'CONTENT_REQUIRED' });
    }
    if (trimmedContent.length > 5000) {
      return res.status(400).json({ success: false, error: 'CONTENT_TOO_LONG' });
    }

    if (!unlocksAt) {
      return res.status(400).json({ success: false, error: 'INVALID_UNLOCK_DATE' });
    }

    const unlockDate = new Date(unlocksAt);
    if (Number.isNaN(unlockDate.getTime())) {
      return res.status(400).json({ success: false, error: 'INVALID_UNLOCK_DATE' });
    }

    const oneHourMs = 60 * 60 * 1000;
    if (unlockDate.getTime() < Date.now() + oneHourMs) {
      return res.status(400).json({ success: false, error: 'INVALID_UNLOCK_DATE' });
    }

    const fiveYearsMs = 5 * 365 * 24 * 60 * 60 * 1000;
    if (unlockDate.getTime() > Date.now() + fiveYearsMs) {
      return res.status(400).json({ success: false, error: 'UNLOCK_DATE_TOO_FAR' });
    }

    const labelStr = label === undefined || label === null ? null : String(label).trim();
    if (labelStr && labelStr.length > 40) {
      return res.status(400).json({ success: false, error: 'VALIDATION_ERROR' });
    }

    const post = await Post.create({
      roomId,
      authorId: req.user._id,
      type: 'timed-wish',
      content: trimmedContent,
      moodTag: null,
      mediaUrl: null,
      unlocksAt: unlockDate,
      isSealed: true,
      parentId: null,
    });

    if (req.io && typeof req.io.emit === 'function') {
      req.io.emit('new_post', { roomId: roomId.toString(), post });
    }

    try {
      await notifyPartner({
        roomId,
        senderUserId: req.user._id,
        title: 'TwoSpace',
        body: 'A sealed wish is waiting for you...',
        data: { type: 'timed_wish', postId: post._id.toString() },
      });
    } catch (err) {
      // swallow
    }

    return res.status(200).json({
      success: true,
      post: {
        _id: post._id,
        type: post.type,
        content: null,
        isSealed: true,
        unlocksAt: post.unlocksAt,
        createdAt: post.createdAt,
      },
    });
  } catch (err) {
    return sendServerError(res);
  }
});

router.post('/upload-image', auth, async (req, res) => {
  const roomId = requireRoomId(req, res);
  if (!roomId) return;

  return upload.single('image')(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, error: 'FILE_TOO_LARGE' });
      }
      if (err.message === 'INVALID_FILE_TYPE') {
        return res.status(400).json({ success: false, error: 'INVALID_FILE_TYPE' });
      }
      return res.status(400).json({ success: false, error: 'VALIDATION_ERROR' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'NO_FILE' });
    }

    try {
      const mediaUrl = await uploadToCloudinary(req.file.buffer, req.file.mimetype);
      return res.status(200).json({ success: true, mediaUrl });
    } catch (uploadErr) {
      return sendServerError(res);
    }
  });
});

router.post('/:id/reply', auth, async (req, res) => {
  try {
    const roomId = requireRoomId(req, res);
    if (!roomId) return;

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'BAD_ID' });
    }

    const parent = await Post.findById(id);
    if (!parent) {
      return res.status(404).json({ success: false, error: 'POST_NOT_FOUND' });
    }

    if (parent.roomId.toString() !== roomId.toString()) {
      return res.status(403).json({ success: false, error: 'FORBIDDEN' });
    }

    if (parent.isSealed === true) {
      return res.status(400).json({ success: false, error: 'CANNOT_REPLY_SEALED' });
    }

    const { content } = req.body || {};
    const contentStr = content === undefined || content === null ? '' : String(content);
    const trimmedContent = contentStr.trim();
    if (!trimmedContent) {
      return res.status(400).json({ success: false, error: 'CONTENT_REQUIRED' });
    }
    if (trimmedContent.length > 1000) {
      return res.status(400).json({ success: false, error: 'CONTENT_TOO_LONG' });
    }

    const reply = await Post.create({
      roomId,
      authorId: req.user._id,
      type: 'reply',
      content: trimmedContent,
      moodTag: null,
      mediaUrl: null,
      unlocksAt: null,
      isSealed: false,
      parentId: parent._id,
    });

    return res.status(200).json({
      success: true,
      reply: {
        _id: reply._id,
        content: reply.content,
        createdAt: reply.createdAt,
      },
    });
  } catch (err) {
    return sendServerError(res);
  }
});

router.get('/:id/replies', auth, async (req, res) => {
  try {
    const roomId = requireRoomId(req, res);
    if (!roomId) return;

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'BAD_ID' });
    }

    const parent = await Post.findById(id);
    if (!parent) {
      return res.status(404).json({ success: false, error: 'POST_NOT_FOUND' });
    }

    if (parent.roomId.toString() !== roomId.toString()) {
      return res.status(403).json({ success: false, error: 'FORBIDDEN' });
    }

    const replies = await Post.find({ parentId: parent._id, roomId })
      .sort({ createdAt: 1 })
      .populate('authorId', 'displayName')
      .lean();

    const out = replies.map((r) => ({
      _id: r._id,
      authorId: r.authorId && r.authorId._id ? r.authorId._id : r.authorId,
      authorName: r.authorId && r.authorId.displayName ? r.authorId.displayName : undefined,
      content: r.isSealed ? null : r.content,
      createdAt: r.createdAt,
    }));

    return res.status(200).json({ success: true, replies: out });
  } catch (err) {
    return sendServerError(res);
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const roomId = requireRoomId(req, res);
    if (!roomId) return;

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'BAD_ID' });
    }

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ success: false, error: 'POST_NOT_FOUND' });
    }

    if (post.roomId.toString() !== roomId.toString()) {
      return res.status(403).json({ success: false, error: 'FORBIDDEN' });
    }

    if (post.authorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'FORBIDDEN' });
    }

    await Post.deleteMany({ $or: [{ _id: post._id }, { parentId: post._id }] });

    return res.status(200).json({ success: true });
  } catch (err) {
    return sendServerError(res);
  }
});

router.post('/capsule/create', auth, async (req, res) => {
  try {
    const roomId = requireRoomId(req, res);
    if (!roomId) return;

    const { title, opensAt } = req.body || {};
    const titleStr = title === undefined || title === null ? '' : String(title).trim();
    if (!titleStr || titleStr.length === 0 || titleStr.length > 60) {
      return res.status(400).json({ success: false, error: 'VALIDATION_ERROR' });
    }

    if (!opensAt) {
      return res.status(400).json({ success: false, error: 'INVALID_UNLOCK_DATE' });
    }

    const opensDate = new Date(opensAt);
    if (Number.isNaN(opensDate.getTime())) {
      return res.status(400).json({ success: false, error: 'INVALID_UNLOCK_DATE' });
    }

    const oneHourMs = 60 * 60 * 1000;
    if (opensDate.getTime() < Date.now() + oneHourMs) {
      return res.status(400).json({ success: false, error: 'INVALID_UNLOCK_DATE' });
    }

    const tenYearsMs = 10 * 365 * 24 * 60 * 60 * 1000;
    if (opensDate.getTime() > Date.now() + tenYearsMs) {
      return res.status(400).json({ success: false, error: 'UNLOCK_DATE_TOO_FAR' });
    }

    const capsule = await Capsule.create({
      roomId,
      createdBy: req.user._id,
      title: titleStr,
      opensAt: opensDate,
      isSealed: true,
      confirmedBy: [req.user._id],
      status: 'collecting',
    });

    try {
      await notifyPartner({
        roomId,
        senderUserId: req.user._id,
        title: 'TwoSpace',
        body: `${req.user.displayName} started a Memory Capsule: "${titleStr}"`,
        data: { type: 'capsule_started', capsuleId: capsule._id.toString() },
      });
    } catch (err) {
      // swallow
    }

    return res.status(200).json({ success: true, capsule });
  } catch (err) {
    return sendServerError(res);
  }
});

router.get('/capsule/my-capsules', auth, async (req, res) => {
  try {
    const roomId = requireRoomId(req, res);
    if (!roomId) return;

    const capsules = await Capsule.find({ roomId }).sort({ createdAt: -1 }).lean();
    return res.status(200).json({ success: true, capsules });
  } catch (err) {
    return sendServerError(res);
  }
});

router.post('/capsule/:capsuleId/add', auth, async (req, res) => {
  try {
    const roomId = requireRoomId(req, res);
    if (!roomId) return;

    const { capsuleId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(capsuleId)) {
      return res.status(400).json({ success: false, error: 'BAD_ID' });
    }

    const capsule = await Capsule.findById(capsuleId);
    if (!capsule) {
      return res.status(404).json({ success: false, error: 'CAPSULE_NOT_FOUND' });
    }

    if (capsule.roomId.toString() !== roomId.toString()) {
      return res.status(403).json({ success: false, error: 'FORBIDDEN' });
    }

    if (capsule.status !== 'collecting') {
      return res.status(400).json({ success: false, error: 'CAPSULE_CLOSED' });
    }

    const { content, moodTag, mediaUrl } = req.body || {};
    const contentStr = content === undefined || content === null ? '' : String(content);
    const trimmedContent = contentStr.trim();
    const mediaUrlStr = mediaUrl === undefined || mediaUrl === null ? null : String(mediaUrl).trim();
    const moodTagStr = moodTag === undefined || moodTag === null ? null : String(moodTag).trim();

    if (!trimmedContent || trimmedContent.length === 0) {
      return res.status(400).json({ success: false, error: 'CONTENT_REQUIRED' });
    }
    if (trimmedContent.length > 2000) {
      return res.status(400).json({ success: false, error: 'CONTENT_TOO_LONG' });
    }
    if (moodTagStr && !['good', 'okay', 'low'].includes(moodTagStr)) {
      return res.status(400).json({ success: false, error: 'INVALID_MOOD_TAG' });
    }
    if (mediaUrlStr) {
      if (!mediaUrlStr.startsWith('https://res.cloudinary.com/')) {
        return res.status(400).json({ success: false, error: 'VALIDATION_ERROR' });
      }
      if (mediaUrlStr.length > 500) {
        return res.status(400).json({ success: false, error: 'VALIDATION_ERROR' });
      }
    }

    const post = await Post.create({
      roomId,
      authorId: req.user._id,
      type: 'post',
      capsuleId: capsule._id,
      content: trimmedContent,
      moodTag: moodTagStr || null,
      mediaUrl: mediaUrlStr || null,
      unlocksAt: null,
      isSealed: true,
      parentId: null,
    });

    return res.status(200).json({ success: true, post });
  } catch (err) {
    return sendServerError(res);
  }
});

router.get('/capsule/:capsuleId', auth, async (req, res) => {
  try {
    const roomId = requireRoomId(req, res);
    if (!roomId) return;

    const { capsuleId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(capsuleId)) {
      return res.status(400).json({ success: false, error: 'BAD_ID' });
    }

    const capsule = await Capsule.findById(capsuleId).lean();
    if (!capsule) {
      return res.status(404).json({ success: false, error: 'CAPSULE_NOT_FOUND' });
    }

    if (capsule.roomId.toString() !== roomId.toString()) {
      return res.status(403).json({ success: false, error: 'FORBIDDEN' });
    }

    const posts = await Post.find({ capsuleId: capsule._id })
      .sort({ createdAt: 1 })
      .populate('authorId', 'displayName')
      .lean();

    const outPosts = posts.map((p) => ({
      _id: p._id,
      roomId: p.roomId,
      authorId: p.authorId && p.authorId._id ? p.authorId._id : p.authorId,
      authorName: p.authorId && p.authorId.displayName ? p.authorId.displayName : undefined,
      type: p.type,
      content: capsule.isSealed ? null : p.content,
      moodTag: p.moodTag,
      mediaUrl: p.mediaUrl,
      isSealed: capsule.isSealed ? true : p.isSealed,
      createdAt: p.createdAt,
      capsuleId: p.capsuleId,
    }));

    return res.status(200).json({ success: true, capsule, posts: outPosts });
  } catch (err) {
    return sendServerError(res);
  }
});

router.post('/capsule/:capsuleId/confirm', auth, async (req, res) => {
  try {
    const roomId = requireRoomId(req, res);
    if (!roomId) return;

    const { capsuleId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(capsuleId)) {
      return res.status(400).json({ success: false, error: 'BAD_ID' });
    }

    const capsule = await Capsule.findById(capsuleId);
    if (!capsule) {
      return res.status(404).json({ success: false, error: 'CAPSULE_NOT_FOUND' });
    }

    if (capsule.roomId.toString() !== roomId.toString()) {
      return res.status(403).json({ success: false, error: 'FORBIDDEN' });
    }

    if (capsule.status !== 'collecting') {
      return res.status(400).json({ success: false, error: 'CAPSULE_CLOSED' });
    }

    const alreadyConfirmed = (capsule.confirmedBy || []).some(
      (id) => id.toString() === req.user._id.toString()
    );
    if (!alreadyConfirmed) {
      capsule.confirmedBy.push(req.user._id);
    }

    if ((capsule.confirmedBy || []).length === 2) {
      capsule.status = 'sealed';
      try {
        await notifyPartner({
          roomId,
          senderUserId: req.user._id,
          title: 'TwoSpace',
          body: 'Your Memory Capsule is now sealed! 🔒',
          data: { type: 'capsule_sealed', capsuleId: capsule._id.toString() },
        });
      } catch (err) {
        // swallow
      }
    }

    await capsule.save();
    return res.status(200).json({ success: true, capsule });
  } catch (err) {
    return sendServerError(res);
  }
});

module.exports = router;
