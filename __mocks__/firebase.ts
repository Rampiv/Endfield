export const firebaseConfig = {
  apiKey: "fake-api-key",
  authDomain: "fake-project.firebaseapp.com",
  projectId: "fake-project",
  storageBucket: "fake-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef",
};

export const initializeApp = jest.fn(() => ({ name: "[DEFAULT]" }));
export const getAuth = jest.fn(() => ({
  currentUser: null,
  onAuthStateChanged: jest.fn(),
}));
export const getDatabase = jest.fn(() => ({ app: {} }));

export const auth = getAuth();
export const db = getDatabase();
