import { $, card, esc, failed, fetchCategories, fetchProducts, money, shot, url } from "./app.js";
import { addToCart } from "./cart.js";

const qp = new URLSearchParams(location.search);
const PAGE = document.body.dataset.page;

function chips(cs, active) {
  $("#chips").innerHTML = `<a class="chip" href="${url("pages/products.html")}" aria-pressed="${!active}">All</a>` +
    cs.map((c) => `<a class="chip" href="${url("pages/category.html")}?c=${encodeURIComponent(c.slug)}" aria-pressed="${c.slug === active}">${esc(c.name)}</a>`).join("");
}

async function list() {
  try {
    const [ps, cs] = await Promise.all([fetchProducts(), fetchCategories()]);
    let out = ps, title = "All products";
    const q = (qp.get("q") || "").trim().toLowerCase(), slug = qp.get("c");
    if (PAGE === "category") { out = ps.filter((p) => p.category === slug); title = cs.find((c) => c.slug === slug)?.name || "Category"; }
    if (q) { out = ps.filter((p) => `${p.name} ${p.categoryName || ""}`.toLowerCase().includes(q)); title = `Results for "${qp.get("q")}"`; }
    $("#title").textContent = title; document.title = `${title} | ZIZZVERSE`;
    chips(cs, PAGE === "category" ? slug : null);
    $("#grid").innerHTML = out.length ? out.map(card).join("") : `<p class="muted pad">No products found.</p>`;
  } catch { failed($("#grid"), "products"); }
}

async function details() {
  const box = $("#pdp");
  try {
    const p = (await fetchProducts()).find((x) => x.id === qp.get("id"));
    if (!p) { box.innerHTML = `<p class="muted pad">This product is not available. <a class="ul" href="${url("pages/products.html")}">Back to shop</a></p>`; return; }
    document.title = `${p.name} | ZIZZVERSE`;
    const sold = p.stock <= 0; let size = "M";
    box.innerHTML = `<div class="shot big-shot">${shot(p)}</div><div><div class="muted">${esc(p.categoryName || "")}</div><h1 class="disp">${esc(p.name)}</h1><div class="price">${money(p.price)}${p.oldPrice > p.price ? `<s>${money(p.oldPrice)}</s>` : ""}</div>
${sold ? `<p class="err">Sold out</p>` : `<div class="sizes" id="sz" role="group" aria-label="Size">${["S", "M", "L", "XL"].map((s) => `<button class="sz" data-s="${s}" aria-pressed="${s === size}">${s}</button>`).join("")}</div><button class="btn hot full" id="add">Add to cart</button>`}
<p class="muted">Oversized fit. Exchange within 7 days if unworn with tags on. Buy 2, get 1 free.</p></div>`;
    if (!sold) {
      $("#sz").onclick = (e) => { const b = e.target.closest("[data-s]"); if (!b) return; size = b.dataset.s; $("#sz").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x === b)); };
      $("#add").onclick = () => addToCart(p, size);
    }
  } catch { failed(box, "this product"); }
}

PAGE === "details" ? details() : list();
