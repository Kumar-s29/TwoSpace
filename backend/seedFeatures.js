require('dotenv').config();
const connectDB = require('./config/db');
const User = require('./models/User');
const BucketItem = require('./models/BucketItem');
const Milestone = require('./models/Milestone');

async function seed() {
  await connectDB();

  try {
    const userA = await User.findOne({ email: 'user@example.com' });
    const userB = await User.findOne({ email: 'user2@example.com' });

    if (!userA || !userB) {
      console.log('Error: Could not find user@example.com or user2@example.com in the database.');
      process.exit(1);
    }

    if (!userA.roomId || !userB.roomId || userA.roomId.toString() !== userB.roomId.toString()) {
      console.log('Error: Users do not share a room or are not in a room.');
      process.exit(1);
    }

    const roomId = userA.roomId;
    console.log(`Found users sharing roomId: ${roomId}`);

    // Clear existing bucket items and milestones for this room to avoid duplicates
    await BucketItem.deleteMany({ roomId });
    await Milestone.deleteMany({ roomId });
    console.log('Cleared existing bucket items and milestones for this room.');

    // 1. Seed Bucket List Items
    const bucketItems = [
      {
        roomId,
        createdBy: userA._id,
        title: 'Go skydiving',
        note: 'High-altitude jump somewhere scenic.',
        isDone: false,
      },
      {
        roomId,
        createdBy: userB._id,
        title: 'Visit Japan in autumn',
        note: 'Watch the red maple leaves in Kyoto!',
        isDone: false,
      },
      {
        roomId,
        createdBy: userA._id,
        title: 'Bake a chocolate soufflé together',
        note: 'Make sure it actually rises!',
        isDone: true,
        completedBy: userB._id,
        completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      },
      {
        roomId,
        createdBy: userB._id,
        title: 'Watch the sunrise',
        note: 'Woke up at 5am to see it from the balcony.',
        isDone: true,
        completedBy: userA._id,
        completedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      },
    ];

    for (const item of bucketItems) {
      await BucketItem.create(item);
    }
    console.log(`Seeded ${bucketItems.length} bucket list items.`);

    // 2. Seed Milestones
    // We base dates relative to current date (May 22, 2026)
    // 3 days in the future relative to 2026-05-22 is 2026-05-25 (Anniversary)
    const milestones = [
      {
        roomId,
        createdBy: userA._id,
        title: 'Our First Anniversary',
        date: new Date('2025-05-25T08:00:00.000Z'), // Next recurring occurrence will be 2026-05-25
        note: 'One whole year together! 💖',
        emoji: '💑',
        isRecurring: true,
      },
      {
        roomId,
        createdBy: userB._id,
        title: 'Trip to Tokyo',
        date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days in the future
        note: 'Tickets are booked, hotel is reserved!',
        emoji: '✈️',
        isRecurring: false,
      },
      {
        roomId,
        createdBy: userA._id,
        title: 'First Date',
        date: new Date('2025-04-10T12:00:00.000Z'), // Past date
        note: 'Met up at that cozy little coffee shop.',
        emoji: '❤️',
        isRecurring: false,
      },
      {
        roomId,
        createdBy: userB._id,
        title: 'Moved in together',
        date: new Date('2026-02-22T10:00:00.000Z'), // Past date (3 months ago)
        note: 'Unpacking boxes and making the place ours.',
        emoji: '🏠',
        isRecurring: false,
      },
    ];

    for (const m of milestones) {
      await Milestone.create(m);
    }
    console.log(`Seeded ${milestones.length} milestones.`);

    console.log('Seeding completed successfully!');
  } catch (err) {
    console.error('Seeding failed:', err);
  } finally {
    const mongoose = require('mongoose');
    await mongoose.connection.close();
    console.log('Database connection closed.');
    process.exit(0);
  }
}

seed();
