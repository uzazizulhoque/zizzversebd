// Admin panel. Access is enforced by firebase/firestore.rules (users/{uid}.role == "admin"); this guard is only for UX.
import { $, esc, money, toast, url } from "./app.js";
import { auth, db, configured } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, serverTimestamp, updateDoc, writeBatch } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const PAGE = document.body.dataset.page;
const root = $("#admin");
const STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const all = async (name, ord) => (await getDocs(ord ? query(collection(db, name), orderBy(ord, "desc")) : collection(db, name))).docs.map((d) => ({ id: d.id, ...d.data() }));
const gate = (msg) => { root.innerHTML = `<div class="gate"><h1 class="disp">Admin</h1><p class="muted">${esc(msg)}</p><a class="btn" href="${url("pages/login.html")}">Login</a> <a class="btn ghost" href="${url("index.html")}">Back to store</a></div>`; };

if (!configured) gate("Add your Firebase config in js/firebase.js first.");
else onAuthStateChanged(auth, async (u) => {
  if (!u) return gate("Sign in with your admin account.");
  try {
    const me = await getDoc(doc(db, "users", u.uid));
    if (me.data()?.role !== "admin") return gate("This account does not have admin access.");
  } catch { return gate("Could not verify access. Check your connection."); }
  shell(u); run();
});

function shell(u) {
  const link = (f, t) => `<a href="${url(`admin/${f}`)}" ${PAGE === (f === "index.html" ? "dashboard" : f.replace(".html", "")) ? 'aria-current="page"' : ""}>${t}</a>`;
  root.innerHTML = `<div class="shell"><nav class="side"><div class="logo">ZIZZVERSE</div>${link("index.html", "Dashboard")}${link("products.html", "Products")}${link("categories.html", "Categories")}${link("orders.html", "Orders")}${link("customers.html", "Customers")}<a href="${url("index.html")}">View store</a><button id="out" class="linkbtn">Logout (${esc(u.email)})</button></nav><main class="view" id="view"></main></div>`;
  $("#out").onclick = async () => { await signOut(auth); location.href = url("index.html"); };
}

const fail = () => { $("#view").innerHTML = `<p class="err">Something went wrong. Check your connection and Firestore rules, then reload.</p>`; };
const run = () => ({ dashboard, products, categories, orders, customers }[PAGE]().catch(fail));

async function dashboard() {
  const [ps, os, us, cs] = await Promise.all([all("products"), all("orders"), all("users"), all("categories")]);
  const rev = os.filter((o) => o.status === "delivered").reduce((n, o) => n + o.total, 0);
  const stat = (t, v) => `<div class="stat"><span>${t}</span><strong>${v}</strong></div>`;
  $("#view").innerHTML = `<h1 class="disp">Dashboard</h1><div class="stats">${stat("Products", ps.length)}${stat("Pending orders", os.filter((o) => o.status === "pending").length)}${stat("All orders", os.length)}${stat("Customers", us.filter((x) => x.role === "customer").length)}${stat("Delivered revenue", money(rev))}</div>
${!cs.length && !ps.length ? `<div class="box"><p>Your store is empty. Load sample categories and products to see the site working, then edit or delete them.</p><button class="btn hot" id="seed">Load sample data</button></div>` : ""}`;
  $("#seed")?.addEventListener("click", async (e) => { e.target.disabled = true; await seed(); toast("Sample data loaded"); dashboard(); });
}

