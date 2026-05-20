const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Journal = require('../models/Journal');
const Post = require('../models/Post');
const Room = require('../models/Room');

const sendServerError = (res) =>
  res.status(500).json({ 
    success: false, error: 'SERVER_ERROR' 
  });

// GET today's journal entry
router.get('/today', auth, async (req, res) => {
  try {
    const roomId = req.user.roomId;
    if (!roomId) return res.status(403).json({ 
      success: false, error: 'NOT_IN_ROOM' 
    });

    const today = new Date()
      .toISOString().split('T')[0]; // 'YYYY-MM-DD'

    let journal = await Journal.findOne({ 
      roomId, date: today 
    })
    .populate('entries.authorId', 'displayName')
    .lean();

    return res.status(200).json({ 
      success: true, 
      journal: journal || null,
      date: today,
    });
  } catch (err) {
    return sendServerError(res);
  }
});

// GET all journal entries (paginated)
router.get('/', auth, async (req, res) => {
  try {
    const roomId = req.user.roomId;
    if (!roomId) return res.status(403).json({ 
      success: false, error: 'NOT_IN_ROOM' 
    });

    const page = Math.max(
      1, parseInt(req.query.page) || 1
    );
    const limit = Math.min(
      20, parseInt(req.query.limit) || 10
    );

    const total = await Journal.countDocuments(
      { roomId }
    );
    const journals = await Journal.find({ roomId })
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('entries.authorId', 'displayName')
      .lean();

    return res.status(200).json({
      success: true,
      journals,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (err) {
    return sendServerError(res);
  }
});

// POST add entry to today's journal
router.post('/add', auth, async (req, res) => {
  try {
    const roomId = req.user.roomId;
    if (!roomId) return res.status(403).json({ 
      success: false, error: 'NOT_IN_ROOM' 
    });

    const { content } = req.body || {};
    const trimmed = content 
      ? String(content).trim() : '';

    if (!trimmed) {
      return res.status(400).json({ 
        success: false, error: 'CONTENT_REQUIRED' 
      });
    }
    if (trimmed.length > 3000) {
      return res.status(400).json({ 
        success: false, error: 'CONTENT_TOO_LONG' 
      });
    }

    const today = new Date()
      .toISOString().split('T')[0];

    const newEntry = {
      authorId: req.user._id,
      content: trimmed,
      createdAt: new Date(),
    };

    // Upsert — create today's page if not exists
    const journal = await Journal.findOneAndUpdate(
      { roomId, date: today },
      { 
        $push: { entries: newEntry },
        $setOnInsert: { roomId, date: today },
      },
      { upsert: true, new: true }
    ).populate('entries.authorId', 'displayName');

    return res.status(200).json({ 
      success: true, 
      journal,
    });
  } catch (err) {
    return sendServerError(res);
  }
});

// GET /journal/on-this-day
router.get('/on-this-day', auth, async (req, res) => {
  try {
    const roomId = req.user.roomId;
    if (!roomId) {
      return res.status(403).json({ 
        success: false, error: 'NOT_IN_ROOM' 
      });
    }

    const now = new Date();
    const checkDates = [
      { label: 'On this day, 1 year ago', 
        ms: 365 * 24 * 60 * 60 * 1000 },
      { label: 'On this day, 6 months ago', 
        ms: 180 * 24 * 60 * 60 * 1000 },
      { label: 'On this day, 1 month ago', 
        ms: 30 * 24 * 60 * 60 * 1000 },
    ];

    const results = [];

    for (const { label, ms } of checkDates) {
      const targetDate = new Date(now.getTime() - ms);
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const post = await Post.findOne({
        roomId,
        parentId: null,
        type: { $ne: 'timed-wish' },
        isSealed: false,
        createdAt: { $gte: startOfDay, $lte: endOfDay },
      })
      .populate('authorId', 'displayName')
      .lean();

      if (post) {
        results.push({ 
          label, 
          post: {
            _id: post._id,
            content: post.content,
            mediaUrl: post.mediaUrl,
            songUrl: post.songUrl,
            songTitle: post.songTitle,
            moodTag: post.moodTag,
            authorName: post.authorId?.displayName,
            createdAt: post.createdAt,
          }
        });
      }
    }

    return res.status(200).json({ 
      success: true, 
      memories: results 
    });
  } catch (err) {
    return res.status(500).json({ 
      success: false, error: 'SERVER_ERROR' 
    });
  }
});

module.exports = router;
