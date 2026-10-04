import { initializeApp, getApps } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getDatabase, ref, onValue, set, update, serverTimestamp } from "firebase/database";

let app;
let auth;
let db;

export function initFirebase(apiKey: string, databaseURL: string, email: string, pass: string) {
  if (getApps().length > 0) {
    app = getApps()[0];
  } else {
    app = initializeApp({
      apiKey,
      databaseURL,
      // Minimal config for auth and RTDB
    });
  }
  
  auth = getAuth(app);
  db = getDatabase(app);

  return signInWithEmailAndPassword(auth, email, pass).then(() => {
    return db;
  });
}

export function getFbDb() {
  return db;
}
