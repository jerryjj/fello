'use strict';

const fs = require('fs');
const path = require('path');
const firebase = require('firebase');
const https = require('https');

const serviceAccount = JSON.parse(fs.readFileSync(
  path.join(__dirname, '../..', 'service-account.json')
));

firebase.initializeApp({
  serviceAccount: serviceAccount,
  databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
});

const now = new Date().getTime();

const db = firebase.database();
const ref = db.ref('/messages');
let initialDataLoaded = false;

ref.once('value', (snap) => {
  initialDataLoaded = true;
});
ref.on('child_added', (snapshot) => {
  if (!initialDataLoaded) {
    return;
  }
  const message = snapshot.val();
  console.log('new message created', message);
  getUsersFriends(message.uid).then((friends) => {
    const friendIds = Object.keys(friends);
    console.log('got friends', friendIds);
    getPushTokenForUsers(friendIds)
    .then((tokens) => {
      console.log('got tokens', tokens);
      if (tokens.length) {
        sendPushNotifications(tokens);
      }
    });
  });
});

const getUsersFriends = (uid) => {
  return new Promise((resolve) => {
    db.ref(`/users-friends/${uid}`).once("value", (snapshot) => {
      resolve(snapshot.val());
    });
  });
};

const getPushTokenForUsers = (uids) => {
  return new Promise((resolve, reject) => {
    const tasks = [];
    const tokens = [];
    uids.forEach((uid) => {
      tasks.push(new Promise((taskResolve) => {
        db.ref(`/pushtokens/${uid}`).once("value", (snapshot) => {
          if (snapshot && snapshot.val()) {
            tokens.push(snapshot.val());
          }
          taskResolve();
        });
      }));
    });
    Promise.all(tasks).then(() => {
      resolve(tokens);
    }).catch(reject);
  });
};

const sendPushNotifications = (targets) => {
  const req = https.request({
    host: 'fcm.googleapis.com',
    port: 443,
    path: '/fcm/send',
    method: 'POST',
    headers: {
      Authorization: `key=${process.env.FIREBASE_SERVER_KEY}`,
      'Content-Type': 'application/json'
    }
  }, (res) => {
    res.setEncoding('utf8');
    res.on('data', function (chunk) {
      console.log('Response: ' + chunk);
    });
  });
  req.write(JSON.stringify({
    registration_ids: targets
  }));
  req.end();
};