async function seed() {
  const cats = ["Basic Top", "Drop T-shirt", "Lower Layer", "Polo", "Anime", "Winter Collection"];
  const P = [["Night Shift", 1, 550, 0, "#1a1a22", "NIGHT SHIFT"], ["Black Orbit", 1, 550, 0, "#101010", "ORBIT"], ["Wild Run", 1, 550, 0, "#2d4a3e", "WILD RUN"], ["Solar Flare", 1, 550, 600, "#3b2f73", "SOLAR"], ["Insomnia", 0, 370, 0, "#e9e4d8", "INSOMNIA"], ["Late Bloom", 0, 370, 0, "#6b2a3a", "BLOOM"], ["Static", 0, 370, 0, "#1f2a44", ""], ["Samurai Ink", 4, 550, 0, "#0f0f14", "SAMURAI"], ["Pirate Flag", 4, 550, 0, "#b8312f", "PIRATE"], ["Court Polo", 3, 650, 0, "#14213d", ""], ["Cargo Jogger", 2, 790, 0, "#2a2a2e", ""], ["Heavy Hoodie", 5, 1190, 0, "#1c1c24", "ZV"]];
  const b = writeBatch(db);
  cats.forEach((n) => b.set(doc(collection(db, "categories")), { name: n, slug: slugify(n) }));
  P.forEach(([name, c, price, oldPrice, color, label]) => b.set(doc(collection(db, "products")), { name, category: slugify(cats[c]), categoryName: cats[c], price, oldPrice, color, label, image: "", stock: 50, active: true, createdAt: serverTimestamp() }));
  await b.commit();
}

async function products() {
  const [ps, cs] = await Promise.all([all("products", "createdAt"), all("categories")]);
  $("#view").innerHTML = `<div class="bar"><h1 class="disp">Products</h1><button class="btn hot" id="new">Add product</button></div>
<div class="scroll"><table><thead><tr><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Visible</th><th></th></tr></thead><tbody>${ps.map((p) => `<tr><td>${esc(p.name)}</td><td>${esc(p.categoryName || "")}</td><td>${money(p.price)}</td><td>${p.stock}</td><td>${p.active === false ? "Hidden" : "Yes"}</td><td class="act"><button class="linkbtn" data-e="${p.id}">Edit</button><button class="linkbtn danger" data-x="${p.id}">Delete</button></td></tr>`).join("")}</tbody></table>${ps.length ? "" : '<p class="muted">No products yet.</p>'}</div>
<dialog id="dlg"><form id="pf" method="dialog"><h2 class="disp" id="dt">Product</h2>
<label class="field">Name<input name="name" required maxlength="80"></label>
<label class="field">Category<select name="category" required>${cs.map((c) => `<option value="${esc(c.slug)}">${esc(c.name)}</option>`).join("")}</select></label>
<div class="two2"><label class="field">Price (BDT)<input name="price" type="number" min="1" step="1" required></label><label class="field">Old price (optional)<input name="oldPrice" type="number" min="0" step="1"></label></div>
<div class="two2"><label class="field">Stock<input name="stock" type="number" min="0" step="1" required value="50"></label><label class="field">Tile colour<input name="color" type="color" value="#1a1a22"></label></div>
<label class="field">Tile text (when no image)<input name="label" maxlength="20"></label>
<label class="field">Image (file in /images, e.g. tee1.jpg, or a full https link)<input name="image"></label>
<label class="chk"><input name="active" type="checkbox" checked> Visible in store</label>
<div class="bar"><button type="button" class="btn ghost" id="cx">Cancel</button><button class="btn hot">Save</button></div></form></dialog>`;
  const dlg = $("#dlg"), f = $("#pf"); let editing = null;
  const openForm = (p) => { editing = p?.id || null; f.reset(); $("#dt").textContent = p ? "Edit product" : "Add product"; if (p) for (const k of ["name", "category", "price", "oldPrice", "stock", "color", "label", "image"]) f[k].value = p[k] ?? ""; f.active.checked = p ? p.active !== false : true; dlg.showModal(); };
  $("#new").onclick = () => (cs.length ? openForm() : toast("Add a category first"));
  $("#cx").onclick = () => dlg.close();
  f.onsubmit = async (e) => {
    e.preventDefault(); const d = Object.fromEntries(new FormData(f));
    const data = { name: d.name.trim(), category: d.category, categoryName: cs.find((c) => c.slug === d.category)?.name || "", price: Math.round(+d.price), oldPrice: Math.round(+d.oldPrice || 0), stock: Math.round(+d.stock), color: d.color, label: d.label.trim(), image: d.image.trim(), active: f.active.checked };
    try { editing ? await updateDoc(doc(db, "products", editing), data) : await addDoc(collection(db, "products"), { ...data, createdAt: serverTimestamp() }); dlg.close(); toast("Saved"); products(); } catch { toast("Could not save. Check your admin access."); }
  };
  $("#view").onclick = async (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.e) openForm(ps.find((p) => p.id === b.dataset.e));
    if (b.dataset.x && confirm("Delete this product? This cannot be undone.")) { await deleteDoc(doc(db, "products", b.dataset.x)); toast("Deleted"); products(); }
  };
}

