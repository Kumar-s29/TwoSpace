const cron = require('node-cron');
const Post = require('../models/Post');
const Room = require('../models/Room');
const { notifyPartner } = require('./notify');

module.exports = function (io) {
  cron.schedule('* * * * *', async () => {
    let postsToUnlock = [];

    try {
      postsToUnlock = await Post.find({
        isSealed: true,
        type: 'timed-wish',
        unlocksAt: { $lte: new Date() },
      });
    } catch (err) {
      return;
    }

    for (const post of postsToUnlock) {
      try {
        post.isSealed = false;
        await post.save();

        console.log(`Wish unlocked: ${post._id}`);

        // Receiver is the partner (not the author)
        const room = await Room.findById(post.roomId).select('userIds');
        if (room) {
          const partnerId = (room.userIds || []).find(
            (id) => id.toString() !== post.authorId.toString()
          );

          if (partnerId) {
            await notifyPartner({
              roomId: post.roomId,
              senderUserId: post.authorId,
              title: 'TwoSpace',
              body: 'A wish just unlocked for you!',
              data: { type: 'wish_unlocked', postId: post._id.toString() },
            });
          }
        }

        if (io && typeof io.emit === 'function') {
          io.emit('wish_unlocked', {
            roomId: post.roomId.toString(),
            postId: post._id.toString(),
          });
        }
      } catch (err) {
        continue;
      }
    }
  });
};
