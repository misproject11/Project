// AdminDashboard.js
import { auth, db, storage }        from "./firebaseConfig.js";
import { signOut }                   from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection, addDoc, getDocs,
  doc, updateDoc, deleteDoc,
  serverTimestamp, query, orderBy,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  ref, uploadBytesResumable, getDownloadURL, deleteObject,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { renderAdminLogin } from "./AdminLogin.js";

// --------------------------------------------------------------------------
// CONSTANTS
// --------------------------------------------------------------------------

const PRODUCTS_COL = "products";
const STORAGE_PATH = "products";

// --------------------------------------------------------------------------
// STATE
// Internal module-level state. Resets on each renderAdminDashboard() call.
// --------------------------------------------------------------------------

let _state = {
  products:      [],
  editingId:     null,
  uploading:     false,
};

// --------------------------------------------------------------------------
// RENDERER
// --------------------------------------------------------------------------

export function renderAdminDashboard(container, user) {
  _state = { products: [], editingId: null, uploading: false };

  container.innerHTML = `
    <div class="ad-layout">

      <header class="ad-topbar">
        <div class="ad-topbar__brand">
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none"
            xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="15" stroke="#F2F1ED" stroke-width="1.5"/>
            <circle cx="16" cy="16" r="9"  stroke="#F2F1ED" stroke-width="1.5"/>
            <circle cx="16" cy="16" r="2.5" fill="#710014"/>
          </svg>
          <span class="ad-topbar__title">Admin Dashboard</span>
        </div>
        <div class="ad-topbar__meta">
          <span class="ad-topbar__user">${user.email}</span>
          <button class="ad-btn ad-btn--ghost ad-btn--sm" id="ad-logout">
            Sign Out
          </button>
        </div>
      </header>

      <main class="ad-main">

        <section class="ad-panel" id="ad-form-panel">
          <h2 class="ad-panel__title" id="ad-form-title">Add New Product</h2>

          <div class="ad-alert" id="ad-form-alert" role="alert" aria-live="polite"></div>

          <div class="ad-form">

            <div class="ad-field">
              <label class="ad-label" for="ad-name">Product Name</label>
              <input class="ad-input" type="text" id="ad-name"
                placeholder="e.g. Sumatra Dark Roast" />
            </div>

            <div class="ad-field">
              <label class="ad-label" for="ad-price">Price (IDR)</label>
              <input class="ad-input" type="number" id="ad-price"
                placeholder="e.g. 55000" min="0" />
            </div>

            <div class="ad-field">
              <label class="ad-label" for="ad-description">Description</label>
              <textarea class="ad-input ad-textarea" id="ad-description"
                placeholder="Short product description..." rows="3"></textarea>
            </div>

            <div class="ad-field">
              <label class="ad-label" for="ad-image">
                Product Image
                <span class="ad-label-hint">(JPG / PNG / WEBP, max 2MB)</span>
              </label>
              <input class="ad-input ad-input--file" type="file" id="ad-image"
                accept="image/jpeg,image/png,image/webp" />
              <div class="ad-progress-wrap" id="ad-progress-wrap" hidden>
                <div class="ad-progress-bar" id="ad-progress-bar"></div>
              </div>
              <img class="ad-image-preview" id="ad-image-preview"
                src="" alt="Preview" hidden />
            </div>

            <div class="ad-form-actions">
              <button class="ad-btn ad-btn--primary" id="ad-form-submit">
                <span id="ad-form-submit-label">Add Product</span>
                <span id="ad-form-spinner" class="ad-spinner" hidden></span>
              </button>
              <button class="ad-btn ad-btn--ghost" id="ad-form-cancel" hidden>
                Cancel Edit
              </button>
            </div>

          </div>
        </section>

        <section class="ad-panel" id="ad-table-panel">
          <div class="ad-panel__header">
            <h2 class="ad-panel__title">Product List</h2>
            <span class="ad-badge" id="ad-product-count">0 products</span>
          </div>

          <div class="ad-table-alert" id="ad-table-alert"
            role="alert" aria-live="polite"></div>

          <div class="ad-table-wrap" id="ad-table-wrap">
            <div class="ad-table-loading" id="ad-table-loading">
              <span class="ad-spinner ad-spinner--lg"></span>
            </div>
          </div>

        </section>

      </main>

    </div>
  `;

  _attachStyles();
  _attachTopbarListeners(container);
  _attachFormListeners(container);
  _loadProducts(container);
}

