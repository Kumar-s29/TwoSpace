require('dotenv').config();
const connectDB = require('./config/db');
const User = require('./models/User');
const CheckIn = require('./models/CheckIn');

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

    // Create 3 past check-ins
    const pastCheckins = [
      {
        date: '2026-05-21',
        question: 'What is something small that made your day better?',
        answers: [
          { authorId: userA._id, content: 'Had a really good cup of coffee this morning!' },
          { authorId: userB._id, content: 'Saw a cute dog on my walk today.' },
        ],
      },
      {
        date: '2026-05-20',
        question: 'What is one thing you want to let go of this week?',
        answers: [
          { authorId: userA._id, content: 'Letting go of work stress and sleeping earlier.' },
          { authorId: userB._id, content: 'Trying to stop overthinking minor details.' },
        ],
      },
      {
        date: '2026-05-19',
        question: 'What is your favourite memory of us?',
        answers: [
          { authorId: userA._id, content: 'Our weekend trip to the beach last summer.' },
          { authorId: userB._id, content: 'When we got lost in the city and found that amazing dessert spot.' },
        ],
      },
    ];

    for (const c of pastCheckins) {
      await CheckIn.findOneAndUpdate(
        { roomId, date: c.date },
        {
          $set: {
            roomId,
            date: c.date,
            question: c.question,
            isCustom: false,
            answers: c.answers,
          },
        },
        { upsert: true, new: true }
      );
      console.log(`Seeded check-in for date: ${c.date}`);
    }

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
