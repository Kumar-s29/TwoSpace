const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DISPLAYNAME_REGEX = /^[A-Za-z0-9 -]+$/;

const signToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

router.post('/register', async (req, res) => {
  try {
    const { email, password, displayName } = req.body || {};

    if (!email || !password || !displayName) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Missing required field.',
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedDisplayName = String(displayName).trim();
    const passwordStr = String(password);

    if (normalizedEmail.length > 254 || !EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({ success: false, error: 'INVALID_EMAIL' });
    }

    if (
      passwordStr.length < 8 ||
      passwordStr.length > 72 ||
      !/[0-9]/.test(passwordStr)
    ) {
      return res.status(400).json({ success: false, error: 'WEAK_PASSWORD' });
    }

    if (
      normalizedDisplayName.length < 2 ||
      normalizedDisplayName.length > 30 ||
      !DISPLAYNAME_REGEX.test(normalizedDisplayName)
    ) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message:
          'displayName must be 2-30 chars and contain only letters, numbers, spaces, and hyphens.',
      });
    }

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ success: false, error: 'EMAIL_EXISTS' });
    }

    const saltRounds = 12;
    const hashed = await bcrypt.hash(passwordStr, saltRounds);

    const user = await User.create({
      email: normalizedEmail,
      password: hashed,
      displayName: normalizedDisplayName,
      roomId: null,
    });

    const token = signToken(user._id.toString());

    return res.status(200).json({
      success: true,
      message: 'Account created successfully.',
      token,
      user: {
        _id: user._id,
        email: user.email,
        displayName: user.displayName,
        roomId: user.roomId,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'SERVER_ERROR' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'VALIDATION_ERROR' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const passwordStr = String(password);

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'INVALID_CREDENTIALS',
      });
    }

    const match = await bcrypt.compare(passwordStr, user.password);
    if (!match) {
      return res.status(401).json({
        success: false,
        error: 'INVALID_CREDENTIALS',
      });
    }

    const token = signToken(user._id.toString());

    return res.status(200).json({
      success: true,
      token,
      user: {
        _id: user._id,
        email: user.email,
        displayName: user.displayName,
        roomId: user.roomId,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'SERVER_ERROR' });
  }
});

router.get('/me', auth, async (req, res) => {
  return res.status(200).json({
    success: true,
    user: {
      _id: req.user._id,
      email: req.user.email,
      displayName: req.user.displayName,
      roomId: req.user.roomId,
      createdAt: req.user.createdAt,
    },
  });
});

module.exports = router;
