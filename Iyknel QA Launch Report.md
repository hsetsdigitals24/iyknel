

**IYKNEL**

Wholesale FMCG Platform — Nigeria

| ⚠️   LAUNCH READINESS AUDIT   |   QA RELEASE REPORT |
| :---: |

Prepared: May 2026  |  Product: iyknel.vercel.app  |  Scope: Full Platform

# **Overall Scores**

| Dimension | Score | Status |
| :---- | :---- | :---- |
| UI / Visual Design | 6.5 / 10 | ⚠️ Needs Work |
| UX / User Journey | 5.5 / 10 | ⚠️ Needs Work |
| Trust & Credibility | 5.0 / 10 | ❌ Critical Gap |
| Mobile Experience | 6.0 / 10 | ⚠️ Needs Work |
| Conversion | 5.0 / 10 | ❌ Critical Gap |
| Checkout / Purchase Flow | 4.5 / 10 | ❌ Critical Gap |
| Product Maturity | 6.0 / 10 | ⚠️ Needs Work |
| **OVERALL** | **5.5 / 10** | **⚠️ NOT READY** |

| ⚠️  VERDICT: NOT PRODUCTION READY |
| :---: |

Promising B2B concept with a clean layout skeleton, but critical trust, imagery, and checkout gaps prevent commercial launch. Estimated remediation: 2–3 weeks on Priority 1 & 2 items before any paid marketing spend.

**1\.  FIRST IMPRESSION**

* ✅  Value proposition is immediately clear: B2B FMCG wholesale, Lagos delivery, bank transfer model

* ⚠️  Brand name 'Iyknel' carries zero trust equity — no tagline explains why to choose this over an open-market distributor

* ❌  No social proof, no order volume, no customer count — a first-time B2B buyer has no reason to trust this over calling a local distributor

* ❌  Hero carousel with random Unsplash images signals a demo/prototype, not a live commerce platform. Images should come from signed url of uploaded products.

**2\.  UI / VISUAL DESIGN**

* ✅  Clean typography; comfortable spacing; uncluttered layout

* ⚠️  Product cards render as text-only — no thumbnail images, which is fatal for FMCG browse-to-purchase
 

* ⚠️  Nav renders raw paths (/wishlist, /cart) — unprofessional; should use icons with labels

**3\.  IMAGES & VISUAL TRUST AUDIT**

* ❌  All hero images are random Unsplash fetches — unreliable, legally risky, visually generic

* ❌  Zero product photography across 150 SKUs — FMCG buyers must confirm pack size, variant and label
 
Recommended fix: Source actual product pack-shots or distributor press kits. Add at minimum one warehouse/operations image to the homepage. Avoid generic stock photography.

**4\.  UX / USER JOURNEY**

* ❌  Cart requires login — unauthenticated users are silently redirected with no context; high drop-off risk

* ❌  Wishlist is nav-accessible but non-functional for guests — same silent redirect issue

* ⚠️  No search bar on catalog — 150 products with only category filter and 4 sort options is insufficient

* ⚠️  'Showing 120 of 150' — no visible load-more or pagination UX

* ✅  Breadcrumbs present on all pages; category filtering is functional

**5\.  FUNCTIONAL QA**

| Issue | Severity |
| :---- | :---- |
| /wishlist and /cart rendered as raw text paths in nav | 🔴 Critical |
| Cart redirects to login silently — no toast or context | 🔴 Critical |
| All product images are generic Unsplash random fetches | 🔴 Critical |
| No keyword search on 150-product catalog | 🟠 High |
| Pagination 'Showing 120 of 150' — no load-more UX visible | 🟠 High |
| RC number field has no format validation hint | 🟡 Medium |
| Phone field has no \+234 country code prefix | 🟡 Medium |
| Password field has no strength indicator | 🟡 Medium |

**6\.  CHECKOUT / PURCHASE FLOW AUDIT**

* ❌  Full gating behind account creation — B2B prospects must register, wait up to 1 business day for verification, then return to order; no quote/inquiry path for cold leads

* ❌  Zero checkout flow visible pre-login — logistics pricing, invoice preview, and delivery timelines are all hidden until activation

