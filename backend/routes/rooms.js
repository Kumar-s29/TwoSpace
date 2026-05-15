const express = require('express');
const crypto = require('crypto');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Room = require('../models/Room');
const User = require('../models/User');

const router = express.Router();

const sendServerError = (res) =>
  res.status(500).json({ success: false, error: 'SERVER_ERROR' });

const requireActiveRoom = async (user) => {
  if (!user.roomId || !mongoose.isValidObjectId(user.roomId)) return null;
  return Room.findOne({ _id: user.roomId, status: 'active' });
};

router.post('/create-invite', auth, async (req, res) => {
  try {
    if (req.user.roomId !== null) {
      return res.status(400).json({ success: false, error: 'ALREADY_CONNECTED' });
    }

    const now = new Date();
    const existing = await Room.findOne({
      status: 'active',
      userIds: req.user._id,
      inviteToken: { $ne: null },
      inviteExpiry: { $gt: now },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'INVITE_EXISTS',
        expiresAt: existing.inviteExpiry,
      });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const room = await Room.create({
      userIds: [req.user._id],
      inviteToken: token,
      inviteExpiry: expiresAt,
      status: 'active',
    });

    return res.status(200).json({
      success: true,
      inviteLinkHttps: `https://twospace.app/join/${token}`,
      inviteLinkDeep: `twospace://join/${token}`,
      expiresAt: room.inviteExpiry,
    });
  } catch (err) {
    return sendServerError(res);
  }
});

router.post('/join/:token', auth, async (req, res) => {
  try {
    if (req.user.roomId !== null) {
      return res.status(400).json({ success: false, error: 'ALREADY_CONNECTED' });
    }

    const token = String(req.params.token || '').trim();
    if (!token) {
      return res.status(400).json({ success: false, error: 'INVALID_TOKEN' });
    }

    const room = await Room.findOne({ inviteToken: token, status: 'active' });
    if (!room) {
      return res.status(400).json({ success: false, error: 'INVALID_TOKEN' });
    }

    const expiry = room.inviteExpiry ? new Date(room.inviteExpiry) : null;
    if (!expiry || expiry.getTime() <= Date.now()) {
      room.inviteToken = null;
      room.inviteExpiry = null;
      await room.save();
      return res.status(400).json({ success: false, error: 'TOKEN_EXPIRED' });
    }

    if (room.userIds.some((id) => id.equals(req.user._id))) {
      return res.status(400).json({
        success: false,
        error: 'CANNOT_JOIN_OWN_LINK',
      });
    }

    const creatorId = room.userIds && room.userIds.length > 0 ? room.userIds[0] : null;
    if (!creatorId) {
      return res.status(400).json({ success: false, error: 'INVALID_TOKEN' });
    }

    if (room.userIds.length > 2) {
      return res.status(500).json({ success: false, error: 'SERVER_ERROR' });
    }

    room.userIds = [creatorId, req.user._id];
    room.inviteToken = null;
    room.inviteExpiry = null;
    await room.save();

    const creatorUser = await User.findById(creatorId);
    if (!creatorUser) {
      return sendServerError(res);
    }

    creatorUser.roomId = room._id;
    await creatorUser.save();

    req.user.roomId = room._id;
    await req.user.save();

    return res.status(200).json({
      success: true,
      message: 'Connected successfully.',
      room: {
        _id: room._id,
        userIds: room.userIds,
        createdAt: room.createdAt,
      },
      partner: { displayName: creatorUser.displayName, userId: creatorUser._id },
    });
  } catch (err) {
    return sendServerError(res);
  }
});

router.get('/my-room', auth, async (req, res) => {
  try {
    const room = await requireActiveRoom(req.user);
    if (!room) {
      return res.status(404).json({ success: false, error: 'NO_ROOM' });
    }

    const partnerId = room.userIds.find((id) => !id.equals(req.user._id));
    if (!partnerId) {
      return res.status(404).json({ success: false, error: 'NO_ROOM' });
    }

    const partnerUser = await User.findById(partnerId).select('_id displayName');
    if (!partnerUser) {
      return sendServerError(res);
    }

    return res.status(200).json({
      success: true,
      room: {
        _id: room._id,
        status: room.status,
        createdAt: room.createdAt,
        partner: { displayName: partnerUser.displayName, userId: partnerUser._id },
      },
    });
  } catch (err) {
    return sendServerError(res);
  }
});

router.post('/archive', auth, async (req, res) => {
  try {
    const room = await requireActiveRoom(req.user);
    if (!room) {
      return res.status(404).json({ success: false, error: 'NO_ROOM' });
    }

    room.status = 'archived';
    await room.save();

    await User.updateMany({ _id: { $in: room.userIds } }, { $set: { roomId: null } });

    return res.status(200).json({
      success: true,
      message: 'Space archived. Your memories are preserved.',
    });
  } catch (err) {
    return sendServerError(res);
  }
});

router.delete('/close', auth, async (req, res) => {
  try {
    const { confirmText } = req.body || {};
    if (confirmText !== 'DELETE MY SPACE') {
      return res.status(400).json({ success: false, error: 'CONFIRM_MISMATCH' });
    }

    const room = await requireActiveRoom(req.user);
    if (!room) {
      return res.status(404).json({ success: false, error: 'NO_ROOM' });
    }

    const roomId = room._id;
    await User.updateMany({ _id: { $in: room.userIds } }, { $set: { roomId: null } });

    // Delete all posts for this room without relying on Post model (Phase 2 constraint)
    await mongoose.connection.collection('posts').deleteMany({ roomId });

    await Room.deleteOne({ _id: roomId });

    return res.status(200).json({
      success: true,
      message: 'Space permanently deleted.',
    });
  } catch (err) {
    return sendServerError(res);
  }
});

module.exports = router;
