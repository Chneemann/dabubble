import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  QuerySnapshot,
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from '@angular/fire/firestore';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { Router } from '@angular/router';
import { User } from '../interface/user.interface';
import { UserService } from './user.service';
import { publicChannels } from '../interface/channel.interface';
import { TranslateService } from '@ngx-translate/core';
import CryptoJS from 'crypto-es';
import { CryptoJSSecretKey } from './../../environments/config';

@Injectable({
  providedIn: 'root',
})
export class loginService {
  firestore: Firestore = inject(Firestore);
  email: string = '';
  password: string = '';
  name: string = '';
  firstName: string = '';
  lastName: string = '';
  avatar: string = './assets/img/user-icons/guest.svg';
  currentUser: string = '';
  errorMessage: string = '';
  isFirstLoad: boolean = true;
  passwordFieldType: string = 'password';
  passwordIcon: string = './assets/img/login/close-eye.svg';
  isBtnDisabled: boolean = false;
  private hasAnimationPlayed = false;
  private introCompleteStatus = false;
  private secretKey: string = CryptoJSSecretKey.secretKey;

  constructor(
    private router: Router,
    private userService: UserService,
    private translate: TranslateService
  ) {
    this.ifUserLoggedIn();
  }

  /**
   * Checks if a user is logged in by checking if there is a user stored in the local storage.
   * If a user is found, it redirects to the main page.
   * @returns {void}
   */
  ifUserLoggedIn() {
    let currentUser = this.userService.getCurrentUserId();
    if (currentUser !== null) {
      this.router.navigate([`/main`]);
      this.isBtnDisabled = false;
    }
  }

  // -------------------- login start ------------------------------->

  /**
   * Authenticates a user using their email and password, fetches the user document, and handles errors.
   */
  login() {
    this.isBtnDisabled = true;
    const auth = getAuth();
    signInWithEmailAndPassword(auth, this.email, this.password)
      .then((userCredential) => {
        const user = userCredential.user;
        const usersCollection = collection(this.firestore, 'users');
        const querySnapshot = query(
          usersCollection,
          where('uid', '==', user.uid)
        );
        getDocs(querySnapshot)
          .then((snapshot) => this.userDocument(snapshot))
          .catch((error) => {
            console.error('Error when retrieving the user document:', error);
          });
      })
      .catch((error) => {
        const errorCode = error.code;
        this.switchCase(errorCode);
        this.isBtnDisabled = false;
      });
  }

  /**
   * Processes the query snapshot to fetch user document data and updates local and session state.
   * @param snapshot QuerySnapshot object containing user documents.
   */
  userDocument(snapshot: QuerySnapshot) {
    if (snapshot.docs.length > 0) {
      const userDoc = snapshot.docs[0];
      this.currentUser = userDoc.id;
      this.getUserIdInLocalStorage(this.currentUser);
      this.email = '';
      this.password = '';
    } else {
      console.error('No associated user document found.');
    }
  }

  /**
   * Handles error codes returned from login attempts and sets appropriate error messages.
   * @param errorCode String representing the error code returned from Firebase authentication.
   */
  switchCase(errorCode: string) {
    switch (errorCode) {
      case 'auth/invalid-credential':
        this.translate.get('login.errorText3').subscribe((res: string) => {
          this.errorMessage = res;
        });
        break;
      case 'auth/too-many-requests':
        this.translate.get('login.errorText4').subscribe((res: string) => {
          this.errorMessage = res;
        });
        break;
      default:
        this.translate.get('login.errorText5').subscribe((res: string) => {
          this.errorMessage = res;
        });
        break;
    }
  }

