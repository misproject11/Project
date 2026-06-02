// MenuCard.js
// Modular UI component: Product card for e-commerce single-page site.
// Palette: Crimson Depth #710014 | Warm Sand #838F6F | Soft Pearl #F2F1ED | Obsidian Black #161616
// Depends on: whatsappUtil.js

import { openWhatsAppOrder } from "./whatsappUtil.js";

/**
 * Renders a single MenuCard into a given container element.
 *
 * @param {HTMLElement} container - The DOM node that will receive this card.
 * @param {Object}      product
 * @param {string}      product.id          - Unique product identifier
 * @param {string}      product.name        - Product display name
 * @param {string}      product.description - Short product description
 * @param {number}      product.price       - Price in IDR
 * @param {string}      product.imageSrc    - Path or URL to product image
 * @param {string}      [product.badge]     - Optional label (e.g. "Best Seller")
 * @param {Object}      [product.options]   - Key/value map of custom options
 */
export function renderMenuCard(container, product) {
  const {
    name,
    description,
    price,
    imageSrc,
    badge = null,
    options = {},
  } = product;

  const formattedPrice = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price);

  // Build badge markup conditionally
  const badgeHTML = badge
    ? `<span class="menu-card__badge">${badge}</span>`
    : "";

  // Build options selector markup conditionally
  const optionKeys = Object.keys(options);
  const optionsHTML =
    optionKeys.length > 0
      ? `<div class="menu-card__options">
          ${optionKeys
            .map(
              (key) => `
            <div class="menu-card__option-group">
              <label class="menu-card__option-label" for="opt-${name}-${key}">
                ${key}
              </label>
              <select
                class="menu-card__option-select"
                id="opt-${name}-${key}"
                data-option-key="${key}"
              >
                ${options[key]
                  .map((val) => `<option value="${val}">${val}</option>`)
                  .join("")}
              </select>
            </div>`
            )
            .join("")}
        </div>`
      : "";

  // Inject card HTML
  container.innerHTML = `
    <article class="menu-card" data-product-id="${product.id}">

      <div class="menu-card__image-wrapper">
        ${badgeHTML}
        <img
          class="menu-card__image"
          src="${imageSrc}"
          alt="${name}"
          loading="lazy"
        />
        <div class="menu-card__image-overlay" aria-hidden="true"></div>
      </div>

      <div class="menu-card__body">

        <div class="menu-card__header">
          <h3 class="menu-card__name">${name}</h3>
          <span class="menu-card__price">${formattedPrice}</span>
        </div>

        <p class="menu-card__description">${description}</p>

        ${optionsHTML}

        <button
          class="menu-card__cta"
          type="button"
          aria-label="Pesan ${name} via WhatsApp"
        >
          <svg
            class="menu-card__cta-icon"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M20.52 3.48A11.93 11.93 0 0 0 12 0C5.37 0 0 5.37 0 12c0 2.11.55 4.16 1.6 5.97L0 24l6.22-1.57A11.94 11.94 0 0 0 12 24c6.63 0 12-5.37 12-12 0-3.21-1.25-6.22-3.48-8.52zM12 22c-1.85 0-3.67-.5-5.25-1.44l-.38-.22-3.93.99 1.03-3.82-.25-.4A9.94 9.94 0 0 1 2 12C2 6.48 6.48 2 12 2c2.67 0 5.18 1.04 7.07 2.93A9.94 9.94 0 0 1 22 12c0 5.52-4.48 10-10 10zm5.44-7.38c-.3-.15-1.77-.87-2.04-.97-.28-.1-.48-.15-.68.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.47-.89-.79-1.49-1.76-1.66-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.68-1.63-.93-2.23-.24-.58-.49-.5-.68-.51H7.5c-.17 0-.45.06-.69.3C6.57 8.1 6 8.73 6 9.97c0 1.24.9 2.44 1.03 2.61.13.17 1.77 2.71 4.29 3.8.6.26 1.07.41 1.44.53.6.19 1.15.16 1.58.1.48-.07 1.48-.6 1.69-1.19.21-.58.21-1.08.15-1.19-.07-.1-.27-.17-.57-.32z"/>
          </svg>
          Pesan via WhatsApp
        </button>

      </div>
    </article>
  `;

  // Attach CTA event listener after DOM injection
  const ctaButton = container.querySelector(".menu-card__cta");
  ctaButton.addEventListener("click", () => {
    // Collect currently selected option values from dropdowns (if any)
    const selectedOptions = {};
    container.querySelectorAll(".menu-card__option-select").forEach((select) => {
      const key = select.dataset.optionKey;
      selectedOptions[key] = select.value;
    });

    openWhatsAppOrder({
      ...product,
      options: selectedOptions,
    });
  });
}