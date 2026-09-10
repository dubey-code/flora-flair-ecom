# Eco-store "Moscow spring" — build plan

A romantic, spring-light online store for eco-friendly goods with delivery in Moscow, plus a private admin area for products and orders.

## Look and feel

- Soft pastel palette: warm cream background, pale mint, blush pink, muted sage green, ink-brown text.
- Botanical accents: hand-drawn leaf and branch illustrations, soft grain, gentle blur washes.
- Fluid organic shapes: cards with uneven rounded corners, blob-shaped image frames.
- Editorial layout: asymmetric grid, oversized headings, generous whitespace, small caption text — not a standard shop grid.
- Fonts: an elegant display serif for headings with a clean humanist sans for text (loaded in the site head).

## Pages

1. **Home (`/`)** — hero showcase with a seasonal message, featured items, category strip, short "why eco" story block, delivery teaser.
2. **Catalog (`/catalog`)** — product grid with filters: category, price range, tags (zero-waste, handmade, refill), and sorting. Filters live in the address bar so a filtered view can be shared.
3. **Product page (`/catalog/<product>`)** — full gallery, composition, care notes, price, quantity, add-to-cart. Quick-view popup from the catalog for fast browsing.
4. **Cart and checkout (`/cart`, `/checkout`)** — quantity edits, order summary, delivery choice (courier inside MKAD, pickup point, outside MKAD), contact form, order confirmation screen with order number.
5. **Delivery in Moscow (`/delivery`)** — zones, times, cost thresholds, free-delivery limit.
6. **Privacy policy (`/privacy`)** and **public offer (`/offer`)** — full legal text pages.
7. **Footer** on every page: navigation, contacts, legal links, social, delivery note.
8. **Admin (`/admin`)** — sign-in protected. Products: create, edit, hide, delete, upload photos, stock. Orders: incoming list with customer details, items, totals, status changes (new → confirmed → shipped → done → cancelled).

## Backend

Lovable Cloud is enabled for this project so products, orders, and admin sign-in work for real:

- Tables: `products`, `categories`, `orders`, `order_items`, plus a separate roles table for admin rights.
- Public visitors can read published products only; orders can be placed by anyone but read only by admins.
- Product photos stored in Cloud storage.
- Admin rights are granted by role, never by anything stored in the browser.

## Technical notes

- TanStack Start routes per page; catalog filters as validated search params; loaders prefetch via TanStack Query.
- Cart kept in browser storage with a small context provider; order submitted through a server function that writes order + items atomically and returns the order number.
- Admin routes under `_authenticated/` with role check server-side on every read/write; product images via Cloud storage with signed upload.
- Design tokens (pastels, gradients, organic radii, shadows) defined in `src/styles.css`; no hardcoded colours in components.
- Each page gets its own title/description/social tags.

## Content

I will write Russian copy, product names, descriptions, prices, and delivery/legal text as realistic placeholders. Company name, real address, phone, email, and legal entity details need to come from you — tell me and I will replace them.

## Steps

1. Enable Cloud, create tables, policies, seed a starter catalogue.
2. Design system and shared layout (header, footer, botanical decor).
3. Home and catalog with filters, product page and quick view.
4. Cart, checkout, order confirmation.
5. Delivery, privacy, offer pages.
6. Admin sign-in, product management, order management.
