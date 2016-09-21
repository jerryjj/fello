service firebase.storage {
  match /b/FIREBASE_PROJECT_ID.appspot.com/o {
    match /uploads/{userId}/{timeStamp}/{fileName} {
      allow write: if request.auth.uid == userId;
      allow read;
    }
  }
}