async function categories() {
  const cs = await all("categories");
  cs.sort((a, b) => a.name.localeCompare(b.name));
  $("#view").innerHTML = `<h1 class="disp">Categories</h1><form class="inline" id="cf"><input name="name" required maxlength="40" placeholder="New category name" aria-label="Category name"><button class="btn hot">Add</button></form>
<div class="scroll"><table><thead><tr><th>Name</th><th>Slug</th><th></th></tr></thead><tbody>${cs.map((c) => `<tr><td>${esc(c.name)}</td><td>${esc(c.slug)}</td><td class="act"><button class="linkbtn danger" data-x="${c.id}">Delete</button></td></tr>`).join("")}</tbody></table></div><p class="muted">Deleting a category does not delete its products.</p>`;
  $("#cf").onsubmit = async (e) => { e.preventDefault(); const name = new FormData(e.target).get("name").trim(); const slug = slugify(name); if (!slug) return; await addDoc(collection(db, "categories"), { name, slug }); categories(); };
  $("#view").onclick = async (e) => { const b = e.target.closest("[data-x]"); if (b && confirm("Delete this category?")) { await deleteDoc(doc(db, "categories", b.dataset.x)); categories(); } };
}

async function orders() {
  const os = await all("orders", "createdAt");
  $("#view").innerHTML = `<h1 class="disp">Orders</h1><div class="scroll"><table><thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th></tr></thead><tbody>${os.map((o) => `<tr><td>#${o.id.slice(0, 6).toUpperCase()}<br><small class="muted">${o.createdAt?.toDate().toLocaleString("en-GB") || ""}</small></td><td>${esc(o.name)}<br><small class="muted">${esc(o.phone)}<br>${esc(o.address)}</small></td><td>${o.items.map((i) => `${esc(i.name)} (${esc(i.size)}) ×${i.qty}`).join("<br>")}</td><td>${money(o.total)}${o.discount ? `<br><small class="muted">incl. -${money(o.discount)} offer</small>` : ""}</td><td><select data-o="${o.id}" aria-label="Status for order ${o.id.slice(0, 6)}">${STATUSES.map((s) => `<option ${s === o.status ? "selected" : ""}>${s}</option>`).join("")}</select></td></tr>`).join("")}</tbody></table>${os.length ? "" : '<p class="muted">No orders yet.</p>'}</div>`;
  $("#view").onchange = async (e) => { const s = e.target.closest("[data-o]"); if (!s) return; try { await updateDoc(doc(db, "orders", s.dataset.o), { status: s.value }); toast("Status updated"); } catch { toast("Could not update"); } };
}

async function customers() {
  const us = (await all("users", "createdAt")).filter((u) => u.role === "customer");
  $("#view").innerHTML = `<h1 class="disp">Customers</h1><div class="scroll"><table><thead><tr><th>Name</th><th>Email</th><th>Joined</th></tr></thead><tbody>${us.map((u) => `<tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${u.createdAt?.toDate().toLocaleDateString("en-GB") || ""}</td></tr>`).join("")}</tbody></table>${us.length ? "" : '<p class="muted">No customers yet.</p>'}</div>`;
}
