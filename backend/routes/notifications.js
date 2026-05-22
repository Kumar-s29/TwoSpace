const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

router.post('/token', auth, async (req, res) => {
  try {
    const { expoPushToken } = req.body || {};
    if (!expoPushToken) {
      return res.status(400).json({ success: false, error: 'TOKEN_REQUIRED' });
    }

    await User.updateOne(
      { _id: req.user._id },
      { $set: { expoPushToken } }
    );

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'SERVER_ERROR' });
  }
});

module.exports = router;

