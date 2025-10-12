import { auth, db } from "./firebase-init.js";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const loginForm = document.getElementById("login-form");
const loadingOverlay = document.getElementById("loading-overlay");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  loadingOverlay.classList.remove("hidden");
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const docRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      alert("Không tìm thấy thông tin người dùng trong Firestore!");
      return;
    }

    const role = docSnap.data().role;
    localStorage.setItem("userRole", role);

    if (role === "admin") {
      window.location.href = "dashboard.html";
    } else {
      alert("Bạn không có quyền truy cập vào trang quản trị!");
      await signOut(auth);
    }

  } catch (error) {
    alert("Đăng nhập thất bại: " + error.message);
  } finally {
    loadingOverlay.classList.add("hidden");
  }
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("✅ Đã đăng nhập:", user.email);
  } else {
    console.log("🚪 Chưa đăng nhập hoặc đã đăng xuất");
  }
});
