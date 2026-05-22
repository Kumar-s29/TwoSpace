const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const BucketItem = require('../models/BucketItem');
const Post = require('../models/Post');

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

// GET all bucket list items
router.get('/', auth, async (req, res) => {
  try {
    const roomId = requireRoom(req, res);
    if (!roomId) return;

    const items = await BucketItem.find({ roomId })
      .sort({ isDone: 1, createdAt: -1 })
      .populate('createdBy', 'displayName')
      .populate('completedBy', 'displayName')
      .lean();

    return res.status(200).json({ 
      success: true, items 
    });
  } catch (err) {
    return sendServerError(res);
  }
});

// POST add new item
router.post('/', auth, async (req, res) => {
  try {
    const roomId = requireRoom(req, res);
    if (!roomId) return;

    const { title, note } = req.body || {};
    const trimmedTitle = title 
      ? String(title).trim() : '';

    if (!trimmedTitle || trimmedTitle.length < 1) {
      return res.status(400).json({ 
        success: false, error: 'TITLE_REQUIRED' 
      });
    }
    if (trimmedTitle.length > 100) {
      return res.status(400).json({ 
        success: false, error: 'TITLE_TOO_LONG' 
      });
    }

    const item = await BucketItem.create({
      roomId,
      createdBy: req.user._id,
      title: trimmedTitle,
      note: note ? String(note).trim() : null,
    });

    const populated = await BucketItem.findById(
      item._id
    )
    .populate('createdBy', 'displayName')
    .lean();

    return res.status(200).json({ 
      success: true, item: populated 
    });
  } catch (err) {
    return sendServerError(res);
  }
});

// PATCH toggle done/undone
router.patch('/:id/toggle', auth, 
  async (req, res) => {
  try {
    const roomId = requireRoom(req, res);
    if (!roomId) return;

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, error: 'BAD_ID' 
      });
    }

    const item = await BucketItem.findById(id);
    if (!item) {
      return res.status(404).json({ 
        success: false, error: 'NOT_FOUND' 
      });
    }
    if (item.roomId.toString() !== 
      roomId.toString()) {
      return res.status(403).json({ 
        success: false, error: 'FORBIDDEN' 
      });
    }

    item.isDone = !item.isDone;
    if (item.isDone) {
      item.completedBy = req.user._id;
      item.completedAt = new Date();
    } else {
      item.completedBy = null;
      item.completedAt = null;
    }
    await item.save();

    return res.status(200).json({ 
      success: true, 
      isDone: item.isDone,
      item,
    });
  } catch (err) {
    return sendServerError(res);
  }
});

// POST create timeline post for completion
router.post('/:id/celebrate', auth, 
  async (req, res) => {
  try {
    const roomId = requireRoom(req, res);
    if (!roomId) return;

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, error: 'BAD_ID' 
      });
    }

    const item = await BucketItem.findById(id);
    if (!item || !item.isDone) {
      return res.status(400).json({ 
        success: false, error: 'NOT_COMPLETED' 
      });
    }
    if (item.roomId.toString() !== 
      roomId.toString()) {
      return res.status(403).json({ 
        success: false, error: 'FORBIDDEN' 
      });
    }

    // Create a celebration post on the timeline
    const post = await Post.create({
      roomId,
      authorId: req.user._id,
      type: 'post',
      content: `✅ We did it — ${item.title}`,
      parentId: null,
      isSealed: false,
    });

    // Emit socket so partner sees it live
    if (req.io && typeof req.io.emit === 'function') {
      req.io.emit('new_post', {
        roomId: roomId.toString(),
        post,
      });
    }

    return res.status(200).json({ 
      success: true, post 
    });
  } catch (err) {
    return sendServerError(res);
  }
});

// DELETE item (only creator can delete)
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

    const item = await BucketItem.findById(id);
    if (!item) {
      return res.status(404).json({ 
        success: false, error: 'NOT_FOUND' 
      });
    }
    if (item.roomId.toString() !== 
      roomId.toString()) {
      return res.status(403).json({ 
        success: false, error: 'FORBIDDEN' 
      });
    }
    if (item.createdBy.toString() !== 
      req.user._id.toString()) {
      return res.status(403).json({ 
        success: false, error: 'FORBIDDEN' 
      });
    }

    await BucketItem.deleteOne({ _id: id });

    return res.status(200).json({ 
      success: true 
    });
  } catch (err) {
    return sendServerError(res);
  }
});

module.exports = router;
