const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Milestone = require('../models/Milestone');

const sendServerError = (res) =>
  res.status(500).json({ 
    success: false, error: 'SERVER_ERROR' 
  });

const requireRoom = (req, res) => {
  if (!req.user?.roomId) {
    res.status(403).json({ 
      success: false, error: 'NOT_IN_ROOM' 
    });
    return null;
  }
  return req.user.roomId;
};

// GET all milestones sorted by date
router.get('/', auth, async (req, res) => {
  try {
    const roomId = requireRoom(req, res);
    if (!roomId) return;

    const milestones = await Milestone.find({ 
      roomId 
    })
    .sort({ date: 1 })
    .lean();

    return res.status(200).json({ 
      success: true, milestones 
    });
  } catch (err) {
    return sendServerError(res);
  }
});

// POST create milestone
router.post('/', auth, async (req, res) => {
  try {
    const roomId = requireRoom(req, res);
    if (!roomId) return;

    const { title, date, note, emoji, 
      isRecurring } = req.body || {};

    const trimmedTitle = title 
      ? String(title).trim() : '';
    if (!trimmedTitle) {
      return res.status(400).json({ 
        success: false, error: 'TITLE_REQUIRED' 
      });
    }
    if (trimmedTitle.length > 80) {
      return res.status(400).json({ 
        success: false, error: 'TITLE_TOO_LONG' 
      });
    }

    if (!date) {
      return res.status(400).json({ 
        success: false, error: 'DATE_REQUIRED' 
      });
    }
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ 
        success: false, error: 'INVALID_DATE' 
      });
    }

    const milestone = await Milestone.create({
      roomId,
      createdBy: req.user._id,
      title: trimmedTitle,
      date: parsedDate,
      note: note ? String(note).trim() : null,
      emoji: emoji ? String(emoji).trim() : '⭐',
      isRecurring: Boolean(isRecurring),
    });

    return res.status(200).json({ 
      success: true, milestone 
    });
  } catch (err) {
    return sendServerError(res);
  }
});

// DELETE milestone
router.delete('/:id', auth, async (req, res) => {
  try {
    const roomId = requireRoom(req, res);
    if (!roomId) return;

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, error: 'BAD_ID' 
      });
    }

    const milestone = await Milestone.findById(id);
    if (!milestone) {
      return res.status(404).json({ 
        success: false, error: 'NOT_FOUND' 
      });
    }
    if (milestone.roomId.toString() !== 
      roomId.toString()) {
      return res.status(403).json({ 
        success: false, error: 'FORBIDDEN' 
      });
    }

    await Milestone.deleteOne({ _id: id });

    return res.status(200).json({ 
      success: true 
    });
  } catch (err) {
    return sendServerError(res);
  }
});

module.exports = router;