  /**
   * Performs a guest login using predetermined credentials and updates the user's online status.
   */
  guestLogin() {
    this.isBtnDisabled = true;
    const auth = getAuth();
    const email = 'guest@guestaccount.com';
    const password = 'guest@guestaccount.com';
    const userId = 'BSUUclnjovMeE3v85Hmy';
    this.email = 'guest@guestaccount.com';
    this.password = 'guest@guestaccount.com';

    signInWithEmailAndPassword(auth, email, password)
      .then(() => {
        this.getUserIdInLocalStorage(userId);
        this.email = '';
        this.password = '';
      })
      .catch((error) => {
        console.error(error);
        this.translate.get('login.errorText6').subscribe((res: string) => {
          this.errorMessage = res;
        });
        this.isBtnDisabled = false;
      });
  }

  // -------------------- register ------------------------------->

  /**
   * Registers a new user with Firebase authentication and stores user data in Firestore.
   */
  register() {
    this.isBtnDisabled = true;
    const auth = getAuth();
    createUserWithEmailAndPassword(auth, this.email, this.password)
      .then((userCredential) => {
        const user = userCredential.user;

        const userDataToSave: User = {
          uid: user.uid,
          firstName: this.firstName,
          lastName: this.lastName,
          avatar: this.avatar,
          email: this.email,
          status: true,
        };
        this.createUserInFirestore(userDataToSave);
        this.deleteUserFormData();
      })
      .catch((error) => {
        console.error(error);
        this.deleteUserFormData();
        this.isBtnDisabled = false;
      });
  }

  /**
   * Clears user forms data.
   */
  deleteUserFormData() {
    this.name = '';
    this.email = '';
    this.password = '';
  }

  /**
   * Saves user data to Firestore and updates the application state.
   * @param user The user object containing information to be saved.
   */
  async createUserInFirestore(user: User) {
    const userDataToSave: User = {
      uid: user.uid,
      email: user.email,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      avatar: user.avatar || './assets/img/user-icons/guest.svg',
      status: true,
    };
    const usersCollection = collection(this.firestore, 'users');
    try {
      const docRef = await addDoc(usersCollection, userDataToSave);
      this.currentUser = docRef.id;
      await this.addUserToChannels(this.currentUser, publicChannels);
      await this.addPrivateChannel(this.currentUser);
      this.getUserIdInLocalStorage(this.currentUser);
      this.email = '';
      this.password = '';
    } catch (error) {
      console.error(error);
    }
  }

  // -------------------- choose avatar ------------------------------->

  /**
   * Gets the URL of the avatar and updates the avatar source.
   * @param url String URL of the avatar.
   * @return Updated avatar URL.
   */
  getAvatarUrl(url: string) {
    return (this.avatar = url);
  }

  // -------------------- animation login ------------------------------->

  /**
   * Retrieves the animation state indicating whether it has played.
   * @returns {boolean} True if the animation has already played, false otherwise.
   */
  getAnimationState(): boolean {
    return this.hasAnimationPlayed;
  }

  /**
   * Retrieves the completion status of the introduction class.
   * @returns {boolean} True if the introduction is complete, false otherwise.
   */
  getFinalClass(): boolean {
    return this.introCompleteStatus;
  }

  /**
   * Sets the animation state.
   * @param {boolean} state - The new state of the animation.
   */
  setAnimationState(state: boolean): void {
    this.hasAnimationPlayed = state;
  }

  /**
   * Sets the final class completion status.
   * @param {boolean} state - The new completion status of the introduction.
   */
  setFinalClass(state: boolean): void {
    this.introCompleteStatus = state;
  }

  // -------------------- GoogleLogin ------------------------------->

