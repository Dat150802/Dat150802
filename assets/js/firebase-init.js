import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

export const firebaseConfig = {
  apiKey: "AIzaSyDqkxqifDOka9v4Yduw8VN3ZjnhyJhvJrI",
  authDomain: "klc-ben-luc-crm.firebaseapp.com",
  projectId: "klc-ben-luc-crm",
  storageBucket: "klc-ben-luc-crm.appspot.com",
  messagingSenderId: "499809227125",
  appId: "1:499809227125:web:a1854adad8026d82c8273c",
  measurementId: "G-6GTQPBHTMW"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

console.log("✅ Firebase connected");