// --------------------------------------------------------------------------
// TOPBAR
// --------------------------------------------------------------------------

function _attachTopbarListeners(container) {
  container.querySelector("#ad-logout").addEventListener("click", async () => {
    await signOut(auth);
    renderAdminLogin(container);
  });
}

// --------------------------------------------------------------------------
// FORM LISTENERS
// --------------------------------------------------------------------------

function _attachFormListeners(container) {
  const imageInput = container.querySelector("#ad-image");
  const preview    = container.querySelector("#ad-image-preview");

  imageInput.addEventListener("change", () => {
    const file = imageInput.files[0];
    if (!file) { preview.hidden = true; return; }
    preview.src    = URL.createObjectURL(file);
    preview.hidden = false;
  });

  container.querySelector("#ad-form-submit").addEventListener("click", () => {
    if (_state.editingId) {
      _handleUpdate(container);
    } else {
      _handleAdd(container);
    }
  });

  container.querySelector("#ad-form-cancel").addEventListener("click", () => {
    _resetForm(container);
  });
}

// --------------------------------------------------------------------------
// LOAD PRODUCTS
// --------------------------------------------------------------------------

async function _loadProducts(container) {
  const wrap = container.querySelector("#ad-table-wrap");

  try {
    const q        = query(collection(db, PRODUCTS_COL), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    _state.products = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    _renderTable(container);

  } catch (err) {
    wrap.innerHTML = "";
    _showAlert(container, "#ad-table-alert",
      "Failed to load products. Check Firestore rules.", "error");
  }
}

// --------------------------------------------------------------------------
// RENDER TABLE
// --------------------------------------------------------------------------

function _renderTable(container) {
  const wrap  = container.querySelector("#ad-table-wrap");
  const count = container.querySelector("#ad-product-count");

  count.textContent = `${_state.products.length} product${_state.products.length !== 1 ? "s" : ""}`;

  if (_state.products.length === 0) {
    wrap.innerHTML = `<p class="ad-empty">No products yet. Add one above.</p>`;
    return;
  }

  wrap.innerHTML = `
    <table class="ad-table">
      <thead>
        <tr>
          <th class="ad-th">Image</th>
          <th class="ad-th">Name</th>
          <th class="ad-th">Price</th>
          <th class="ad-th">Description</th>
          <th class="ad-th ad-th--actions">Actions</th>
        </tr>
      </thead>
      <tbody id="ad-tbody">
        ${_state.products.map((p) => _rowHTML(p)).join("")}
      </tbody>
    </table>
  `;

  container.querySelector("#ad-tbody")
    .querySelectorAll("tr[data-id]")
    .forEach((row) => {
      const id = row.dataset.id;

      row.querySelector(".ad-btn--edit").addEventListener("click", () => {
        _beginEdit(container, id);
      });

      row.querySelector(".ad-btn--delete").addEventListener("click", () => {
        _handleDelete(container, id);
      });
    });
}

function _rowHTML(p) {
  const price = new Intl.NumberFormat("id-ID", {
    style: "currency", currency: "IDR", minimumFractionDigits: 0,
  }).format(p.price);

  const img = p.imageUrl
    ? `<img src="${p.imageUrl}" class="ad-thumb" alt="${p.name}" loading="lazy" />`
    : `<div class="ad-thumb ad-thumb--empty"></div>`;

  const desc = p.description
    ? p.description.length > 60
      ? p.description.slice(0, 60) + "..."
      : p.description
    : "—";

  return `
    <tr data-id="${p.id}">
      <td class="ad-td">${img}</td>
      <td class="ad-td ad-td--name">${p.name}</td>
      <td class="ad-td ad-td--price">${price}</td>
      <td class="ad-td ad-td--desc">${desc}</td>
      <td class="ad-td ad-td--actions">
        <button class="ad-btn ad-btn--edit ad-btn--sm">Edit</button>
        <button class="ad-btn ad-btn--delete ad-btn--sm">Delete</button>
      </td>
    </tr>
  `;
}

// --------------------------------------------------------------------------
// ADD PRODUCT
// --------------------------------------------------------------------------

async function _handleAdd(container) {
  const fields = _collectFields(container);
  if (!_validate(container, fields, true)) return;

  _setFormLoading(container, true);

  try {
    const imageUrl = await _uploadImage(container, fields.imageFile);

    await addDoc(collection(db, PRODUCTS_COL), {
      name:        fields.name,
      price:       fields.price,
      description: fields.description,
      imageUrl:    imageUrl,
      createdAt:   serverTimestamp(),
    });

    _showAlert(container, "#ad-form-alert", "Product added successfully.", "success");
    _resetForm(container);
    await _loadProducts(container);

  } catch (err) {
    _showAlert(container, "#ad-form-alert",
      `Failed to add product: ${err.message}`, "error");
  } finally {
    _setFormLoading(container, false);
  }
}

// --------------------------------------------------------------------------
// BEGIN EDIT (populate form)
// --------------------------------------------------------------------------

function _beginEdit(container, id) {
  const product = _state.products.find((p) => p.id === id);
  if (!product) return;

  _state.editingId = id;

  container.querySelector("#ad-name").value        = product.name;
  container.querySelector("#ad-price").value       = product.price;
  container.querySelector("#ad-description").value = product.description || "";

  const preview = container.querySelector("#ad-image-preview");
  if (product.imageUrl) {
    preview.src    = product.imageUrl;
    preview.hidden = false;
  }

  container.querySelector("#ad-form-title").textContent      = "Edit Product";
  container.querySelector("#ad-form-submit-label").textContent = "Save Changes";
  container.querySelector("#ad-form-cancel").hidden            = false;

  container.querySelector("#ad-form-panel")
    .scrollIntoView({ behavior: "smooth", block: "start" });
}

// --------------------------------------------------------------------------
// UPDATE PRODUCT
// --------------------------------------------------------------------------

async function _handleUpdate(container) {
  const fields = _collectFields(container);
  if (!_validate(container, fields, false)) return;

  _setFormLoading(container, true);

  try {
    const product  = _state.products.find((p) => p.id === _state.editingId);
    const docRef   = doc(db, PRODUCTS_COL, _state.editingId);
    const payload  = {
      name:        fields.name,
      price:       fields.price,
      description: fields.description,
    };

    if (fields.imageFile) {
      if (product.imageUrl) {
        await _deleteStorageFile(product.imageUrl);
      }
      payload.imageUrl = await _uploadImage(container, fields.imageFile);
    }

    await updateDoc(docRef, payload);

    _showAlert(container, "#ad-form-alert", "Product updated successfully.", "success");
    _resetForm(container);
    await _loadProducts(container);

  } catch (err) {
    _showAlert(container, "#ad-form-alert",
      `Failed to update product: ${err.message}`, "error");
  } finally {
    _setFormLoading(container, false);
  }
}

// --------------------------------------------------------------------------
// DELETE PRODUCT
// --------------------------------------------------------------------------

async function _handleDelete(container, id) {
  if (!confirm("Delete this product? This action cannot be undone.")) return;

  try {
    const product = _state.products.find((p) => p.id === id);

    if (product?.imageUrl) {
      await _deleteStorageFile(product.imageUrl);
    }

    await deleteDoc(doc(db, PRODUCTS_COL, id));

    _showAlert(container, "#ad-table-alert", "Product deleted.", "success");
    await _loadProducts(container);

  } catch (err) {
    _showAlert(container, "#ad-table-alert",
      `Failed to delete: ${err.message}`, "error");
  }
}

// --------------------------------------------------------------------------
// STORAGE HELPERS
// --------------------------------------------------------------------------

async function _uploadImage(container, file) {
  return new Promise((resolve, reject) => {
    const fileName  = `${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
    const storageRef = ref(storage, `${STORAGE_PATH}/${fileName}`);
    const task      = uploadBytesResumable(storageRef, file);

    const progressWrap = container.querySelector("#ad-progress-wrap");
    const progressBar  = container.querySelector("#ad-progress-bar");
    progressWrap.hidden = false;

    task.on(
      "state_changed",
      (snap) => {
        const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
        progressBar.style.width = `${pct}%`;
      },
      (err) => {
        progressWrap.hidden = true;
        reject(err);
      },
      async () => {
        progressWrap.hidden    = true;
        progressBar.style.width = "0%";
        const url = await getDownloadURL(task.snapshot.ref);
        resolve(url);
      }
    );
  });
}

async function _deleteStorageFile(imageUrl) {
  try {
    const fileRef = ref(storage, imageUrl);
    await deleteObject(fileRef);
  } catch (_) {
    // Non-fatal: file may already be deleted or URL may be external
  }
}

// --------------------------------------------------------------------------
// FORM UTILITIES
// --------------------------------------------------------------------------

function _collectFields(container) {
  return {
    name:        container.querySelector("#ad-name").value.trim(),
    price:       parseFloat(container.querySelector("#ad-price").value),
    description: container.querySelector("#ad-description").value.trim(),
    imageFile:   container.querySelector("#ad-image").files[0] || null,
  };
}

function _validate(container, fields, requireImage) {
  if (!fields.name) {
    _showAlert(container, "#ad-form-alert", "Product name is required.", "error");
    return false;
  }
  if (isNaN(fields.price) || fields.price < 0) {
    _showAlert(container, "#ad-form-alert", "Enter a valid price.", "error");
    return false;
  }
  if (requireImage && !fields.imageFile) {
    _showAlert(container, "#ad-form-alert", "Please select a product image.", "error");
    return false;
  }
  return true;
}

function _resetForm(container) {
  _state.editingId = null;

  container.querySelector("#ad-name").value        = "";
  container.querySelector("#ad-price").value       = "";
  container.querySelector("#ad-description").value = "";
  container.querySelector("#ad-image").value        = "";

  const preview = container.querySelector("#ad-image-preview");
  preview.src    = "";
  preview.hidden = true;

  container.querySelector("#ad-form-title").textContent       = "Add New Product";
  container.querySelector("#ad-form-submit-label").textContent = "Add Product";
  container.querySelector("#ad-form-cancel").hidden            = true;

  _showAlert(container, "#ad-form-alert", "", "");
}

function _setFormLoading(container, state) {
  const btn     = container.querySelector("#ad-form-submit");
  const label   = container.querySelector("#ad-form-submit-label");
  const spinner = container.querySelector("#ad-form-spinner");

  btn.disabled   = state;
  label.hidden   = state;
  spinner.hidden = !state;
}

function _showAlert(container, selector, message, type) {
  const el      = container.querySelector(selector);
  el.textContent = message;
  el.className   = `ad-alert${type ? ` ad-alert--${type}` : ""}`;
  el.hidden      = !message;
}

// --------------------------------------------------------------------------
// SCOPED STYLES
// --------------------------------------------------------------------------

function _attachStyles() {
  if (document.getElementById("ad-styles")) return;

  const style      = document.createElement("style");
  style.id         = "ad-styles";
  style.textContent = `
    .ad-layout {
      min-height: 100vh;
      background-color: #161616;
      color: #F2F1ED;
      font-family: "DM Sans", system-ui, sans-serif;
      display: flex;
      flex-direction: column;
    }

    .ad-topbar {
      position: sticky;
      top: 0;
      z-index: 50;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.9rem 2rem;
      background-color: rgba(22, 22, 22, 0.9);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(242, 241, 237, 0.07);
      gap: 1rem;
    }

    .ad-topbar__brand {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }

    .ad-topbar__title {
      font-family: "Playfair Display", Georgia, serif;
      font-size: 1rem;
      font-weight: 700;
      color: #F2F1ED;
      letter-spacing: -0.01em;
    }

    .ad-topbar__meta {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .ad-topbar__user {
      font-size: 0.78rem;
      color: rgba(242, 241, 237, 0.4);
    }

    .ad-main {
      display: grid;
      grid-template-columns: 380px 1fr;
      gap: 1.5rem;
      padding: 2rem;
      align-items: start;
      max-width: 1280px;
      width: 100%;
      margin-inline: auto;
    }

    .ad-panel {
      background-color: #1e1e1e;
      border: 1px solid rgba(242, 241, 237, 0.07);
      border-radius: 0.75rem;
      padding: 1.75rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .ad-panel__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    .ad-panel__title {
      font-family: "Playfair Display", Georgia, serif;
      font-size: 1.15rem;
      font-weight: 700;
      color: #F2F1ED;
      letter-spacing: -0.01em;
    }

    .ad-badge {
      font-size: 0.7rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #838F6F;
      background-color: rgba(131, 143, 111, 0.1);
      padding: 0.2rem 0.65rem;
      border-radius: 9999px;
      border: 1px solid rgba(131, 143, 111, 0.2);
    }

    .ad-alert {
      font-size: 0.8rem;
      padding: 0.65rem 0.9rem;
      border-radius: 0.375rem;
      display: none;
    }

    .ad-alert:not(:empty) { display: block; }

    .ad-alert--error {
      background-color: rgba(113, 0, 20, 0.2);
      border: 1px solid rgba(113, 0, 20, 0.5);
      color: #f87171;
    }

    .ad-alert--success {
      background-color: rgba(131, 143, 111, 0.12);
      border: 1px solid rgba(131, 143, 111, 0.35);
      color: #a8b293;
    }

    .ad-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .ad-field {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .ad-label {
      font-size: 0.7rem;
      font-weight: 600;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #838F6F;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .ad-label-hint {
      font-size: 0.65rem;
      font-weight: 400;
      letter-spacing: 0.02em;
      text-transform: none;
      color: rgba(242, 241, 237, 0.25);
    }

    .ad-input {
      width: 100%;
      background-color: #111111;
      border: 1.5px solid rgba(242, 241, 237, 0.08);
      border-radius: 0.5rem;
      padding: 0.65rem 0.85rem;
      font-size: 0.875rem;
      font-family: "DM Sans", system-ui, sans-serif;
      color: #F2F1ED;
      outline: none;
      transition: border-color 0.2s ease;
    }

    .ad-input::placeholder { color: rgba(242, 241, 237, 0.2); }
    .ad-input:focus         { border-color: #710014; }

    .ad-textarea {
      resize: vertical;
      min-height: 80px;
      line-height: 1.6;
    }

    .ad-input--file {
      padding: 0.5rem 0.85rem;
      cursor: pointer;
      font-size: 0.8rem;
      color: rgba(242, 241, 237, 0.5);
    }

    .ad-input--file::-webkit-file-upload-button {
      background-color: #710014;
      color: #F2F1ED;
      border: none;
      border-radius: 0.375rem;
      padding: 0.3rem 0.75rem;
      font-size: 0.75rem;
      font-family: "DM Sans", system-ui, sans-serif;
      cursor: pointer;
      margin-right: 0.75rem;
    }

    .ad-progress-wrap {
      height: 3px;
      background-color: rgba(242, 241, 237, 0.07);
      border-radius: 9999px;
      overflow: hidden;
      margin-top: 0.35rem;
    }

    .ad-progress-bar {
      height: 100%;
      width: 0%;
      background-color: #710014;
      transition: width 0.2s ease;
    }

    .ad-image-preview {
      width: 100%;
      max-height: 160px;
      object-fit: cover;
      border-radius: 0.5rem;
      border: 1px solid rgba(242, 241, 237, 0.07);
      margin-top: 0.35rem;
    }

    .ad-form-actions {
      display: flex;
      gap: 0.75rem;
      padding-top: 0.25rem;
    }

    .ad-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      font-family: "DM Sans", system-ui, sans-serif;
      font-size: 0.8rem;
      font-weight: 600;
      letter-spacing: 0.03em;
      border: none;
      border-radius: 0.375rem;
      cursor: pointer;
      transition: background-color 0.2s ease, opacity 0.2s ease, transform 0.15s ease;
      padding: 0.6rem 1.1rem;
    }

    .ad-btn:active { transform: scale(0.97); }
    .ad-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

    .ad-btn--primary {
      background-color: #710014;
      color: #F2F1ED;
      flex: 1;
    }

    .ad-btn--primary:hover:not(:disabled) { background-color: #8f001a; }

    .ad-btn--ghost {
      background-color: rgba(242, 241, 237, 0.06);
      color: rgba(242, 241, 237, 0.6);
      border: 1px solid rgba(242, 241, 237, 0.08);
    }

    .ad-btn--ghost:hover:not(:disabled) {
      background-color: rgba(242, 241, 237, 0.1);
      color: #F2F1ED;
    }

    .ad-btn--edit {
      background-color: rgba(131, 143, 111, 0.15);
      color: #a8b293;
      border: 1px solid rgba(131, 143, 111, 0.2);
    }

    .ad-btn--edit:hover { background-color: rgba(131, 143, 111, 0.25); }

    .ad-btn--delete {
      background-color: rgba(113, 0, 20, 0.15);
      color: #f87171;
      border: 1px solid rgba(113, 0, 20, 0.25);
    }

    .ad-btn--delete:hover { background-color: rgba(113, 0, 20, 0.28); }

    .ad-btn--sm { padding: 0.35rem 0.75rem; font-size: 0.75rem; }

    .ad-table-loading {
      display: flex;
      justify-content: center;
      padding: 3rem;
    }

    .ad-table-wrap {
      overflow-x: auto;
    }

    .ad-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
    }

    .ad-th {
      text-align: left;
      font-size: 0.68rem;
      font-weight: 600;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #838F6F;
      padding: 0.6rem 0.85rem;
      border-bottom: 1px solid rgba(242, 241, 237, 0.07);
      white-space: nowrap;
    }

    .ad-td {
      padding: 0.85rem;
      border-bottom: 1px solid rgba(242, 241, 237, 0.04);
      color: rgba(242, 241, 237, 0.8);
      vertical-align: middle;
    }

    .ad-td--name  { font-weight: 600; color: #F2F1ED; min-width: 140px; }
    .ad-td--price { color: #710014; font-weight: 700; white-space: nowrap; }
    .ad-td--desc  { color: rgba(242, 241, 237, 0.45); font-size: 0.78rem; }

    .ad-td--actions {
      white-space: nowrap;
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    .ad-thumb {
      width: 52px;
      height: 52px;
      object-fit: cover;
      border-radius: 0.375rem;
      border: 1px solid rgba(242, 241, 237, 0.07);
    }

    .ad-thumb--empty {
      background-color: rgba(242, 241, 237, 0.04);
    }

    .ad-empty {
      text-align: center;
      color: rgba(242, 241, 237, 0.25);
      font-size: 0.85rem;
      padding: 3rem 1rem;
    }

    .ad-spinner {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid rgba(242, 241, 237, 0.2);
      border-top-color: #F2F1ED;
      border-radius: 50%;
      animation: ad-spin 0.7s linear infinite;
    }

    .ad-spinner--lg {
      width: 28px;
      height: 28px;
      border-width: 3px;
    }

    @keyframes ad-spin {
      to { transform: rotate(360deg); }
    }

    @media (max-width: 900px) {
      .ad-main {
        grid-template-columns: 1fr;
        padding: 1rem;
      }

      .ad-topbar {
        padding: 0.9rem 1rem;
      }

      .ad-topbar__user {
        display: none;
      }
    }
  `;

  document.head.appendChild(style);
}