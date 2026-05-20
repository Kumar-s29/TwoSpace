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

  cron.schedule('0 9 * * *', async () => {
    try {
      const now = new Date();
      
      // Check 1 year ago, 6 months ago, 1 month ago
      const checkDates = [
        { label: '1 year ago', 
          ms: 365 * 24 * 60 * 60 * 1000 },
        { label: '6 months ago', 
          ms: 180 * 24 * 60 * 60 * 1000 },
        { label: '1 month ago', 
          ms: 30 * 24 * 60 * 60 * 1000 },
      ];
      
      for (const { label, ms } of checkDates) {
        const targetDate = new Date(now.getTime() - ms);
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);
        
        // Find all rooms
        const rooms = await Room.find({ 
          status: 'active' 
        }).select('_id userIds');
        
        for (const room of rooms) {
          try {
            const post = await Post.findOne({
              roomId: room._id,
              parentId: null,
              type: { $ne: 'timed-wish' },
              isSealed: false,
              createdAt: { 
                $gte: startOfDay, 
                $lte: endOfDay 
              },
            }).sort({ createdAt: 1 });
            
            if (!post) continue;
            
            const preview = post.content
              ? post.content.substring(0, 60)
              : post.mediaUrl 
                ? '📷 A photo'
                : post.songUrl 
                  ? '🎵 A song'
                  : 'A memory';
            
            // Notify both users in the room
            for (const userId of room.userIds) {
              await notifyPartner({
                roomId: room._id,
                senderUserId: userId,
                title: `On this day — ${label}`,
                body: preview,
                data: { 
                  type: 'on_this_day',
                  postId: post._id.toString(),
                },
              });
            }
          } catch (err) {
            continue;
          }
        }
      }
    } catch (err) {
      console.error('On this day scheduler error:', err);
    }
  });
};
