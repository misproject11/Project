// app.js
// Entry point: initializes all MenuCard components with product data.
// Depends on: MenuCard.js, whatsappUtil.js

import { renderMenuCard } from "./MenuCard.js";

// --------------------------------------------------------------------------
// PRODUCT CATALOG
// Replace imageSrc paths with your actual asset paths.
// options values must be Arrays (list of choices per key).
// --------------------------------------------------------------------------

const products = [
  {
    id: "prod-001",
    name: "Sumatra Dark Roast",
    description:
      "Single origin Aceh Gayo, roasted medium-dark dengan catatan coklat tua, cedar, dan sedikit earthy yang khas.",
    price: 55000,
    imageSrc: "./assets/images/sumatra-dark.jpg",
    badge: "Best Seller",
    options: {
      Ukuran: ["200g", "500g"],
      Grind:  ["Whole Bean", "French Press", "Pour Over", "Espresso"],
    },
  },
  {
    id: "prod-002",
    name: "Flores Natural",
    description:
      "Proses natural dari Bajawa, Flores. Profil rasa beri merah, rose hip, dan finish coklat susu yang panjang.",
    price: 72000,
    imageSrc: "./assets/images/flores-natural.jpg",
    badge: "Limited",
    options: {
      Ukuran: ["100g", "200g"],
      Grind:  ["Whole Bean", "AeroPress", "Pour Over"],
    },
  },
  {
    id: "prod-003",
    name: "Java Honey Process",
    description:
      "Diproses honey dari perkebunan Ijen, Jawa Timur. Manis karamel, stone fruit, dan body medium yang seimbang.",
    price: 63000,
    imageSrc: "./assets/images/java-honey.jpg",
    badge: null,
    options: {
      Ukuran: ["200g", "500g"],
      Grind:  ["Whole Bean", "Moka Pot", "Pour Over", "Espresso"],
    },
  },
  {
    id: "prod-004",
    name: "Toraja Sapan Village",
    description:
      "Micro-lot dari desa Sapan, Toraja Utara. Catatan dark cherry, walnut, dan herbal yang kompleks.",
    price: 80000,
    imageSrc: "./assets/images/toraja-sapan.jpg",
    badge: "New",
    options: {
      Ukuran: ["100g", "200g"],
      Grind:  ["Whole Bean", "French Press", "Pour Over"],
    },
  },
  {
    id: "prod-005",
    name: "Darkgroove Espresso Blend",
    description:
      "House blend yang dirancang khusus untuk espresso: bold, crema tebal, dengan aftertaste dark chocolate.",
    price: 58000,
    imageSrc: "./assets/images/espresso-blend.jpg",
    badge: null,
    options: {
      Ukuran: ["200g", "500g", "1kg"],
      Grind:  ["Whole Bean", "Espresso"],
    },
  },
  {
    id: "prod-006",
    name: "Bali Kintamani Washed",
    description:
      "Washed process dari ketinggian 1.500 mdpl di Kintamani. Cerah, citrus, dengan body ringan yang menyegarkan.",
    price: 60000,
    imageSrc: "./assets/images/bali-kintamani.jpg",
    badge: null,
    options: {
      Ukuran: ["200g", "500g"],
      Grind:  ["Whole Bean", "Pour Over", "AeroPress", "Cold Brew"],
    },
  },
];

// --------------------------------------------------------------------------
// CARD SLOT MAP
// Maps each product (by index) to its designated DOM slot in index.html.
// --------------------------------------------------------------------------

const slotMap = [
  { productIndex: 0, slotId: "card-01" },
  { productIndex: 1, slotId: "card-02" },
  { productIndex: 2, slotId: "card-03" },
  { productIndex: 3, slotId: "card-04" },
  { productIndex: 4, slotId: "card-05" },
  { productIndex: 5, slotId: "card-06" },
];

// --------------------------------------------------------------------------
// INITIALIZER
// --------------------------------------------------------------------------

function initMenuCards() {
  slotMap.forEach(({ productIndex, slotId }) => {
    const container = document.getElementById(slotId);

    if (!container) {
      console.warn(`[app.js] Slot #${slotId} not found in DOM.`);
      return;
    }

    const product = products[productIndex];

    if (!product) {
      console.warn(`[app.js] No product at index ${productIndex}.`);
      return;
    }

    renderMenuCard(container, product);
  });
}

// --------------------------------------------------------------------------
// SCROLL REVEAL
// Lightweight intersection-observer animation — no external library needed.
// Adds .is-visible to each .card-slot when it enters the viewport.
// --------------------------------------------------------------------------

function initScrollReveal() {
  const targets = document.querySelectorAll(".card-slot");

  if (!("IntersectionObserver" in window)) {
    targets.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  targets.forEach((el) => observer.observe(el));
}

// --------------------------------------------------------------------------
// BOOT
// --------------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
  initMenuCards();
  initScrollReveal();
});
