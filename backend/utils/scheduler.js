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

  // Daily check-in questions midnight scheduler
  cron.schedule('0 0 * * *', async () => {
    try {
      const rooms = await Room.find({ 
        status: 'active' 
      }).select('_id userIds');

      const questions = require('../data/questions');
      const today = new Date()
        .toISOString().split('T')[0];

      for (const room of rooms) {
        try {
          // Pre-create today's check-in with
          // the question so both users see the
          // same question when they open the app
          const seed = today.replace(/-/g, '') + 
            room._id.toString().slice(-4);
          const index = Math.abs(
            parseInt(seed, 10) % questions.length
          );
          const question = questions[index];

          await require('../models/CheckIn')
            .findOneAndUpdate(
              { roomId: room._id, date: today },
              { $setOnInsert: { 
                roomId: room._id, 
                date: today, 
                question 
              }},
              { upsert: true, new: true }
            );

          // Notify both users of new question
          for (const userId of room.userIds) {
            await notifyPartner({
              roomId: room._id,
              senderUserId: userId,
              title: 'TwoSpace — Daily Question',
              body: question.substring(0, 80),
              data: { type: 'daily_question' },
            });
          }
        } catch (err) {
          continue;
        }
      }
      console.log('Daily check-in questions created');
    } catch (err) {
      console.error('Check-in scheduler error:', err);
    }
  });

  // Milestone notifications scheduler (8:00 AM daily)
  cron.schedule('0 8 * * *', async () => {
    try {
      const Milestone = require('../models/Milestone');
      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(now);
      todayEnd.setHours(23, 59, 59, 999);
      
      // 3 days from now for reminders
      const reminderDate = new Date(now);
      reminderDate.setDate(
        reminderDate.getDate() + 3
      );
      const reminderStart = new Date(reminderDate);
      reminderStart.setHours(0, 0, 0, 0);
      const reminderEnd = new Date(reminderDate);
      reminderEnd.setHours(23, 59, 59, 999);

      const rooms = await Room.find({ 
        status: 'active' 
      }).select('_id userIds');

      for (const room of rooms) {
        try {
          // Check TODAY's milestones
          const todayMilestones = await 
            Milestone.find({
              roomId: room._id,
              $or: [
                // Exact date match
                { 
                  date: { 
                    $gte: todayStart, 
                    $lte: todayEnd 
                  } 
                },
                // Recurring — same month/day
                { 
                  isRecurring: true,
                  $expr: {
                    $and: [
                      { $eq: [
                        { $month: '$date' }, 
                        now.getMonth() + 1
                      ]},
                      { $eq: [
                        { $dayOfMonth: '$date' }, 
                        now.getDate()
                      ]},
                    ]
                  }
                }
              ]
            });

          for (const m of todayMilestones) {
            for (const userId of room.userIds) {
              await notifyPartner({
                roomId: room._id,
                senderUserId: userId,
                title: `${m.emoji} ${m.title}`,
                body: m.isRecurring
                  ? `Today is your ${m.title}! 🎉`
                  : `Milestone day — ${m.title}`,
                data: { 
                  type: 'milestone_today',
                  milestoneId: m._id.toString(),
                },
              });
            }
          }

          // Check 3-DAY REMINDERS
          const upcomingMilestones = await 
            Milestone.find({
              roomId: room._id,
              $or: [
                { 
                  date: { 
                    $gte: reminderStart, 
                    $lte: reminderEnd 
                  } 
                },
                { 
                  isRecurring: true,
                  $expr: {
                    $and: [
                      { $eq: [
                        { $month: '$date' }, 
                        reminderDate.getMonth() + 1
                      ]},
                      { $eq: [
                        { $dayOfMonth: '$date' }, 
                        reminderDate.getDate()
                      ]},
                    ]
                  }
                }
              ]
            });

          for (const m of upcomingMilestones) {
            for (const userId of room.userIds) {
              await notifyPartner({
                roomId: room._id,
                senderUserId: userId,
                title: `Coming up — ${m.title}`,
                body: `${m.emoji} In 3 days: ${m.title}`,
                data: { 
                  type: 'milestone_reminder',
                  milestoneId: m._id.toString(),
                },
              });
            }
          }
        } catch (err) {
          continue;
        }
      }
      console.log('Milestone notifications sent');
    } catch (err) {
      console.error('Milestone scheduler error:', err);
    }
  });
};