  /**
   * Handles the user's sign-in process via Google authentication.
   * Invokes Firebase's signInWithPopup to authenticate and potentially creates or updates the user's data in Firestore.
   */
  googleLogin() {
    const auth = getAuth();
    const provider = new GoogleAuthProvider();

    signInWithPopup(auth, provider)
      .then((result) => {
        const user = result.user;
        const usersCollection = collection(this.firestore, 'users');
        const querySnapshot = query(
          usersCollection,
          where('uid', '==', user.uid)
        );
        getDocs(querySnapshot).then((snapshot) => {
          if (snapshot.empty) {
            this.createUserInFirestore({
              uid: user.uid,
              email: user.email || 'leer@gmail.com',
              firstName: user.displayName
                ? user.displayName.split(' ')[0]
                : 'FirstName',
              lastName: user.displayName
                ? user.displayName.split(' ').slice(1).join(' ')
                : 'LastName',
              avatar: user.photoURL || './assets/img/user-icons/guest.svg',
              status: true,
            });
          } else {
            this.ifExistUser(snapshot);
          }
        });
      })
      .catch((error) => {
        console.error(error);
      });
  }

  /**
   * Processes existing user data after successful Google login.
   * @param {QuerySnapshot} snapshot - Firestore snapshot containing the user's data.
   */
  ifExistUser(snapshot: QuerySnapshot) {
    this.currentUser = snapshot.docs[0].id;
    this.getUserIdInLocalStorage(this.currentUser);
  }

  // -------------------- UserAddFunctions ------------------------------->

  /**
   * Updates the online status of the user in Firestore.
   * @param userId The user's document ID in Firestore.
   */
  async updateUserOnlineStatus(userId: string) {
    const userDocRef = doc(this.firestore, 'users', userId);
    const updates = {
      status: true,
    };
    await updateDoc(userDocRef, updates)
      .then(() => {
        console.error();
      })
      .catch((error) => {
        console.error(error);
      });
  }

  /**
   * Adds the current user to specified channels in Firestore. It updates each channel document
   * to include the user's ID in an array of added users, ensuring that the user is part of the channel.
   * Each operation is performed independently, and errors are handled individually.
   *
   * @param {string} currentUser - The ID of the user to be added to the channels.
   * @param {string[]} channelIds - An array of channel IDs to which the user will be added.
   */
  addUserToChannels(currentUser: string, channelIds: string[]) {
    channelIds.forEach((channelId) => {
      const channelDocRef = doc(this.firestore, 'channels', channelId);

      updateDoc(channelDocRef, {
        addedUser: arrayUnion(currentUser),
      }).catch((error) => {
        console.error(error);
      });
    });
  }

  /**
   * Asynchronously adds a private channel for the current user.
   *
   * This method creates a new document in the 'prv-channels' collection within Firestore. The new document contains the creator's user ID for both the creator and recipient fields, implying a private or personal channel.
   *
   * @param currentUser The user ID of the current user and the creator of the private channel.
   * @async
   * @returns {Promise<void>} A promise that resolves when the channel is successfully added or rejects with an error message if the operation fails.
   */
  async addPrivateChannel(currentUser: string) {
    try {
      await addDoc(collection(this.firestore, 'prv-channels'), {
        creatorId: currentUser,
        talkToUserId: currentUser,
      });
    } catch (error) {
      console.error('Error when creating the private channel: ', error);
    }
  }

  /**
   * Stores the current user's ID in the local storage.
   * @param {string} userId - The ID of the current user to be stored.
   */
  async getUserIdInLocalStorage(userId: string): Promise<void> {
    const encryptedValue = CryptoJS.AES.encrypt(
      JSON.stringify(userId),
      this.secretKey
    ).toString();
    localStorage.setItem('currentUserDABUBBLE', encryptedValue);
    localStorage.setItem(
      'sessionTimeDABUBBLE',
      new Date().getTime().toString()
    );
    await this.updateUserOnlineStatus(userId);
    window.location.reload();
  }

  /**
   * Toggles password visibility.
   */
  togglePasswordVisibility() {
    this.passwordFieldType =
      this.passwordFieldType === 'password' ? 'text' : 'password';
    this.toggleIcon();
  }

  /**
   * Toggles password icon.
   */
  toggleIcon() {
    this.passwordIcon =
      this.passwordIcon === './assets/img/login/close-eye.svg'
        ? './assets/img/login/open-eye.svg'
        : './assets/img/login/close-eye.svg';
  }
}
