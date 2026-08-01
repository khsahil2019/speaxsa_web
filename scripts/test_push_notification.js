require('dotenv').config();
const { sendPushNotification } = require('../src/services/FCMService');

async function main() {
  const fcmToken = process.argv[2];
  const title = process.argv[3] || '🎉 Test Notification from Speaxa';
  const body = process.argv[4] || 'Your mobile push notification setup is working perfectly!';

  if (!fcmToken) {
    console.log('\n❌ Error: Please provide a target FCM Token.');
    console.log('Usage: node scripts/test_push_notification.js <FCM_TOKEN> "Notification Title" "Notification Message"\n');
    process.exit(1);
  }

  console.log(`\n🚀 Sending push notification to token: ${fcmToken}`);
  console.log(`📌 Title: ${title}`);
  console.log(`💬 Message: ${body}\n`);

  try {
    const response = await sendPushNotification(fcmToken, title, body, { type: 'test_notification' });
    console.log('✅ Push notification executed! Result:', response);
  } catch (error) {
    console.error('❌ Failed to send push notification:', error.message);
  }
}

main();
