'use strict';

const PLACEHOLDER_LOADING_URL = '/images/loader.gif';

const calculateImageThumbnailSize = (width, height) => {
  const maxWidth = 200;
  const maxHeight = 200;
  let finalWidth = width;
  let finalHeight = height;
  let ratio = 0;

  if (width > maxWidth) {
    ratio = maxWidth / width;
    width = width * ratio;
    height = height * ratio;
    finalWidth = maxWidth;
    finalHeight = height;
  }

  if (height > maxHeight) {
    ratio = maxHeight / height;
    finalWidth = width * ratio;
    finalHeight = maxHeight;
  }

  return [Math.round(finalWidth), Math.round(finalHeight)];
};

class Fello {
  constructor() {
    const storage = firebase.storage();

    this.user = {};
    this.activePage = 'home';

    this._friends = {};

    this.auth = firebase.auth();
    this.db = firebase.database();

    // Get reference to our storage folder
    this.storage = firebase.storage();
    this.uploadsRef = this.storage.ref().child('uploads');

    // Reference to the /messages/ database path.
    this.messagesRef = this.db.ref('messages');
  }

  run() {
    // Initiates Firebase auth and listen to auth state changes.
    this.auth.onAuthStateChanged(this.onAuthStateChanged.bind(this));

    // Bind event listeners to the Sign-In buttons
    this.prepareAuthButtons();

    this.updateOnlineViewersCount();
  }

  /* Authentication parts */

  prepareAuthButtons() {
    const onSignIn = () => {
      // Lets use Google Authentication Provider
      let provider = new firebase.auth.GoogleAuthProvider();
      // Trigger a built-in Sign-In flow with the Google provider
      firebase.auth().signInWithPopup(provider).catch((err) => {
        console.error('Error occurred while authenticating', err);
      });
    };

    Array.prototype.forEach.call(document.getElementsByClassName('signin-link'), (el) => {
      el.addEventListener('click', onSignIn);
    });
  }

  /**
   * Authentication state has changed. We have user (logged in) or User has logged out
   **/
  onAuthStateChanged(user) {
    if (user) {
      this.saveUserData(user);
      this.updateFriends();

      this.listenForNotifications();

      this.updateOnlineUserCount();
    }

    Fello.navigationHandler();
  }

  /**
   * Store user data to Firebase
   **/
  saveUserData(user) {
    let username = 'No.Name.Set';
    if (user.displayName && user.displayName.length) {
      username = user.displayName;
    } else {
      username = user.email.split('@')[0];
    }
    this.user = {
      username: username,
      profileImage: user.photoURL
    };
    this.db.ref(`users/${user.uid}`).set(this.user);
    // Store a local copy of the full user object
    this.user.id = user.uid;
  }

  /* Data handling methods */

  loadMessages() {
    // Make sure we remove all previous listeners.
    this.messagesRef.off();

    // Loads the last 15 messages and listen for new ones.
    const setMessage = (data) => {
      if (!data) {
        return;
      }
      this.displayMessage(data.key, data.val());
    };
    this.messagesRef.limitToLast(15).on('child_added', setMessage);
    this.messagesRef.limitToLast(15).on('child_changed', setMessage);
  }

  writeNewMessage(uid, user, messageData) {
    let msg = {
      uid: uid,
      username: user.username,
      profileImage: user.profileImage,
      body: messageData.body,
      createdAt: firebase.database.ServerValue.TIMESTAMP
    };

    // User uploaded a image, replace the image url with a loading image
    if (messageData.image) {
      msg.imageUrl = PLACEHOLDER_LOADING_URL;
    }

    // Get a key for a new Post.
    const newMsgKey = this.messagesRef.push().key;

    // Lets store the message to two locations simultaneously
    let updates = {};
    updates[`/messages/${newMsgKey}`] = msg; // Everybody reads this
    updates[`/users-messages/${uid}/${newMsgKey}`] = msg; // Only read for the logged in user

    this.db.ref().update(updates).then((data) => {
      this.updateMeBlock();

      // User uploaded image, upload it to the Storage
      // and then update the message objects with the correct file link
      if (messageData.image) {
        // Upload the image to Firebase Storage.
        const uploadTask = this.uploadsRef.child(
          `${uid}/${Date.now()}/${messageData.image.name}`
        ).put(messageData.image, {
          'contentType': messageData.image.type
        });

        uploadTask.on('state_changed', null, (err) => {
          console.error('There was an error uploading a file to Firebase Storage:', err);
        }, () => {
          // Get the file's Storage URI and update the message imageUrl placeholder.
          const imageUrl = uploadTask.snapshot.metadata.downloadURLs[0];

          let updates = {};
          updates[`/messages/${newMsgKey}/imageUrl`] = imageUrl;
          updates[`/users-messages/${uid}/${newMsgKey}/imageUrl`] = imageUrl;
          this.db.ref().update(updates);
        });
      }
    });
  }

