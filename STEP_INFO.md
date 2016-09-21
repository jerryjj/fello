# Terrific! This is just an extra for the demo

Welcome to the part six, of this demo.
The next instructions make the assumption that you have already finished the
previous steps.

* 1. Deploy new Database rules

```sh
firebase deploy --only database
```

* 2. Configure the Cloud Messaging Sender ID

The Server key and this Sender ID can be found in your Firebase Console at
Project Settings > CLOUD MESSAGING

Edit the README.md or set the value in environment

```sh
export FIREBASE_MSG_SENDER_ID=MY-SENDER-ID
```

* 3. Test the application locally

```sh
npm run dev
```

* 4. Send demo push notification to yourself

```sh
curl --header "Authorization: key=YOUR_KEY_HERE" \
--header "Content-Type: application/json" \
https://fcm.googleapis.com/fcm/send -d "{\"registration_ids\":[\"YOUR_REGISTRATION_TOKEN_HERE\"]}"
```

* 5. Deploy this new version to to Firebase Hosting

```sh
npm run deploy
```

* 6. Optional run a server to automatically send pushes to friends (in different terminal)

As this demo was supposed to be serverless, this step is just an example of doing really simple server side processing
using Node.JS.

* 6.1 Install dependencies

```sh
npm install
```

* 6.2 Create your self a Service Account and download it as service-account.json

You can follow the instructions in [here](https://firebase.google.com/docs/server/setup)

* 6.3 Configure the Cloud Messaging Server Key to environment

```sh
export FIREBASE_SERVER_KEY=MY-SERVER-KEY
```
