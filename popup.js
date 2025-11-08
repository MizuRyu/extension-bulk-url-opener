(() => {
  'use strict';

  // UI要素の取得
  const form = document.getElementById('url-form');
  const textarea = document.getElementById('url-input');
  const statusEl = document.getElementById('status');
  const clearBtn = document.getElementById('clear');
  const submitBtn = form.querySelector('button.primary');
  const countEl = document.getElementById('url-count');

  const RECOMMENDED_BATCH_LIMIT = 30; // UI hints only; no hard blocking

  const DEFAULT_LANG = 'en';
  const TEXT_BUNDLE = {
    ja: {
      appTitle: 'Bulk URL Opener',
      inputLabel: '開きたいURL',
      urlPlaceholder: '改行やカンマ(,)区切りで入力',
      inputHint: 'http/httpsのみを対象とし、一度の実行は最大{{limit}}件までを推奨します。',
      submitButton: 'まとめて開く',
      clearButton: 'クリア',
      statusInvalid: 'URLを正しく入力してください。',
      statusOpening: 'タブを開いています…',
      statusOpened: '{{count}}件のタブを開きました。',
      statusCreateFailed: 'タブの作成に失敗しました。権限とURLを確認してください。',
      urlCount: '{{count}}件',
    },
    en: {
      appTitle: 'Bulk URL Opener',
      inputLabel: 'URLs to open',
      urlPlaceholder: 'Enter one URL per line or separate with commas',
      inputHint: 'Only http/https URLs are opened; we recommend batching no more than {{limit}} at a time.',
      submitButton: 'Open URLs',
      clearButton: 'Clear',
      statusInvalid: 'Please enter at least one valid URL.',
      statusOpening: 'Opening tabs…',
      statusOpened: 'Opened {{count}} tabs.',
      statusCreateFailed: 'Could not create tabs. Check permissions and URL formats.',
      urlCount: '{{count}} URLs',
    },
  };

  function normalizeLocale(code) {
    return typeof code === 'string' ? code.toLowerCase() : '';
  }

  function resolveLang() {
    const supported = Object.keys(TEXT_BUNDLE);
    const navigatorRef = typeof navigator !== 'undefined' ? navigator : null;
    const candidates = [];

    if (navigatorRef) {
      if (Array.isArray(navigatorRef.languages)) {
        candidates.push(...navigatorRef.languages);
      }
      if (navigatorRef.language) {
        candidates.push(navigatorRef.language);
      }
    }

    for (const locale of candidates) {
      const normalized = normalizeLocale(locale);
      if (!normalized) continue;
      const exact = supported.find((lang) => normalized === lang || normalized.startsWith(`${lang}-`));
      if (exact) return exact;
    }

    return DEFAULT_LANG;
  }

  const activeLang = resolveLang();
  document.documentElement.lang = activeLang;

  function translate(key, replacements) {
    const template = (TEXT_BUNDLE[activeLang] && TEXT_BUNDLE[activeLang][key]) ||
      (TEXT_BUNDLE[DEFAULT_LANG] && TEXT_BUNDLE[DEFAULT_LANG][key]) ||
      '';
    if (!template) return '';
    if (!replacements) return template;
    return template.replace(/{{(\w+)}}/g, (_, token) => (
      token in replacements ? String(replacements[token]) : ''
    ));
  }

  const staticReplacementGetters = {
    inputHint: () => ({ limit: RECOMMENDED_BATCH_LIMIT }),
  };

  function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.dataset.i18n;
      if (!key) return;
      const attr = el.dataset.i18nAttr;
      const replacementsFn = staticReplacementGetters[key];
      const translated = translate(key, replacementsFn ? replacementsFn() : undefined);
      if (!translated) return;
      if (attr) {
        el.setAttribute(attr, translated);
      } else {
        el.textContent = translated;
      }
    });
  }

  applyTranslations();
  updateUrlCount();

  function setStatus(message, kind) {
    statusEl.textContent = message;
    statusEl.classList.remove('ok', 'error');
    if (kind) statusEl.classList.add(kind);
  }

  function updateUrlCount() {
    if (!countEl) return;
    const count = extractUrls(textarea.value).length;
    if (!count) {
      countEl.textContent = '';
      countEl.hidden = true;
      return;
    }
    countEl.hidden = false;
    countEl.textContent = translate('urlCount', { count });
  }

  const HTTP_SCHEME_RE = /^[a-zA-Z][\w+.-]*:/;
  const URL_PATTERN = /^(?:(?:https?):\/\/)?(?:[\w-]+\.)+[a-zA-Z]{2,}(?::\d+)?(?:[/?#][^\s]*)?$/i;
  const IP_URL_PATTERN = /^(?:(?:https?):\/\/)?(?:\d{1,3}\.){3}\d{1,3}(?::\d+)?(?:[/?#][^\s]*)?$/;

  function isLikelyHttpUrl(value) {
    const target = value.trim();
    if (!target) return false;
    return URL_PATTERN.test(target) || IP_URL_PATTERN.test(target);
  }

  function normalizeEntry(entry) {
    const trimmed = entry.trim();
    if (!trimmed) return null;
    if (!isLikelyHttpUrl(trimmed)) return null;
    const hasScheme = HTTP_SCHEME_RE.test(trimmed);
    const candidate = hasScheme ? trimmed : `https://${trimmed}`;
    try {
      const url = new URL(candidate);
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        return url.href;
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  function extractUrls(raw) {
    return raw
      .split(/[\n,]+/)
      .map(normalizeEntry)
      .filter((v) => !!v);
  }

  function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    textarea.disabled = isLoading;
    clearBtn.disabled = isLoading;
  }

  async function createTab(url) {
    return new Promise((resolve, reject) => {
      if (!chrome.tabs || !chrome.tabs.create) {
        reject(new Error(translate('statusCreateFailed') || 'Could not create tabs.'));
        return;
      }
      chrome.tabs.create({ url, active: false }, (tab) => {
        const err = chrome.runtime.lastError;
        if (err) {
          reject(err);
        } else {
          resolve(tab);
        }
      });
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const input = textarea.value;
    const urls = extractUrls(input);

    if (urls.length === 0) {
      setStatus(translate('statusInvalid'), 'error');
      return;
    }
    setLoading(true);
    setStatus(translate('statusOpening'), '');
    try {
      for (const url of urls) {
        // 逐次的に開くことでブラウザへの負荷を抑える
        await createTab(url);
      }
      setStatus(translate('statusOpened', { count: urls.length }), 'ok');
    } catch (error) {
      console.error(error);
      setStatus(translate('statusCreateFailed'), 'error');
    } finally {
      setLoading(false);
    }
  }

  clearBtn.addEventListener('click', () => {
    textarea.value = '';
    setStatus('', '');
    textarea.focus();
    updateUrlCount();
  });

  textarea.addEventListener('input', () => {
    updateUrlCount();
  });

  form.addEventListener('submit', handleSubmit);
})();