  updateFriends() {
    const userId = firebase.auth().currentUser.uid;
    const myFriendsRef = this.db.ref(`/users-friends/${userId}`);
    myFriendsRef.off();
    this._friends = {};

    this.clearFriends();

    myFriendsRef.on('value', (data) => {
      let ids = data.val() ? Object.keys(data.val()) : [];
      ids.forEach((uid) => {
        this._friends[uid] = {};
        this.getFriendInfo(uid);
      });
      if (document.getElementsByClassName('my-friends-count').length) {
        document.getElementsByClassName('my-friends-count')[0].innerText = Object.keys(this._friends).length;
      }
      this.updateFriendStatuses();

      this.updateOnlineFriends();
    });
    myFriendsRef.on('child_removed', () => {
      this.updateFriends();
    });
  }

  getFriendInfo(uid) {
    this.db.ref(`/users/${uid}`).on('value', (data) => {
      this._friends[uid] = data.val();
      this.displayFriend(uid, this._friends[uid]);
    });
  }

  makeFriends(userId, otherUserId) {
    let updates = {};
    updates[`/users-friends/${userId}/${otherUserId}`] = true;
    updates[`/users-friends/${otherUserId}/${userId}`] = true;
    this.db.ref().update(updates);
  }

  unMakeFriends(userId, otherUserId) {
    this.db.ref(`/users-friends/${userId}/${otherUserId}`).remove();
    this.db.ref(`/users-friends/${otherUserId}/${userId}`).remove();
  }

  /* View handling methods, nothing spectacular here... */

  showPage(page) {
    const pageIds = [
      'page-home', 'page-friends'
    ];

    this.toggleLoader(true);

    document.getElementById('welcome-column').style.display = 'none';
    if (!firebase.auth().currentUser) {
      document.getElementById('welcome-column').style.display = 'block';
    }

    pageIds.forEach((elId) => {
      document.getElementById(elId).style.display = 'none';
    });

    switch (page) {
      case 'friends':
        if (!firebase.auth().currentUser) {
          return this.showPage('home');
        }
        this.activePage = 'friends';

        document.getElementById('page-friends').style.display = 'block';
        this.toggleLoader(false);
        break;
      case 'home':
      default:
        this.activePage = 'home';

        this.updateMeBlock();
        this.clearMessages();
        this.loadMessages();

        document.getElementById('me-column').style.display = 'block';
        document.getElementById('post-row').style.display = 'block';

        if (!firebase.auth().currentUser) {
          document.getElementById('me-column').style.display = 'none';
          document.getElementById('post-row').style.display = 'none';
        } else {
          this.enablePostForm();
        }

        document.getElementById('page-home').style.display = 'block';

        this.toggleLoader(false);
    }

    this.updateMainMenu();
  }

  toggleLoader(show) {
    const el = document.getElementById('page-loader');
    if (show) {
      el.style.display = 'block';
    } else {
      el.style.display = 'none';
    }
  }

