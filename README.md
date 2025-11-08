# Bulk URL Opener
> ⚠️ **Note:** This Chrome Extension is currently under review

<p align="center">
  <img src="images/icon.png" alt="Bulk URL Opener Icon" width="120" />
</p>

A **Google Chrome Extension** that opens every valid URL in the clipboard-sized list you paste. It is a focused companion for QA engineers, SEOs, and researchers who need to launch many pages in one shot without spreadsheets or scripts.

---

## 📌 What it does

Paste URLs separated by newlines or commas and click one button—the extension validates each entry, normalizes missing schemes, and creates background tabs sequentially. The popup mirrors the browser language (English or Japanese) and shows a live counter so you always know how many URLs are about to open.

---

## ✨ Key Features

- Accepts multiline or comma-separated input and ignores blank lines automatically
- HTTP/HTTPS-only validation prevents `javascript:` and other unsafe schemes from opening
- Live URL counter next to the label counts only entries that parse as real links
- Auto-adds `https://` when you omit a scheme, plus inline error feedback when parsing fails
- Sequential tab creation smooths out spikes—recommended batch size (30) is shown as a hint
- Works fully client-side with the minimal `tabs` permission; no analytics or network calls

---

## 🖼️ Example

<p align="center">
  <img src="images/bulk.png" alt="Bulk URL Opener popup screenshot" width="520" />
</p>

The popup keeps the UI lightweight: status messages, the live counter, and the recommended batch hint appear only when needed.

---

## 🚀 How to Use

1. Enable **Developer mode** in `chrome://extensions`.
2. Click **Load unpacked** and select the `extension-bulk-url-opener` folder.
3. Pin the extension icon (optional) and click it from the toolbar.
4. Paste URLs separated by line breaks or commas.
5. Press **Open URLs**. Tabs open sequentially in the background to avoid sudden bursts.

Tip: keeping batches near 30 URLs helps prevent rate limits from the destination sites.

---

## ⚠️ Limitations

- Works only inside Chrome; no background scheduling or tab deduplication.
- If you exceed site-specific rate limits, the extension cannot detect or mitigate the failures.
- IME conversion and multiline rich text paste behaviors depend on the host OS/Chrome channel.

---

## 📚 References

- `docs/design.md` – product background and UX decisions (Japanese).
- `docs/TESTING.md` – edge cases and manual verification steps (Japanese).
