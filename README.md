# ZIZZVERSE store

Static streetwear store (HTML, CSS, JavaScript) with Firebase Authentication and Firestore. Hosted free on GitHub Pages.

## 1. Set up Firebase (10 minutes)
1. Go to https://console.firebase.google.com and create a project.
2. **Build > Authentication > Get started > Email/Password > Enable.**
3. **Build > Firestore Database > Create database** (production mode).
4. **Project settings > Your apps > Web (`</>`)**, register an app, copy the config into `js/firebase.js`.
5. **Authentication > Settings > Authorized domains > Add** `uzazizulhoque.github.io`.
6. Publish the security rules. Either paste `firebase/firestore.rules` into Firestore > Rules > Publish, or run:
   ```bash
   npm i -g firebase-tools && firebase login
   firebase use --add          # pick your project
   firebase deploy --only firestore
   ```
   This also creates the index in `firebase/firestore.indexes.json` that "My orders" needs.

## 2. Make yourself admin
1. Open the site, go to **Login > Create an account** and register.
2. Firebase console > Firestore > `users` > your document > change `role` from `customer` to `admin`.
3. Open `/admin/`. Click **Load sample data** on the dashboard to fill the store, then edit or delete items.

## 3. Deploy to GitHub Pages
1. Push this folder to your repository (`main` branch).
2. Repository **Settings > Pages > Source: GitHub Actions**.
3. Every push to `main` publishes the site via `.github/workflows/deploy.yml`.

## Adding product photos
Put files in `images/` (for example `images/tee1.jpg`), then in Admin > Products type `tee1.jpg` in the Image field. A full `https://` link also works. Hero photo: `images/hero.jpg`. Without an image, a coloured tile is shown.

## Folders
- `index.html`, `pages/` storefront
- `admin/` admin panel (dashboard, products, categories, orders, customers)
- `js/` one file per concern; `firebase.js` holds your config
- `firebase/` Firestore rules and indexes

## Known limits (static site, no server)
- **Order totals are calculated in the browser.** The rules check the shape of an order, not the prices. Always check the items and total in Admin > Orders before dispatching. For strict price checking, add a Cloud Function (needs Firebase Blaze plan).
- **Stock is not reduced automatically.** Update stock in Admin > Products.
- **Payment is cash on delivery only.** Online payment (bKash, SSLCommerz) needs a server.
- Firebase free plan limits: 50k reads and 20k writes per day, plenty for a small shop.
