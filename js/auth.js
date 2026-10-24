import { $, url } from "./app.js";
import { auth, db } from "./firebase.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, serverTimestamp, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const MSG = {
  "auth/invalid-credential": "Wrong email or password.",
  "auth/email-already-in-use": "An account with this email already exists. Try logging in.",
  "auth/weak-password": "Use a password with at least 6 characters.",
  "auth/invalid-email": "Enter a valid email address.",
  "auth/too-many-requests": "Too many attempts. Wait a few minutes and try again.",
  "auth/network-request-failed": "No connection. Check your internet and try again.",
};
const next = () => { const n = new URLSearchParams(location.search).get("next"); return /^[\w-]+\.html$/.test(n || "") ? url(`pages/${n}`) : url("index.html"); };

$("#form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = new FormData(e.currentTarget), btn = e.submitter, err = $("#err");
  err.textContent = ""; btn.disabled = true;
  try {
    const email = f.get("email").trim(), password = f.get("password");
    if (document.body.dataset.page === "register") {
      const name = f.get("name").trim();
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(user, { displayName: name });
      await setDoc(doc(db, "users", user.uid), { name, email, role: "customer", createdAt: serverTimestamp() });
    } else await signInWithEmailAndPassword(auth, email, password);
    location.href = next();
  } catch (x) { err.textContent = MSG[x.code] || "Something went wrong. Try again."; btn.disabled = false; }
});
