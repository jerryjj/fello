'use strict';

const PLACEHOLDER_LOADING_URL = '/images/loader.gif';

class Fello {
  constructor() {
    const storage = firebase.storage();

    this.user = {};
    this.activePage = 'home';

    this.auth = firebase.auth();
    this.db = firebase.database();
  }

  run() {
    // Initiates Firebase auth and listen to auth state changes.
    this.auth.onAuthStateChanged(this.onAuthStateChanged.bind(this));

    // Bind event listeners to the Sign-In buttons
    this.prepareAuthButtons();
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

  /* View handling methods, nothing spectacular here... */

  showPage(page) {
    const pageIds = [
      'page-home'
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
      case 'home':
      default:
        this.activePage = 'home';

        this.updateMeBlock();

        document.getElementById('me-column').style.display = 'block';

        if (!firebase.auth().currentUser) {
          document.getElementById('me-column').style.display = 'none';
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
    if (firebase.auth().currentUser) {
      document.getElementById('signin-menu-item').style.display = 'none';

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
    }
  }

  updateMeBlock() {
    const meColumnEl = document.getElementById('me-column');
    const usernameEl = meColumnEl.getElementsByClassName('username')[0];
    const profileImgEl = meColumnEl.getElementsByClassName('profile-image')[0];
    const profileUrl = this.user.profileImage || 'http://placekitten.com/62/62';

    usernameEl.innerText = this.user.username;
    profileImgEl.src = profileUrl;
  }

  /* Static methods */

  static navigationHandler() {
    switch (location.hash) {
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
