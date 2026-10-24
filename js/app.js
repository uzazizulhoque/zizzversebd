// Shared helpers, site header/footer, home page.
import { auth, db, configured } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, getDocs, orderBy, query } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export const ROOT = document.body.dataset.root || "";
export const PAGE = document.body.dataset.page;
export const $ = (s, r = document) => r.querySelector(s);
export const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const money = (n) => `${Number(n).toLocaleString("en-US")} BDT`;
export const url = (p) => `${ROOT}${p}`;

export function toast(msg) {
  let t = $("#toast");
  if (!t) { t = document.createElement("div"); t.id = "toast"; t.setAttribute("role", "status"); document.body.append(t); }
  t.textContent = msg; t.classList.add("on");
  clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove("on"), 1800);
}

const isLight = (hex) => { const n = parseInt((hex || "#000").slice(1), 16); return ((n >> 16) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000 > 150; };
export const imgSrc = (p) => (p.image ? (/^https?:/.test(p.image) ? p.image : `${ROOT}images/${p.image}`) : "");
export function shot(p) {
  const s = imgSrc(p);
  if (s) return `<img src="${esc(s)}" alt="${esc(p.name)}" loading="lazy">`;
  const c = p.color || "#1a1a22";
  return `<div class="tile" style="background:${esc(c)};color:${isLight(c) ? "#111" : "#f1ece2"}">${esc(p.label || p.name)}</div>`;
}
export function card(p) {
  const off = p.oldPrice > p.price ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
  return `<a class="card" href="${url("pages/product-details.html")}?id=${encodeURIComponent(p.id)}"><div class="shot">${off ? `<span class="tag">-${off}%</span>` : ""}${shot(p)}</div><div class="nm">${esc(p.name)}</div><div class="pr">${money(p.price)}${off ? `<s>${money(p.oldPrice)}</s>` : ""}</div></a>`;
}

let _p, _c;
export const fetchProducts = () => (_p ??= getDocs(query(collection(db, "products"), orderBy("createdAt", "desc"))).then((s) => s.docs.map((d) => ({ id: d.id, ...d.data() })).filter((p) => p.active !== false)));
export const fetchCategories = () => (_c ??= getDocs(collection(db, "categories")).then((s) => s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => a.name.localeCompare(b.name))));
export const failed = (el, what) => { el.innerHTML = `<p class="muted pad">${configured ? `Could not load ${what}. Check your connection and try again.` : "The store is not connected yet. Add your Firebase config in js/firebase.js."}</p>`; };

const cartCount = () => { try { return JSON.parse(localStorage.getItem("zv_cart") || "[]").reduce((n, l) => n + l.qty, 0); } catch { return 0; } };
const ico = (d) => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;

function layout() {
  $("#hdr").innerHTML = `<header class="top"><div class="in">
<div><button class="ib" id="mo" aria-label="Open menu">${ico('<path d="M3 7h18M3 12h18M3 17h12"/>')}</button></div>
<a class="logo" href="${url("index.html")}">ZIZZVERSE</a>
<div class="r"><button class="ib" id="so" aria-label="Search">${ico('<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>')}</button>
<a class="ib" href="${url("pages/cart.html")}" aria-label="Cart">${ico('<path d="M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2"/>')}<span class="badge" id="badge"></span></a></div></div></header>
<div class="scrim" id="scrim" hidden></div>
<aside class="drawer" id="drawer" aria-label="Menu" hidden><button class="xb" id="mc" aria-label="Close menu">×</button>
<form class="sbox" id="sf" role="search"><input id="sq" type="search" placeholder="Search products" aria-label="Search products" autocomplete="off"><button aria-label="Search">${ico('<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>')}</button></form>
<nav id="mn"><a class="mi" href="${url("pages/products.html")}">All products</a><a class="mi" href="${url("index.html")}#offer">Buy 2 get 1 free</a><div id="mcats"></div><a class="mi" id="acct" href="${url("pages/login.html")}">Login</a><button class="mi" id="lo" hidden>Logout</button></nav></aside>`;
  $("#ftr").innerHTML = `<footer class="ft"><div class="wrap"><div class="logo">ZIZZVERSE</div><p>Wear the verse. Dhaka, Bangladesh</p><p><a href="${url("pages/products.html")}">Shop</a> · <a href="${url("pages/my-orders.html")}">My orders</a></p><p>© ${new Date().getFullYear()} ZIZZVERSE. All rights reserved.</p></div></footer>`;

  const open = (on) => { for (const id of ["drawer", "scrim"]) $("#" + id).hidden = !on; if (on) $("#sq").focus(); };
  $("#mo").onclick = $("#so").onclick = () => open(true);
  $("#mc").onclick = $("#scrim").onclick = () => open(false);
  document.addEventListener("keydown", (e) => e.key === "Escape" && open(false));
  $("#sf").onsubmit = (e) => { e.preventDefault(); location.href = `${url("pages/products.html")}?q=${encodeURIComponent($("#sq").value.trim())}`; };

  const badge = () => { const n = cartCount(); $("#badge").textContent = n || ""; };
  badge(); addEventListener("cart:change", badge); addEventListener("storage", badge);

  onAuthStateChanged(auth, (u) => {
    $("#acct").textContent = u ? "My orders" : "Login";
    $("#acct").href = url(u ? "pages/my-orders.html" : "pages/login.html");
    $("#lo").hidden = !u;
  });
  $("#lo").onclick = async () => { await signOut(auth); location.href = url("index.html"); };
  fetchCategories().then((cs) => { $("#mcats").innerHTML = cs.map((c) => `<a class="mi" href="${url("pages/category.html")}?c=${encodeURIComponent(c.slug)}">${esc(c.name)}</a>`).join(""); }).catch(() => {});
  if (!configured) $("#app").insertAdjacentHTML("afterbegin", `<p class="notice">Setup needed: add your Firebase config in js/firebase.js.</p>`);
}

async function home() {
  const tapes = ["ZIZZVERSE / Best drop in town / Out of this world / Your virtual wardrobe / ", "Streetwear Bangladesh / New drops every month / Buy 2 get 1 free / Limited runs / "];
  document.querySelectorAll(".tape").forEach((t, i) => (t.firstElementChild.textContent = tapes[i].repeat(6)));
  try {
    const [ps, cs] = await Promise.all([fetchProducts(), fetchCategories()]);
    $("#latest").innerHTML = ps.length ? ps.slice(0, 8).map(card).join("") : `<p class="muted pad">New drops are coming soon.</p>`;
    $("#cats").innerHTML = cs.map((c) => `<a class="cat" href="${url("pages/category.html")}?c=${encodeURIComponent(c.slug)}"><h3 class="disp">${esc(c.name)}</h3></a>`).join("");
  } catch { failed($("#latest"), "products"); }
}

if (document.body.dataset.layout !== "none") { layout(); if (PAGE === "home") home(); }
