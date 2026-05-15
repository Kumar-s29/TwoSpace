const { Expo } = require('expo-server-sdk');
const Room = require('../models/Room');
const User = require('../models/User');

const expo = new Expo();

const isExpoPushToken = (token) =>
  typeof token === 'string' && token.startsWith('ExponentPushToken[');

const notifyPartner = async ({ roomId, senderUserId, title, body, data = {} }) => {
  try {
    const room = await Room.findById(roomId).select('userIds');
    if (!room) return;

    const partnerId = (room.userIds || []).find((id) => id.toString() !== senderUserId.toString());
    if (!partnerId) return;

    const partner = await User.findById(partnerId).select('expoPushToken');
    if (!partner) return;

    const token = partner.expoPushToken;
    if (!isExpoPushToken(token)) return;

    const messages = [
      {
        to: token,
        sound: 'default',
        title,
        body,
        data,
      },
    ];

    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      let tickets = [];
      try {
        tickets = await expo.sendPushNotificationsAsync(chunk);
      } catch (err) {
        continue;
      }

      const receiptIds = [];
      for (const ticket of tickets) {
        if (ticket.status === 'ok' && ticket.id) {
          receiptIds.push(ticket.id);
        }
        if (ticket.status === 'error' && ticket.details && ticket.details.error === 'DeviceNotRegistered') {
          partner.expoPushToken = null;
          await partner.save();
        }
      }

      const receiptIdChunks = expo.chunkPushNotificationReceiptIds(receiptIds);
      for (const receiptIdChunk of receiptIdChunks) {
        let receipts = {};
        try {
          receipts = await expo.getPushNotificationReceiptsAsync(receiptIdChunk);
        } catch (err) {
          continue;
        }
        for (const receiptId in receipts) {
          const receipt = receipts[receiptId];
          if (receipt.status === 'error' && receipt.details && receipt.details.error === 'DeviceNotRegistered') {
            partner.expoPushToken = null;
            await partner.save();
          }
        }
      }
    }
  } catch (err) {
    // Never crash caller on notification failures
  }
};

module.exports = { notifyPartner };

