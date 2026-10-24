import { $, esc, money, url } from "./app.js";
import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { addDoc, collection, getDocs, orderBy, query, serverTimestamp, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { calcTotals, getCart, saveCart, summary } from "./cart.js";

const PAGE = document.body.dataset.page;

onAuthStateChanged(auth, (u) => {
  if (!u) { location.href = `${url("pages/login.html")}?next=${PAGE === "orders" ? "my-orders" : "checkout"}.html`; return; }
  PAGE === "orders" ? orders(u) : checkout(u);
});

function checkout(u) {
  const cart = getCart(), box = $("#co");
  if (!cart.length) { box.innerHTML = `<p class="muted">Your cart is empty. <a class="ul" href="${url("pages/products.html")}">Shop the drop.</a></p>`; return; }
  const t = calcTotals(cart);
  box.innerHTML = `<form id="f"><h1 class="disp big">Checkout</h1>
<label class="field">Full name<input name="name" required minlength="2" maxlength="80" value="${esc(u.displayName || "")}" autocomplete="name"></label>
<label class="field">Mobile number<input name="phone" required pattern="01[0-9]{9}" inputmode="numeric" placeholder="01XXXXXXXXX" autocomplete="tel"></label>
<label class="field">Delivery address<textarea name="address" required minlength="8" maxlength="300" rows="3" autocomplete="street-address"></textarea></label>
<p class="muted">Payment: cash on delivery.</p><p class="err" id="err" role="alert"></p>
<button class="btn hot full" id="go">Place order · ${money(t.total)}</button></form>
<div><h2 class="disp">Summary</h2>${cart.map((l) => `<div class="row"><span>${esc(l.name)} (${esc(l.size)}) × ${l.qty}</span><span>${money(l.price * l.qty)}</span></div>`).join("")}${summary(t)}</div>`;
  $("#f").onsubmit = async (e) => {
    e.preventDefault(); const f = new FormData(e.currentTarget); $("#go").disabled = true; $("#err").textContent = "";
    try {
      await addDoc(collection(db, "orders"), {
        uid: u.uid, email: u.email, name: f.get("name").trim(), phone: f.get("phone"), address: f.get("address").trim(),
        items: cart.map((l) => ({ id: l.id, name: l.name, size: l.size, qty: l.qty, price: l.price })),
        subtotal: t.subtotal, discount: t.discount, total: t.total, payment: "COD", status: "pending", createdAt: serverTimestamp(),
      });
      saveCart([]);
      box.innerHTML = `<div class="narrow"><h1 class="disp big">Order placed</h1><p class="muted">Thank you. We will call you to confirm before dispatch.</p><a class="btn" href="${url("pages/my-orders.html")}">View my orders</a></div>`;
    } catch { $("#err").textContent = "Could not place the order. Check your connection and try again."; $("#go").disabled = false; }
  };
}

async function orders(u) {
  const box = $("#orders");
  try {
    const s = await getDocs(query(collection(db, "orders"), where("uid", "==", u.uid), orderBy("createdAt", "desc")));
    box.innerHTML = s.empty ? `<p class="muted">No orders yet. <a class="ul" href="${url("pages/products.html")}">Shop the drop.</a></p>` : s.docs.map((d) => {
      const o = d.data();
      return `<div class="ord"><div class="row"><strong>#${d.id.slice(0, 6).toUpperCase()}</strong><span class="pill ${esc(o.status)}">${esc(o.status)}</span></div><small class="muted">${o.createdAt?.toDate().toLocaleDateString("en-GB") || ""}</small>${o.items.map((i) => `<div>${esc(i.name)} (${esc(i.size)}) × ${i.qty}</div>`).join("")}<div class="tot2">Total ${money(o.total)}</div></div>`;
    }).join("");
  } catch { box.innerHTML = `<p class="muted">Could not load your orders. Try again later.</p>`; }
}
