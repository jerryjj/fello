# Welcome

Welcome to the part one, of this demo.
Here are the steps you need to do now:

1. Configure your local clone as per the README (Project ID and API Key)
2. Install Dependencies

```sh
npm install && bower install
```

3. Install the Firebase CLI

```sh
npm install -g firebase-tools
```

4. Test the application locally

```sh
npm run dev
```

5. Deploy it to Firebase Hosting

5.1. Create .firebaserc -file in the project directory with following content:

```json
{
  "projects": {
    "default": "YOUR_PROJECT_ID"
  }
}
```

5.2. Then build the assets and deploy to hosting:

```sh
npm run deploy
```
