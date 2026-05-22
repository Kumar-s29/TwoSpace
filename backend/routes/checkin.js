const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const CheckIn = require('../models/CheckIn');
const Room = require('../models/Room');
const questions = require('../data/questions');

const sendServerError = (res) =>
  res.status(500).json({ 
    success: false, error: 'SERVER_ERROR' 
  });

// Helper — get today's date string
const todayStr = () => 
  new Date().toISOString().split('T')[0];

// Helper — pick question for a room on a date
// Uses a deterministic index based on date + roomId
// so both users always see the same question
const pickQuestion = (roomId, date) => {
  const seed = date.replace(/-/g, '') + 
    roomId.toString().slice(-4);
  const index = parseInt(seed, 10) % questions.length;
  return questions[Math.abs(index)];
};

// GET today's check-in
router.get('/today', auth, async (req, res) => {
  try {
    const roomId = req.user.roomId;
    if (!roomId) return res.status(403).json({ 
      success: false, error: 'NOT_IN_ROOM' 
    });

    const today = todayStr();

    // Find or create today's check-in
    let checkIn = await CheckIn.findOne({ 
      roomId, date: today 
    }).populate('answers.authorId', 'displayName');

    if (!checkIn) {
      // Create with today's question
      const question = pickQuestion(
        roomId, today
      );
      checkIn = await CheckIn.findOneAndUpdate(
        { roomId, date: today },
        { 
          $setOnInsert: { 
            roomId, date: today, question 
          } 
        },
        { upsert: true, new: true }
      ).populate('answers.authorId', 'displayName');
    }

    return res.status(200).json({ 
      success: true, checkIn 
    });
  } catch (err) {
    return sendServerError(res);
  }
});

// POST answer today's question
router.post('/answer', auth, async (req, res) => {
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
    if (trimmed.length > 1000) {
      return res.status(400).json({ 
        success: false, error: 'CONTENT_TOO_LONG' 
      });
    }

    const today = todayStr();

    // Check if user already answered today
    const existing = await CheckIn.findOne({
      roomId,
      date: today,
      'answers.authorId': req.user._id,
    });

    if (existing) {
      return res.status(400).json({ 
        success: false, 
        error: 'ALREADY_ANSWERED',
        message: 'You already answered today\'s question.'
      });
    }

    // Ensure today's check-in exists
    const question = pickQuestion(
      roomId, today
    );
    const checkIn = await CheckIn.findOneAndUpdate(
      { roomId, date: today },
      {
        $push: { 
          answers: {
            authorId: req.user._id,
            content: trimmed,
          }
        },
        $setOnInsert: { 
          roomId, date: today, question 
        },
      },
      { upsert: true, new: true }
    ).populate('answers.authorId', 'displayName');

    // Notify partner
    try {
      const room = await Room.findById(roomId)
        .select('userIds');
      if (room) {
        const partnerId = room.userIds.find(
          id => id.toString() !== 
            req.user._id.toString()
        );
        if (partnerId) {
          const partner = await require(
            '../models/User'
          ).findById(partnerId)
            .select('expoPushToken');
          
          if (partner?.expoPushToken?.startsWith(
            'ExponentPushToken['
          )) {
            const { Expo } = require(
              'expo-server-sdk'
            );
            const expo = new Expo();
            await expo.sendPushNotificationsAsync([{
              to: partner.expoPushToken,
              title: 'TwoSpace',
              body: `${req.user.displayName} answered today's question 💬`,
              data: { type: 'checkin_answered' },
            }]);
          }
        }
      }
    } catch (err) {
      // swallow notification errors
    }

    return res.status(200).json({ 
      success: true, checkIn 
    });
  } catch (err) {
    return sendServerError(res);
  }
});

// POST set custom question (replaces today's)
router.post('/custom', auth, async (req, res) => {
  try {
    const roomId = req.user.roomId;
    if (!roomId) return res.status(403).json({ 
      success: false, error: 'NOT_IN_ROOM' 
    });

    const { question } = req.body || {};
    const trimmed = question 
      ? String(question).trim() : '';

    if (!trimmed || trimmed.length < 5) {
      return res.status(400).json({ 
        success: false, error: 'VALIDATION_ERROR',
        message: 'Question must be at least 5 characters.'
      });
    }
    if (trimmed.length > 200) {
      return res.status(400).json({ 
        success: false, error: 'VALIDATION_ERROR',
        message: 'Question max 200 characters.'
      });
    }

    const today = todayStr();

    // Only allow if no answers yet today
    const existing = await CheckIn.findOne({ 
      roomId, date: today 
    });
    if (existing?.answers?.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'ALREADY_ANSWERED',
        message: 'Cannot change the question after someone has answered.'
      });
    }

    const checkIn = await CheckIn.findOneAndUpdate(
      { roomId, date: today },
      { 
        $set: { 
          question: trimmed, 
          isCustom: true,
          answers: [],
        },
        $setOnInsert: { roomId, date: today },
      },
      { upsert: true, new: true }
    ).populate('answers.authorId', 'displayName');

    return res.status(200).json({ 
      success: true, checkIn 
    });
  } catch (err) {
    return sendServerError(res);
  }
});

// GET past check-ins
router.get('/history', auth, async (req, res) => {
  try {
    const roomId = req.user.roomId;
    if (!roomId) return res.status(403).json({ 
      success: false, error: 'NOT_IN_ROOM' 
    });

    const today = todayStr();
    const page = Math.max(
      1, parseInt(req.query.page) || 1
    );
    const limit = 10;

    const total = await CheckIn.countDocuments({ 
      roomId, 
      date: { $lt: today },
      'answers.0': { $exists: true },
    });

    const history = await CheckIn.find({ 
      roomId,
      date: { $lt: today },
      'answers.0': { $exists: true },
    })
    .sort({ date: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('answers.authorId', 'displayName')
    .lean();

    return res.status(200).json({
      success: true,
      history,
      pagination: {
        page,
        totalPages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (err) {
    return sendServerError(res);
  }
});

module.exports = router;
