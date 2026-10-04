import { initializeApp, getApps, deleteApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getDatabase, ref, onValue, set, update, serverTimestamp } from "firebase/database";

let app;
let auth;
let db;

export async function initFirebase(apiKey: string, databaseURL: string, email: string, pass: string) {
  try {
    app = initializeApp({
      apiKey,
      databaseURL,
    }, "SmartDose_" + Date.now());
    
    auth = getAuth(app);
    db = getDatabase(app);

    return signInWithEmailAndPassword(auth, email, pass).then(() => {
      return db;
    });
  } catch (err) {
    return Promise.reject(err);
  }
}

export function getFbDb() {
  return db;
}
