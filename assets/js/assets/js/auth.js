<script type="module">
import { auth, db } from "./firebase-init.js";
import {
  setPersistence, browserLocalPersistence, browserSessionPersistence,
  signInWithEmailAndPassword, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const overlay = document.getElementById("loading-overlay");
function showLoading(t="Đang xử lý..."){ overlay?.classList.remove("hidden"); overlay?.querySelector("p")?.textContent=t; }
function hideLoading(){ overlay?.classList.add("hidden"); }

function enforceRoleUI(role){
  document.querySelectorAll('[data-role="admin-only"]').forEach(el=>{
    el.toggleAttribute("disabled", role!=="admin");
    el.style.opacity = role==="admin" ? "1" : ".5";
    el.style.pointerEvents = role==="admin" ? "auto" : "none";
  });
}

async function ensureUserProfile(uid, email){
  const uRef = doc(db, "users", uid);
  const s = await getDoc(uRef);
  if(!s.exists()){
    await setDoc(uRef, {
      email,
      username: email.startsWith("admin") ? "admin" : "nhanvien",
      role: email.startsWith("admin") ? "admin" : "staff",
      displayName: email.startsWith("admin") ? "Quản trị viên" : "Nhân viên",
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp()
    });
    return (await getDoc(uRef)).data();
  } else {
    await setDoc(uRef, { lastLoginAt: serverTimestamp() }, { merge:true });
    return s.data();
  }
}

async function doLogin(email, password, remember=true){
  await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return ensureUserProfile(cred.user.uid, email);
}

// Wire form theo id trong index.html
const form = document.getElementById("login-form");
const ipUser = document.getElementById("username");   // nhập email
const ipPass = document.getElementById("password");
const ipRemember = document.getElementById("remember");
const who = document.getElementById("who");

form?.addEventListener("submit", async (e)=>{
  e.preventDefault();
  try{
    showLoading("Đang đăng nhập...");
    const email = (ipUser?.value || "").trim();
    const pass = ipPass?.value || "";
    const remember = ipRemember?.checked ?? true;

    const p = await doLogin(email, pass, remember);
    who && (who.textContent = `Xin chào ${p.displayName} (${p.role})`);
    enforceRoleUI(p.role);

    document.getElementById("login-screen")?.classList.add("hidden");
    document.getElementById("app-screen")?.classList.remove("hidden");
  }catch(e){ alert("Đăng nhập thất bại: " + e.message); }
  finally{ hideLoading(); }
});

onAuthStateChanged(auth, async (user)=>{
  if(user){
    const snap = await getDoc(doc(db,"users",user.uid));
    const role = snap.exists()? snap.data().role : "guest";
    who && (who.textContent = `Đang đăng nhập: ${(snap.data()?.displayName)||user.email} (${role})`);
    enforceRoleUI(role);
    document.getElementById("login-screen")?.classList.add("hidden");
    document.getElementById("app-screen")?.classList.remove("hidden");
  }else{
    enforceRoleUI("guest");
    document.getElementById("app-screen")?.classList.add("hidden");
    document.getElementById("login-screen")?.classList.remove("hidden");
  }
});
</script>
