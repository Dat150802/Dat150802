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
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "SENDER_ID",
  appId: "APP_ID"
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
