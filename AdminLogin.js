// AdminLogin.js
import { auth, db }          from "./firebaseConfig.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc }       from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { renderAdminDashboard } from "./AdminDashboard.js";

// --------------------------------------------------------------------------
// CONSTANTS
// --------------------------------------------------------------------------

const ADMIN_EMAIL_DOMAIN = "@yourdomain.com"; // Adjust to match your admin email domain

// --------------------------------------------------------------------------
// RENDERER
// --------------------------------------------------------------------------

export function renderAdminLogin(container) {
  container.innerHTML = `
    <div class="al-wrapper">

      <div class="al-card">

        <div class="al-header">
          <div class="al-logo">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none"
              xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="15" stroke="#F2F1ED" stroke-width="1.5"/>
              <circle cx="16" cy="16" r="9"  stroke="#F2F1ED" stroke-width="1.5"/>
              <circle cx="16" cy="16" r="2.5" fill="#710014"/>
            </svg>
            <span class="al-logo-text">Darkgroove</span>
          </div>
          <h1 class="al-title">Admin Panel</h1>
          <p class="al-subtitle">Restricted access. Authorized personnel only.</p>
        </div>

        <div class="al-alert" id="al-alert" role="alert" aria-live="polite"></div>

        <div class="al-form">

          <div class="al-field">
            <label class="al-label" for="al-clientkey">Client Key</label>
            <input
              class="al-input"
              type="password"
              id="al-clientkey"
              placeholder="Enter your client key"
              autocomplete="off"
              spellcheck="false"
            />
          </div>

          <div class="al-field">
            <label class="al-label" for="al-username">Username</label>
            <input
              class="al-input"
              type="text"
              id="al-username"
              placeholder="Enter username"
              autocomplete="username"
              spellcheck="false"
            />
          </div>

          <div class="al-field">
            <label class="al-label" for="al-password">Password</label>
            <div class="al-input-wrapper">
              <input
                class="al-input"
                type="password"
                id="al-password"
                placeholder="Enter password"
                autocomplete="current-password"
              />
              <button
                class="al-toggle-pw"
                type="button"
                id="al-toggle-pw"
                aria-label="Toggle password visibility"
              >
                <svg id="al-eye-icon" width="16" height="16" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </button>
            </div>
          </div>

          <button class="al-submit" type="button" id="al-submit">
            <span id="al-submit-label">Sign In</span>
            <span id="al-submit-spinner" class="al-spinner" hidden></span>
          </button>

        </div>

      </div>

    </div>
  `;

  _attachStyles();
  _attachListeners(container);
}

// --------------------------------------------------------------------------
// LISTENERS
// --------------------------------------------------------------------------

function _attachListeners(container) {
  const submitBtn  = container.querySelector("#al-submit");
  const toggleBtn  = container.querySelector("#al-toggle-pw");
  const passwordEl = container.querySelector("#al-password");

  toggleBtn.addEventListener("click", () => {
    const isHidden = passwordEl.type === "password";
    passwordEl.type = isHidden ? "text" : "password";
    toggleBtn.setAttribute("aria-label",
      isHidden ? "Hide password" : "Show password"
    );
  });

  submitBtn.addEventListener("click", () => _handleLogin(container));

  [
    container.querySelector("#al-clientkey"),
    container.querySelector("#al-username"),
    passwordEl,
  ].forEach((input) => {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") _handleLogin(container);
    });
  });
}

// --------------------------------------------------------------------------
// AUTH HANDLER
// --------------------------------------------------------------------------

async function _handleLogin(container) {
  const clientKeyEl = container.querySelector("#al-clientkey");
  const usernameEl  = container.querySelector("#al-username");
  const passwordEl  = container.querySelector("#al-password");

  const clientKey = clientKeyEl.value.trim();
  const username  = usernameEl.value.trim();
  const password  = passwordEl.value;

  if (!clientKey || !username || !password) {
    _showAlert(container, "All fields are required.", "error");
    return;
  }

  _setLoading(container, true);
  _showAlert(container, "", "");

  try {
    // Step 1: Sign in via Firebase Auth using constructed email
    const email      = `${username}${ADMIN_EMAIL_DOMAIN}`;
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const uid        = credential.user.uid;

    // Step 2: Verify clientKey against Firestore admins collection
    const adminDoc = await getDoc(doc(db, "admins", uid));

    if (!adminDoc.exists()) {
      await auth.signOut();
      throw new Error("Admin record not found.");
    }

    const storedKey = adminDoc.data().clientKey;
    const storedUsername = adminDoc.data().username;

    if (storedKey !== clientKey || storedUsername !== username) {
      await auth.signOut();
      throw new Error("Invalid credentials.");
    }

    // Step 3: Auth success — hand off to dashboard
    renderAdminDashboard(container, credential.user);

  } catch (err) {
    _setLoading(container, false);
    _showAlert(container, _parseError(err.code || err.message), "error");
  }
}

