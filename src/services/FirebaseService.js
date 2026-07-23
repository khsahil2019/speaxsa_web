const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

function getFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin;
  }

  try {
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json';
    const absolutePath = path.resolve(process.cwd(), serviceAccountPath);

    if (fs.existsSync(absolutePath)) {
      const serviceAccount = require(absolutePath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('[FirebaseAdmin] Initialized with Service Account Certificate');
    } else {
      admin.initializeApp({
        credential: admin.credential.applicationDefault()
      });
      console.log('[FirebaseAdmin] Initialized with Application Default Credentials');
    }
  } catch (err) {
    console.warn('[FirebaseAdmin] Initialization warning:', err.message);
  }

  return admin;
}

module.exports = {
  getFirebaseAdmin
};
