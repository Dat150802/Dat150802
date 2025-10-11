import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

export const firebaseConfig = {
  // DÁN GIÁ TRỊ THẬT VÀO ĐÂY
  apiKey: "…",
  authDomain: "klc-ben-luc-crm.firebaseapp.com",
  projectId: "klc-ben-luc-crm",
  storageBucket: "klc-ben-luc-crm.appspot.com",
  messagingSenderId: "…",
  appId: "…"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

console.log("✅ Firebase connected");