// --------------------------------------------------------------------------
// HELPERS
// --------------------------------------------------------------------------

function _setLoading(container, state) {
  const btn     = container.querySelector("#al-submit");
  const label   = container.querySelector("#al-submit-label");
  const spinner = container.querySelector("#al-submit-spinner");

  btn.disabled       = state;
  label.hidden       = state;
  spinner.hidden     = !state;
}

function _showAlert(container, message, type) {
  const alertEl = container.querySelector("#al-alert");
  alertEl.textContent  = message;
  alertEl.className    = `al-alert${type ? ` al-alert--${type}` : ""}`;
  alertEl.hidden       = !message;
}

function _parseError(code) {
  const map = {
    "auth/invalid-email":        "Invalid email format.",
    "auth/user-not-found":       "No account found with these credentials.",
    "auth/wrong-password":       "Incorrect password.",
    "auth/too-many-requests":    "Too many attempts. Please try again later.",
    "auth/network-request-failed": "Network error. Check your connection.",
    "Invalid credentials.":      "Invalid credentials.",
    "Admin record not found.":   "Admin record not found.",
  };
  return map[code] || "Authentication failed. Please try again.";
}

// --------------------------------------------------------------------------
// SCOPED STYLES
// --------------------------------------------------------------------------

function _attachStyles() {
  if (document.getElementById("al-styles")) return;

  const style = document.createElement("style");
  style.id    = "al-styles";
  style.textContent = `
    .al-wrapper {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #161616;
      padding: 1.5rem;
    }

    .al-card {
      width: 100%;
      max-width: 420px;
      background-color: #1e1e1e;
      border: 1px solid rgba(242, 241, 237, 0.07);
      border-radius: 1rem;
      padding: 2.5rem 2rem;
      display: flex;
      flex-direction: column;
      gap: 1.75rem;
    }

    .al-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      text-align: center;
    }

    .al-logo {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }

    .al-logo-text {
      font-family: "Playfair Display", Georgia, serif;
      font-size: 1.1rem;
      font-weight: 700;
      color: #F2F1ED;
      letter-spacing: -0.01em;
    }

    .al-title {
      font-family: "Playfair Display", Georgia, serif;
      font-size: 1.5rem;
      font-weight: 700;
      color: #F2F1ED;
      letter-spacing: -0.02em;
    }

    .al-subtitle {
      font-size: 0.78rem;
      color: rgba(242, 241, 237, 0.35);
      letter-spacing: 0.03em;
    }

    .al-alert {
      font-size: 0.8rem;
      padding: 0.65rem 0.9rem;
      border-radius: 0.375rem;
      display: none;
    }

    .al-alert:not(:empty) {
      display: block;
    }

    .al-alert--error {
      background-color: rgba(113, 0, 20, 0.2);
      border: 1px solid rgba(113, 0, 20, 0.5);
      color: #f87171;
    }

    .al-alert--success {
      background-color: rgba(131, 143, 111, 0.15);
      border: 1px solid rgba(131, 143, 111, 0.4);
      color: #a8b293;
    }

    .al-form {
      display: flex;
      flex-direction: column;
      gap: 1.1rem;
    }

    .al-field {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .al-label {
      font-size: 0.7rem;
      font-weight: 600;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #838F6F;
    }

    .al-input-wrapper {
      position: relative;
    }

    .al-input-wrapper .al-input {
      padding-right: 2.75rem;
    }

    .al-input {
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

    .al-input::placeholder {
      color: rgba(242, 241, 237, 0.2);
    }

    .al-input:focus {
      border-color: #710014;
    }

    .al-toggle-pw {
      position: absolute;
      right: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: rgba(242, 241, 237, 0.3);
      cursor: pointer;
      padding: 0;
      display: flex;
      align-items: center;
      transition: color 0.2s ease;
    }

    .al-toggle-pw:hover {
      color: rgba(242, 241, 237, 0.7);
    }

    .al-submit {
      margin-top: 0.5rem;
      width: 100%;
      padding: 0.8rem;
      background-color: #710014;
      color: #F2F1ED;
      font-size: 0.875rem;
      font-weight: 600;
      letter-spacing: 0.05em;
      border: none;
      border-radius: 0.5rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      transition: background-color 0.2s ease, transform 0.15s ease;
    }

    .al-submit:hover:not(:disabled) {
      background-color: #8f001a;
    }

    .al-submit:active:not(:disabled) {
      transform: scale(0.98);
    }

    .al-submit:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .al-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(242, 241, 237, 0.25);
      border-top-color: #F2F1ED;
      border-radius: 50%;
      animation: al-spin 0.7s linear infinite;
    }

    @keyframes al-spin {
      to { transform: rotate(360deg); }
    }
  `;

  document.head.appendChild(style);
}