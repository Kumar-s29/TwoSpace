const cron = require('node-cron');
const Post = require('../models/Post');
const Capsule = require('../models/Capsule');
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

  cron.schedule('* * * * *', async () => {
    let capsulesToOpen = [];
    try {
      capsulesToOpen = await Capsule.find({
        isSealed: true,
        status: 'sealed',
        opensAt: { $lte: new Date() },
      });
    } catch (err) {
      return;
    }

    for (const capsule of capsulesToOpen) {
      try {
        // Unseal the capsule
        capsule.isSealed = false;
        capsule.status = 'opened';
        await capsule.save();

        // Unseal all posts in this capsule
        await Post.updateMany({ capsuleId: capsule._id }, { $set: { isSealed: false } });

        console.log(`Capsule opened: ${capsule._id}`);

        // Notify both users
        const room = await Room.findById(capsule.roomId).select('userIds');
        if (room) {
          for (const userId of room.userIds) {
            await notifyPartner({
              roomId: capsule.roomId,
              senderUserId: userId,
              title: 'TwoSpace',
              body: `Your Memory Capsule "${capsule.title}" just opened! 🎉`,
              data: { type: 'capsule_opened', capsuleId: capsule._id.toString() },
            });
          }
        }

        if (io && typeof io.emit === 'function') {
          io.emit('capsule_opened', {
            roomId: capsule.roomId.toString(),
            capsuleId: capsule._id.toString(),
          });
        }
      } catch (err) {
        continue;
      }
    }
  });
};
