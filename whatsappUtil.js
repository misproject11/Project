// whatsappUtil.js
// Utility module: WhatsApp order URL generator
// Responsible for composing structured order messages and producing wa.me deep-links.

const WHATSAPP_NUMBER = "6281234567890"; // Replace with your business number (country code, no '+' or spaces)

/**
 * Formats a currency value into Indonesian Rupiah string.
 * @param {number} amount
 * @returns {string}
 */
function formatRupiah(amount) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

/**
 * Composes a structured WhatsApp order message and returns a wa.me URL.
 *
 * @param {Object} product
 * @param {string} product.name         - Product display name
 * @param {number} product.price        - Base price in IDR
 * @param {Object} [product.options]    - Key/value map of custom options (e.g. { Ukuran: "M", Warna: "Hitam" })
 * @param {number} [product.quantity]   - Order quantity (defaults to 1)
 * @returns {string} Full wa.me URL ready for anchor href or window.open
 */
export function buildWhatsAppOrderURL(product) {
  const { name, price, options = {}, quantity = 1 } = product;

  const totalPrice = price * quantity;

  // Build options block only when custom options exist
  const optionLines = Object.entries(options)
    .map(([key, value]) => `  - ${key}: ${value}`)
    .join("\n");

  const optionsBlock = optionLines
    ? `\nDetail Pilihan:\n${optionLines}`
    : "";

  const message = [
    "Halo, saya ingin memesan:",
    "",
    `Produk   : ${name}`,
    `Harga    : ${formatRupiah(price)}`,
    `Jumlah   : ${quantity}`,
    `Total    : ${formatRupiah(totalPrice)}`,
    optionsBlock,
    "",
    "Mohon konfirmasi ketersediaan dan langkah pembayarannya. Terima kasih.",
  ]
    .join("\n")
    .trim();

  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;
}

/**
 * Directly opens the WhatsApp order conversation in a new tab.
 *
 * @param {Object} product - Same shape as buildWhatsAppOrderURL parameter
 */
export function openWhatsAppOrder(product) {
  const url = buildWhatsAppOrderURL(product);
  window.open(url, "_blank", "noopener,noreferrer");
}