  updateMainMenu() {
    const navBarHeaderEl = document.getElementsByClassName('navbar-header')[0];
    document.getElementById('signin-menu-item').style.display = 'block';
    document.getElementById('logout-menu-item').style.display = 'none';
    document.getElementById('friends-menu-item').style.display = 'none';

    if (firebase.auth().currentUser) {
      document.getElementById('signin-menu-item').style.display = 'none';
      document.getElementById('friends-menu-item').style.display = 'block';

      const logoutItem = document.getElementById('logout-menu-item');
      logoutItem.style.display = 'block';
      logoutItem.addEventListener('click', () => {
        firebase.auth().signOut();
      });
      const usernameEl = navBarHeaderEl.getElementsByClassName('username')[0];
      usernameEl.innerText = this.user.username;
    }
    Array.prototype.forEach.call(document.getElementsByClassName('menu-item'), (el) => {
      el.className = 'menu-item';
    });
    if (this.activePage === 'home') {
      document.getElementById('home-menu-item').className = 'menu-item active';
    } else if (this.activePage === 'friends') {
      document.getElementById('friends-menu-item').className = 'menu-item active';
    }
  }

  updateMeBlock() {
    const meColumnEl = document.getElementById('me-column');
    const usernameEl = meColumnEl.getElementsByClassName('username')[0];
    const profileImgEl = meColumnEl.getElementsByClassName('profile-image')[0];
    const profileUrl = this.user.profileImage || 'http://placekitten.com/62/62';

    usernameEl.innerText = this.user.username;
    profileImgEl.src = profileUrl;

    // Lets update message count of our own messages
    this.db.ref(`/users-messages/${this.user.id}`).on('value', (data) => {
      if (!data) {
        return;
      }
      if (document.getElementsByClassName('my-message-count').length) {
        document.getElementsByClassName('my-message-count')[0].innerText = data.numChildren();
      }
    });
  }

  clearMessages() {
    document.getElementById('feed-row').getElementsByClassName('items')[0].innerHTML = '';
  }

  /* Renders single message item to DOM */
  displayMessage(key, data) {
    const containerElement = document.getElementById('feed-row').getElementsByClassName('items')[0];
    let el = this.createMessageElement(key, data);
    if (!document.getElementById(`msg-${key}`)) {
      containerElement.insertBefore(el, containerElement.firstChild);
    }
  }

  createMessageElement(key, data) {
    const userId = firebase.auth().currentUser ? firebase.auth().currentUser.uid : null;

    let html = '';
    const profileUrl = data.profileImage ? data.profileImage : 'http://placekitten.com/62/62';

    let bodyHtml = '<p class="body"></p>';
    if (data.imageUrl) {
      bodyHtml += `<a href="" target="_blank" class="thumbnail thumbnail-link">
        <img class="image" src="${PLACEHOLDER_LOADING_URL}" alt="">
      </a>`;
    }

    if (userId === data.uid) {
      html = `<div id="msg-${key}" class="media media-me well">
        <div class="media-body media-left">
          <blockquote class="blockquote-reverse">
            ${bodyHtml}
            <footer class="msg-footer">${data.username}</footer>
          </blockquote>
        </div>
        <div class="media-right">
          <a>
            <img class="media-object" src="${profileUrl}" width="64" height="64" alt="">
          </a>
        </div>
      </div>`;
    } else {
      const friendStatus = this.getFriendStatus(userId, data.uid);
      html = `<div id="msg-${key}" class="media media-other well">
        <div class="media-left">
          <a>
            <img class="media-object" src="${profileUrl}" width="64" height="64" alt="">
          </a>
        </div>
        <div class="media-body">
          <blockquote>
            ${bodyHtml}
            <footer class="msg-footer">${data.username} <div class="friendstatus" data-uid="${data.uid}">${friendStatus}</div></footer>
          </blockquote>
        </div>
      </div>`;
    }

    // Create the DOM element from the HTML.
    const div = document.createElement('div');
    div.innerHTML = html;
    let postElement = div.firstChild;
    if (document.getElementById(`msg-${key}`)) {
      postElement = document.getElementById(`msg-${key}`);
    }

    let bodyTxt = data.body;
    if (bodyTxt.length > 140) {
      bodyTxt = bodyTxt.substr(0, 140) + '...';
    }

    // Set values.
    if (postElement.getElementsByClassName('body').length) {
      postElement.getElementsByClassName('body')[0].innerText = bodyTxt;
    }
    if (postElement.getElementsByClassName('image').length) {
      const imgEl = postElement.getElementsByClassName('image')[0];
      const tmpImgEl = document.createElement('img');
      tmpImgEl.src = data.imageUrl;
      if (data.imageUrl != PLACEHOLDER_LOADING_URL) {
        tmpImgEl.addEventListener('load', () => {
          const size = calculateImageThumbnailSize(tmpImgEl.width, tmpImgEl.height);
          imgEl.width = size[0];
          imgEl.height = size[1];
          imgEl.src = data.imageUrl;
          postElement.getElementsByClassName('thumbnail-link')[0].href = data.imageUrl;
        });
      }
    }

    if (postElement.getElementsByClassName('btn-add_friend').length) {
      const friendButton = postElement.getElementsByClassName('btn-add_friend')[0];
      friendButton.onclick = () => {
        this.makeFriends(userId, data.uid);
      };
    }

    return postElement;
  }