* ❌  No minimum order value displayed on catalog or product pages

* ⚠️  'Free logistics over ₦200,000' is buried in a hero slide — not surfaced on product or cart pages where it drives purchase decisions

* ✅  Bank transfer model is clearly explained; appropriate for B2B context

**7\.  TRUST & SECURITY SIGNALS**

* ❌  Phone number is \+234 800 000 0000 — an obvious placeholder that destroys credibility on first contact

* ❌  No business registration info, no CAC number, no physical address beyond 'Lagos, Nigeria'

* ❌  No Privacy Policy, no Terms of Service linked anywhere on the site

* ❌  No testimonials, featured clients, order count or any form of social proof

* ⚠️  Custom email domain (orders@iyknel.ng) is a positive signal but undermined by the fake phone number

**8\.  PRODUCT MANAGEMENT REVIEW**

* ✅  Clear B2B niche; auto-computed logistics pricing is a genuine differentiator

* ✅  Catalog depth (150 SKUs, 10 categories) is solid for an FMCG MVP

* ❌  No MOQ (minimum order quantity) logic displayed — wholesale without visible MOQs confuses B2B buyers

* ❌  No reorder or order history shortcut — a core B2B retention mechanic

* ❌  No pricing tier or volume discount signal to incentivise larger basket sizes

# **Prioritized Improvement Roadmap**

| \# | Priority | Issue | Fix |
| :---- | :---- | :---- | :---- |
| 1 | 🔴 Critical | Placeholder phone number (+234 800 000 0000\) | Replace with real, working contact number immediately |
| 2 | 🔴 Critical | Zero product images across 150 SKUs | Add pack-shots; use distributor press kits as minimum |
| 3 | 🔴 Critical | Nav shows raw paths /cart and /wishlist | Replace with labelled icon links |
| 4 | 🔴 Critical | Cart/wishlist gated with no guest path or quote CTA | Add pre-login 'Get a quote' or inquiry flow |
| 5 | 🟠 High | No search bar on 150-product catalog | Add keyword search with debounce |
| 6 | 🟠 High | 'Free logistics over ₦200k' buried in hero | Surface threshold on product \+ cart pages as a badge |
| 7 | 🟠 High | No social proof or trust signals | Add order count, client logos, or WhatsApp fallback |
| 8 | 🟠 High | No Privacy Policy or Terms of Service | Create and link both pages for NDPR compliance |
| 9 | 🟡 Medium | No MOQ displayed on products | Add 'Minimum order: X units' on product pages |
| 10 | 🟡 Medium | RC number field lacks format hint | Add placeholder: 'e.g. RC-1234567' |
| 11 | 🟡 Medium | Phone field lacks \+234 prefix | Add country code selector or static prefix |
| 12 | 🟡 Medium | Hero images are random Unsplash fetches | Replace with owned or licensed assets |
| 13 | 🟢 Low | No volume pricing tier display | Add 'Buy 10+ cartons, save 5%' signals on product pages |
| 14 | 🟢 Low | No reorder shortcut in dashboard | Add 'Reorder' CTA to order history items |
| 15 | 🟢 Low | No sticky cart summary on mobile | Add fixed bottom bar showing cart total on mobile |

# **Final Launch Readiness Verdict**

| ⚠️  NOT READY FOR PUBLIC B2B LAUNCH |
| :---: |

**Strong concept. Clean foundation. The B2B wholesale model with auto-computed logistics is genuinely differentiated for the Lagos FMCG market. However, the following critical gaps will prevent conversion from any serious B2B buyer:**

* A working phone number is the single highest-priority fix — without it, every marketing impression is wasted

* Product images are non-negotiable for FMCG commerce; a text-only catalog will not convert

* Trust signals (policy pages, social proof, real contact info) are required before any outreach to wholesale accounts

Estimated time to launch-ready status: 2–3 weeks addressing Priority 1 (Critical) and Priority 2 (High) items before committing marketing budget.

| Overall Score 5.5 / 10 | Production Readiness NOT READY |
| :---- | :---- |

This report was prepared using enterprise QA methodology benchmarked against Shopify, Tradeling, Jumia and top-tier B2B e-commerce platforms.