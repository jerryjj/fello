# Good job!

Welcome to the part two, of this demo.
The next instructions make the assumption that you have already finished the
previous step.

* 1. Enable Google Authentication in your Firebase project

Go to your [Firebase console](https://console.firebase.google.com) and navigate to
Auth / SIGN_IN METHOD. From there enable the Google Sign-in provider.

* 2. Deploy new Database rules

```sh
firebase deploy --only database
```

* 3. Test the application locally

```sh
npm run dev
```

Login with your Google account (and log out)

* 4. Deploy this new version to to Firebase Hosting

```sh
npm run deploy
```