  enablePostForm() {
    const postForm = document.getElementById('post-form');
    const bodyInput = document.getElementById('body-i');
    const imageInput = document.getElementById('file-i');
    const cameraIcon = postForm.getElementsByClassName('glyphicon-camera')[0];
    const selectedAttEl = postForm.getElementsByClassName('selected-attachment')[0];

    cameraIcon.addEventListener('click', () => {
      imageInput.click();
    });

    imageInput.addEventListener('change', () => {
      selectedAttEl.style.display = 'inline-block';
      if (imageInput.files.length) {
        const file = imageInput.files[0];
        if (file.type.match('image.*')) {
          selectedAttEl.getElementsByClassName('filename')[0].innerText = imageInput.files[0].name;
        }
      }
    });

    postForm.onsubmit = (e) => {
      e.preventDefault();

      const userId = firebase.auth().currentUser.uid;
      if (!userId) { // Shouldn't never happen
        alert('not authenticated!');
        return;
      }

      if (bodyInput.value || imageInput.files.length) {
        let bodyText = bodyInput.value;
        let image = null;
        if (imageInput.files.length) {
          const file = imageInput.files[0];
          if (file.type.match('image.*')) {
            image = imageInput.files[0];
          }
        }

        // Fetch the user info as a precaution from the DB first
        this.db.ref(`/users/${userId}`).once('value').then((snapshot) => {
          let user = snapshot.val();
          this.writeNewMessage(
            firebase.auth().currentUser.uid,
            user,
            {
              body: bodyText,
              image: image
            }
          );
        });
      }

      selectedAttEl.style.display = 'none';
      e.target.reset();
    };
  }

  clearFriends() {
    document.getElementById('friends-row').getElementsByClassName('items')[0].innerHTML = '';
  }

  displayFriend(key, data) {
    const containerElement = document.getElementById('friends-row').getElementsByClassName('items')[0];
    let el = this.createFriendElement(key, data);
    if (!document.getElementById(`friend-${key}`)) {
      containerElement.insertBefore(el, containerElement.firstChild);
    }
  }

  updateFriendStatuses() {
    if (!document.getElementsByClassName('media').length) {
      return;
    }
    const userId = firebase.auth().currentUser.uid;
    Array.prototype.forEach.call(document.getElementsByClassName('media'), (el) => {
      if (el.getElementsByClassName('friendstatus').length) {
        const fsEl = el.getElementsByClassName('friendstatus')[0];
        const authorUserId = fsEl.dataset.uid;
        const friendStatus = this.getFriendStatus(userId, authorUserId);
        fsEl.innerHTML = friendStatus;

        if (el.getElementsByClassName('btn-add_friend').length) {
          const friendButton = el.getElementsByClassName('btn-add_friend')[0];
          friendButton.onclick = () => {
            this.makeFriends(userId, authorUserId);
          };
        }
      }
    });
  }

  createFriendElement(key, data) {
    const userId = firebase.auth().currentUser ? firebase.auth().currentUser.uid : null;
    const profileUrl = data.profileImage || 'http://placekitten.com/62/62';

    const html = `<div id="friend-${key}" class="list-group-item">
      <div class="media media-other">
        <div class="media-left">
          <a>
            <img class="media-object" src="${profileUrl}" width="64" height="64" alt="">
          </a>
        </div>
        <div class="media-body">
          <h4 class="media-heading">${data.username}</h4>
          <div class="btn btn-xs btn-danger btn-remove">remove friend</div>
        </div>
      </div>
    </div>`;

    // Create the DOM element from the HTML.
    const div = document.createElement('div');
    div.innerHTML = html;
    let friendElement = div.firstChild;
    if (document.getElementById(`friend-${key}`)) {
      friendElement = document.getElementById(`friend-${key}`);
    }

    const removeButton = friendElement.getElementsByClassName('btn-remove')[0];
    removeButton.onclick = () => {
      this.unMakeFriends(userId, key);
    };

    return friendElement;
  }

