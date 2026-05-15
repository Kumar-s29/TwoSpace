const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const parts = authHeader.split(' ');
    const token = parts.length === 2 && parts[0] === 'Bearer' ? parts[1] : null;

    if (!token) {
      return res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ success: false, error: 'SERVER_ERROR' });
    }

    const decoded = jwt.verify(token, secret);
    const userId = decoded && decoded.userId ? decoded.userId : null;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
    }

    req.user = user;
    return next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'UNAUTHORIZED' });
  }
};

module.exports = auth;

