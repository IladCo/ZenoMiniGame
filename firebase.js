const admin = require('firebase-admin');
const path = require('path');

// Path to your Firebase service account key JSON
const serviceAccount = path.join(__dirname, 'firebase.json');

// Initialize Firebase Admin SDK with your service account credentials
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://zeno-lend-game-default-rtdb.firebaseio.com/' 
});

// Get a reference to the Firebase Realtime Database
const db = admin.database();

// Export the Firebase database reference so you can use it in other files
module.exports = db;
