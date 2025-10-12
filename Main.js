import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getAuth, setPersistence, browserLocalPersistence, browserSessionPersistence,
  signInWithEmailAndPassword, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  getFirestore, doc, getDoc, serverTimestamp, setDoc
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Dán firebaseConfig của bạn ở đây:
const firebaseConfig = {
 apiKey: "AIzaSyDkqaX1fCdO0xa9v4YUwd0VN3ZjnhyJhvI",
  authDomain: "klc-ben-luc-crm.firebaseapp.com",
  projectId: "klc-ben-luc-crm",
  storageBucket: "klc-ben-luc-crm.firebasestorage.app",
  messagingSenderId: "499089227125",
  appId: "1:499089227125:web:a1854adad0026d82c0273c",
  measurementId: "G-6GTP0HTMWY"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function login(email, password, remember){
  const persistence = remember ? browserLocalPersistence : browserSessionPersistence;
  await setPersistence(auth, persistence);
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const userRef = doc(db, "users", cred.user.uid);
  const userSnap = await getDoc(userRef);
  if(userSnap.exists()){
    document.getElementById("status").innerText = `Xin chào ${userSnap.data().displayName} (${userSnap.data().role})`;
  } else {
    document.getElementById("status").innerText = "Chưa có hồ sơ trong Firestore.";
  }
}

document.getElementById("loginBtn").addEventListener("click", async ()=>{
  const email = document.getElementById("email").value;
  const pw = document.getElementById("password").value;
  const remember = document.getElementById("remember").checked;
  document.getElementById("overlay").style.display = "flex";
  try {
    await login(email, pw, remember);
  } catch(e){
    alert("Đăng nhập thất bại: " + e.message);
  }
  document.getElementById("overlay").style.display = "none";
});

onAuthStateChanged(auth, async (user)=>{
  if(user){
    const docRef = doc(db, "users", user.uid);
    const snap = await getDoc(docRef);
    if(snap.exists()){
      document.getElementById("status").innerText = `Đã đăng nhập: ${snap.data().displayName} (${snap.data().role})`;
    }
  }
});
