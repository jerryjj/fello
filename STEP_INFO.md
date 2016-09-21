# Awesome, now do not get burned

Welcome to the part four, of this demo.
The next instructions make the assumption that you have already finished the
previous steps.

* 1. Deploy Storage rules

Copy the _storage.rules.tpl_ file as _storage.rules_ and replace
the *FIREBASE_PROJECT_ID* with correct project id.
Then deploy these rules to Firebase.

```sh
firebase deploy --only storage
```

* 2. Test the application locally

```sh
npm run dev
```

* 3. Deploy this new version to to Firebase Hosting

```sh
npm run deploy
```
