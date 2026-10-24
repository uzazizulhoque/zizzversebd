import { $, esc, money, toast, url } from "./app.js";

const KEY = "zv_cart";
export const getCart = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
export function saveCart(c) { localStorage.setItem(KEY, JSON.stringify(c)); dispatchEvent(new Event("cart:change")); }

export function addToCart(p, size) {
  const c = getCart(), f = c.find((l) => l.id === p.id && l.size === size);
  if (f) f.qty = Math.min(10, f.qty + 1);
  else c.push({ id: p.id, name: p.name, price: p.price, size, qty: 1 });
  saveCart(c); toast("Added to cart");
}

// Buy 2 Get 1 Free: for every 3 units, the cheapest is free.
export function calcTotals(lines) {
  const u = [];
  lines.forEach((l) => { for (let i = 0; i < l.qty; i++) u.push(l.price); });
  u.sort((a, b) => a - b);
  const subtotal = u.reduce((a, b) => a + b, 0), free = Math.floor(u.length / 3);
  const discount = u.slice(0, free).reduce((a, b) => a + b, 0);
  return { subtotal, discount, total: subtotal - discount, free, units: u.length };
}

export function summary(t) {
  return `<div class="sum"><div><span>Subtotal</span><span>${money(t.subtotal)}</span></div>${t.free ? `<div class="free"><span>Free item${t.free > 1 ? "s" : ""} (${t.free})</span><span>-${money(t.discount)}</span></div>` : `<div class="muted"><span>Add ${3 - (t.units % 3)} more to get 1 free</span><span></span></div>`}<div class="tot"><span>Total</span><span>${money(t.total)}</span></div></div>`;
}

function render() {
  const c = getCart(), box = $("#cartbox");
  if (!c.length) { box.innerHTML = `<p class="muted">Your cart is empty. <a class="ul" href="${url("pages/products.html")}">Pick a tee from the drop.</a></p>`; return; }
  box.innerHTML = c.map((l, i) => `<div class="row"><div><a href="${url("pages/product-details.html")}?id=${encodeURIComponent(l.id)}">${esc(l.name)}</a><small>Size ${esc(l.size)} · ${money(l.price)}</small></div><div class="qty"><button data-i="${i}" data-d="-1" aria-label="Remove one">−</button>${l.qty}<button data-i="${i}" data-d="1" aria-label="Add one">+</button></div></div>`).join("")
    + summary(calcTotals(c)) + `<a class="btn hot full" href="${url("pages/checkout.html")}">Checkout</a>`;
}

if (document.body.dataset.page === "cart") {
  $("#cartbox").onclick = (e) => {
    const b = e.target.closest("button[data-i]"); if (!b) return;
    const c = getCart(), l = c[+b.dataset.i]; l.qty = Math.min(10, l.qty + +b.dataset.d);
    saveCart(c.filter((x) => x.qty > 0)); render();
  };
  render();
}
