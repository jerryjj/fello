# Fello - Firebase Social Messaging

This is an example project to demonstrate serverless coding with Firebase.
Demo: https://fello.backender.io/

# How to use this repository

This repository has been split into different feature branches.

1. [master](https://github.com/jerryjj/fello/tree/master): Starting point for Firebase Hosting
2. [step_two](https://github.com/jerryjj/fello/tree/step_two): Authentication
3. [step_three](https://github.com/jerryjj/fello/tree/step_three): Realtime Database
4. [step_four](https://github.com/jerryjj/fello/tree/step_four): **Firebase Storage**
5. [step_five](https://github.com/jerryjj/fello/tree/step_five): Simple relations in Realtime Database
6. [step_six](https://github.com/jerryjj/fello/tree/step_six): Cloud Messaging

You can checkout any of the branches at any time and just read the STEP_INFO.md
for information regarding that step (deployment info, changes, etc).

Even though this example is Serverless, you need Node.JS installed for development.

## Local development

* 1. Clone the repo
* 1.1. Switch to the branch you want to test out (read the STEP_INFO.md)
* 2. Install dependencies

```sh
npm install && bower install
```
* 3. Insert your Firebase Database credentials here (in this README):

```
FIREBASE_PROJECT_ID: MY-PROJECT-ID
FIREBASE_API_KEY: MY-API-KEY
```

Or you can also export them as environment variables

```sh
export FIREBASE_PROJECT_ID=MY-PROJECT-ID
export FIREBASE_API_KEY=MY-API-KEY
```

* 4. Run the dev server with livereload

```sh
npm run dev
```

## Deployment

Requirements:
* Firebase CLI tool (npm install -g firebase-tools)

To deploy this under your own Firebase project,
create .firebaserc -file in the project directory
with following content:

```
{
  "projects": {
    "default": "YOUR_PROJECT_ID"
  }
}
```

Then build the assets and deploy to hosting:

```sh
npm run deploy
```

License: MIT
