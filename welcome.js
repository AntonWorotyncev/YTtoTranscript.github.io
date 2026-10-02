import {
  WELCOME_LANGUAGE_LABELS,
  WELCOME_LOCALES,
  WELCOME_MESSAGES,
} from "./welcomeMessages.js";

const UI_LOCALE_KEY = "yt_ai_summary_ui_locale_v1";
const THEME_KEY = "yt_ai_summary_theme_v1";

let currentLocale = "en";

async function getStoredValue(key) {
  if (globalThis.chrome?.storage?.local) {
    const stored = await chrome.storage.local.get(key);
    return stored[key];
  }
  return localStorage.getItem(key);
}

async function setStoredValue(key, value) {
  if (globalThis.chrome?.storage?.local) {
    await chrome.storage.local.set({ [key]: value });
    return;
  }
  localStorage.setItem(key, value);
}

function normalizeLocale(value) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const lower = value.toLowerCase();
  if (WELCOME_LOCALES.includes(lower)) {
    return lower;
  }

  const short = lower.split("-")[0];
  if (WELCOME_LOCALES.includes(short)) {
    return short;
  }

  if (lower.startsWith("uk")) {
    return "uk";
  }

  return null;
}

async function resolveLocale() {
  try {
    const fromStorage = normalizeLocale(await getStoredValue(UI_LOCALE_KEY));
    if (fromStorage) {
      return fromStorage;
    }
  } catch {
    // ignore storage read errors
  }

  return "en";
}

async function getStoredTheme() {
  try {
    return await getStoredValue(THEME_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

async function setStoredTheme(theme) {
  try {
    await setStoredValue(THEME_KEY, theme);
  } catch {
    // ignore storage write errors
  }
}

function translate(locale, key) {
  const messages = WELCOME_MESSAGES[locale] || WELCOME_MESSAGES.en;
  return messages[key] || WELCOME_MESSAGES.en[key] || key;
}

function updateThemeToggleButton(theme) {
  const button = document.querySelector("#welcome_theme_toggle");
  if (!button) {
    return;
  }

  const isDark = theme === "dark";
  const ariaKey = isDark ? "themeDayAria" : "themeNightAria";
  const titleKey = isDark ? "themeDay" : "themeNight";

  button.setAttribute("aria-label", translate(currentLocale, ariaKey));
  button.setAttribute("title", translate(currentLocale, titleKey));
  button.dataset.i18nAria = ariaKey;
}

function applyTheme(theme) {
  const root = document.documentElement;
  root.classList.toggle("welcome-theme-dark", theme === "dark");
  root.classList.toggle("welcome-theme-light", theme === "light");
  updateThemeToggleButton(theme);
}

function applyI18n(locale) {
  currentLocale = locale;
  document.documentElement.lang = locale;
  document.title = translate(locale, "pageTitle");

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = translate(locale, element.dataset.i18n);
  });

  document.querySelectorAll("[data-i18n-alt]").forEach((element) => {
    element.setAttribute("alt", translate(locale, element.dataset.i18nAlt));
  });

  document.querySelectorAll("[data-i18n-aria]").forEach((element) => {
    element.setAttribute("aria-label", translate(locale, element.dataset.i18nAria));
  });

  const theme = document.documentElement.classList.contains("welcome-theme-dark") ? "dark" : "light";
  updateThemeToggleButton(theme);
}

function setupLanguageSwitcher(initialLocale) {
  const select = document.querySelector("#welcome_language_select");
  if (!select) {
    return;
  }

  select.replaceChildren();
  WELCOME_LOCALES.forEach((code) => {
    const option = document.createElement("option");
    option.value = code;
    option.textContent = WELCOME_LANGUAGE_LABELS[code] || code;
    option.selected = code === initialLocale;
    select.appendChild(option);
  });

  select.addEventListener("change", async () => {
    const nextLocale = normalizeLocale(select.value) || "en";
    applyI18n(nextLocale);

    try {
      await setStoredValue(UI_LOCALE_KEY, nextLocale);
    } catch {
      // ignore storage write errors
    }
  });
}

function setupThemeToggle(initialTheme) {
  const button = document.querySelector("#welcome_theme_toggle");
  if (!button || button.dataset.themeReady) {
    return;
  }

  button.dataset.themeReady = "1";
  applyTheme(initialTheme);

  button.addEventListener("click", async () => {
    const nextTheme = document.documentElement.classList.contains("welcome-theme-dark")
      ? "light"
      : "dark";
    await setStoredTheme(nextTheme);
    applyTheme(nextTheme);
  });
}

async function initWelcomePage() {
  const [locale, theme] = await Promise.all([resolveLocale(), getStoredTheme()]);
  applyI18n(locale);
  setupLanguageSwitcher(locale);
  setupThemeToggle(theme);
}

void initWelcomePage();