  getFriendStatus(userId, msgUserId) {
    let friendStatus = '';
    if (!userId) {
      return friendStatus;
    }
    if (this._friends[msgUserId]) {
      friendStatus = `<span class="label label-success">friend</span>`;
    } else {
      friendStatus = `<div class="btn btn-xs btn-info btn-add_friend">add friend</div>`;
    }
    return friendStatus;
  }

  /* Push messages related */

  listenForNotifications() {
    if ('serviceWorker' in navigator) {
      const updateUserSubscription = (subscription) => {
        const parts = subscription.endpoint.split('/');
        const token = parts[parts.length - 1];
        // console.debug('push token', token);
        this.db.ref(`pushtokens/${firebase.auth().currentUser.uid}`).set(token);
      };

      const serviceWorkerReady = (registration) => {
        // console.log('registration', registration)
        registration.pushManager.getSubscription()
        .then((subscription) => {
          if (subscription) {
            // console.log('already subscribed', subscription);
            updateUserSubscription(subscription);
          } else {
            registration.pushManager.subscribe({
              userVisibleOnly: true
            }).then((subscription) => {
              // console.log('new subscription', subscription);
              updateUserSubscription(subscription);
            }).catch((err) => {
              if (Notification.permission === 'denied') {
                console.log('Permission for Notifications was denied');
              } else {
                console.error('Unable to subscribe to push.', err);
              }
            });
          }
        });
      };

      navigator.serviceWorker.ready.then(serviceWorkerReady);
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.error('Error registering service worker', err);
      });
    }
  }

  /* Presence parts */

  updateOnlineViewersCount() {
    const connectedRef = this.db.ref('.info/connected');
    const viewersRef = this.db.ref('/presence/viewers');
    const viewersConnectedRef = viewersRef.push();

    connectedRef.on('value', (snapshot) => {
      if (snapshot.val() === true) {
        viewersConnectedRef.onDisconnect().remove();
        viewersConnectedRef.set(true);
      }
    });

    viewersRef.on('value', (snapshot) => {
      document.getElementsByClassName('online-viewer-count')[0].innerText = snapshot.numChildren();
    });
  }

  updateOnlineUserCount() {
    const connectedRef = this.db.ref('.info/connected');
    const userConnectedRef = this.db.ref(`/presence/connected/${firebase.auth().currentUser.uid}`);
    connectedRef.on('value', (snapshot) => {
      if (snapshot.val() === true) {
        userConnectedRef.onDisconnect().remove();
        userConnectedRef.set(true);
      }
    });
  }

  updateOnlineFriends() {
    const allConnectedRef = this.db.ref('/presence/connected');
    allConnectedRef.on('value', (snapshot) => {
      const onlineUids = Object.keys(snapshot.val());
      const onlineFriendIds = Object.keys(this._friends).filter((uid) => {
        return onlineUids.indexOf(uid) !== -1;
      });

      const listEl = document.getElementsByClassName('online-friends-list')[0];
      listEl.innerHTML = '';
      onlineFriendIds.forEach((uid) => {
        this.db.ref(`/users/${uid}/username`).once('value', (data) => {
          const friendEl = document.createElement('span');
          friendEl.className = 'label label-success';
          friendEl.innerText = data.val();
          listEl.insertBefore(friendEl, listEl.firstChild);
        });
      });
    });
  }

  /* Static methods */

  static navigationHandler() {
    switch (location.hash) {
      case '#/friends':
        window.fello.showPage('friends');
        break;
      case '#/':
      default:
        window.fello.showPage('home');
    }
  }
}

window.fello = new Fello();
window.addEventListener('load', () => {
  window.fello.run();
});
window.onhashchange = Fello.navigationHandler;
