# 🤖 Easy AI

> ذكاء اصطناعي سهل للجميع | AI made easy for everyone

A modern, bilingual (Arabic/English) AI assistant web application with a beautiful dark theme —
plus a **secure sync channel** that mirrors a scoped Google Drive folder into this repo and
publishes it to the world through GitHub Pages.

![Easy AI](https://img.shields.io/badge/version-1.1.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Arabic](https://img.shields.io/badge/language-العربية-green)
![English](https://img.shields.io/badge/language-English-blue)

## ✨ Features

- 🤖 **AI Chat (demo)** - Interactive bilingual chat, clearly labelled as a local
  demo: canned responses, no provider, nothing leaves the browser
- 🌐 **Bilingual** - Full Arabic (RTL) and English (LTR) support
- 🌙 **Dark Theme** - Beautiful modern dark design with animations
- 📱 **Responsive** - Works on all devices
- ⚡ **Fast** - Pure HTML/CSS/JS, no frameworks
- 🎨 **Modern UI** - Glassmorphism, gradients, and smooth animations
- 💾 **Conversation persistence** - The chat survives a reload (100 messages /
  20,000 characters per message), and degrades honestly when storage is blocked
- 🔄 **Secure Sync Channel** - Hourly, sanitized Google Drive → repo → public dashboard

## 🔄 قناة المزامنة الآمنة · Secure Sync Channel

قناة مؤتمتة تنقل البيانات من **Google Drive** إلى **المستودع** ثم إلى **العالم الخارجي**
عبر لوحة عامة — بتنقيح كامل للأسرار قبل أي نشر.

```
Google Drive ──TLS/OAuth2──▶ GitHub Actions (كل ساعة)
     │
     ├─ 1) جلب   : تعداد المجلد + محتوى الملفات النصية (≤ 512KB) — قراءة فقط
     ├─ 2) تنقيح : المُحمِّر يحذف الأسرار/البريد/الهواتف/البطاقات تلقائيًا
     ├─ 3) خزنة  : لقطة خام مشفرة AES-256-GCM في vault/ (لا تُلتزم أبدًا)
     ├─ 4) تخزين : data/files.json + data/manifest.json (بصمات SHA-256)
     ├─ 5) بوابة : فحص أمني أخير — أي اشتباه = حجز المحتوى وعدم نشره
     └─ 6) نشر   : commit بأقل صلاحية + نشر على Pages (الدردشة في / واللوحة في /sync/)
```

- **اللوحة العامة**: `https://sayedelazameydesign-crypto.github.io/easy-ai/sync/`
- **الواجهة العامة JSON**: [`data/files.json`](data/files.json) ·
  [`data/manifest.json`](data/manifest.json) · [`data/latest.md`](data/latest.md)
- **الحالات الصادقة**: `ok` / `not_configured` (أسماء النواقص فقط — لا قيم) /
  `error` (أكواد HTTP بلا أجسام) / `blocked_scan` (حجر المحتوى).
  اللوحة لا تُظهر «متزامن» إلا إذا قال الـmanifest ذلك — بلا حالات مُختلَقة.
- **لا قطع أثرية متناقضة**: `data/latest.md` يُعاد كتابته في كل تشغيل ليطابق حالة
  الـmanifest الحالية — حتى حين لا يُجلب شيء. كتالوج `data/files.json` السابق يبقى
  محفوظًا بايت‑ببايت، ويُسجَّل في الـmanifest بـ`"written": false` مع بصمته ورقم
  التشغيل الذي كتبه، فتظهر القائمة في اللوحة موسومة «محفوظ من تشغيل سابق».
  البيانات الأولية المرفقة مع المستودع تُعرض كـ`seeded` لا كـ`ok`.
- **التفعيل**: أضف الثلاثي `GOOGLE_DRIVE_REFRESH_TOKEN` + `GOOGLE_DRIVE_CLIENT_ID` +
  `GOOGLE_DRIVE_CLIENT_SECRET` في GitHub Secrets — الخطوات الكاملة في
  [docs/SETUP.md](docs/SETUP.md)، ونموذج التهديد في [SECURITY.md](SECURITY.md).
- نطاق المزامنة الافتراضي: مجلد **«1pro — بوابة التكاملات»**
  (يُعدَّل في `config/sync.yaml` أو بـ `GOOGLE_DRIVE_FOLDER_ID`).

```bash
make bootstrap # تهيئة البيئة مرة واحدة (أدوات + .venv + اعتماديات + فحوص)
make doctor    # فحص البيئة — بلا شبكة وبلا طباعة أي قيمة
make sync      # مزامنة حقيقية        |  make test   # 118 اختبار بايثون + 58 اختبار JS
make scan      # بوابة الفحص           |  make lint   # ruff (قواعده في pyproject.toml)
make quality   # lint + tests + scan + doctor، كما يفعل CI
make preview   # معاينة الصفحات (الدردشة في / واللوحة في /sync/)
```

## 🛠️ Built With

- **HTML5** - Semantic structure
- **CSS3** - Modern styling with CSS Variables
- **JavaScript (ES6+)** - Vanilla JS, no frameworks (tested with `node:test`)
- **Python 3.11** - Sync pipeline (requests, cryptography, PyYAML)
- **GitHub Actions** - Hourly schedule, least-privilege permissions, Pages deploy
- **Google Fonts** - Cairo (Arabic) & Inter (English)

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/sayedelazameydesign-crypto/easy-ai.git

# Navigate to project directory
cd easy-ai

# Open in browser
open index.html
# OR use a local server
python3 -m http.server 8000
# Then visit http://localhost:8000
```

## 📁 Project Structure

```
easy-ai/
├── index.html          # Main HTML file (chat app)
├── css/
│   └── style.css       # Dark theme styles (RTL/LTR)
├── js/
│   ├── storage.js      # حارس localStorage — يتدهور إلى الذاكرة بلا استثناء
│   ├── chat-store.js   # حفظ المحادثة (حد 100 رسالة / 20٬000 حرف)
│   ├── i18n.js         # Internationalization (AR/EN)
│   ├── ai.js           # محرك الردود التجريبي (قوالب محلية)
│   └── main.js         # App logic & interactions
├── sync/               # قناة المزامنة: drive, redact, crypto, scan, store, pipeline
├── site/               # لوحة المزامنة العامة (تُنشر تحت /sync/)
├── scripts/
│   ├── build_pages.py      # تجميع artifact النشر: الدردشة في / واللوحة في /sync/
│   └── setup-linux-dev.sh  # تهيئة بيئة Debian/Ubuntu (make bootstrap)
├── data/               # المخرجات المنقّحة + manifest بالبصمات (تُلزم)
├── config/sync.yaml    # إعداد القناة (بلا أسرار)
├── tests/              # 118 اختبار بايثون (قناة المزامنة)
├── tests-js/           # 58 اختبار JS (الدردشة: node:test بلا متصفح)
├── docs/SETUP.md       # دليل الإعداد خطوة بخطوة
├── SECURITY.md         # نموذج التهديد والضوابط
├── pyproject.toml      # قواعد ruff + إعداد pytest (مصدر واحد محليًا وفي CI)
└── .github/workflows/  # sync.yml (ساعي + Pages) · ci.yml (اختبارات + بوابة + ruff/shellcheck)
```

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Focus chat input |
| `Ctrl/Cmd + Shift + L` | Toggle language |
| `Escape` | Cancel the reply in flight |

`Ctrl/Cmd + L` is deliberately **not** bound: it focuses the browser's address
bar (and opens an AI sidebar in some browsers), and hijacking it with
`preventDefault()` took a browser-level shortcut away from the user.

## 🌐 Language Support

The app supports both **Arabic** and **English** with full RTL/LTR layout switching:

- Click the 🌐 button in the navbar to switch languages
- Language preference is saved in localStorage — through a guarded wrapper, so a
  browser that blocks storage (private mode, opaque origin) still renders the
  page and simply does not remember the choice

## 🤖 AI Features (Demo)

The current version includes a **demo AI engine**: an intent matcher over Arabic
and English patterns, answered from i18n templates after a simulated delay.
There is no model and no network call behind it — the chat header says
"demo mode" rather than "online" for exactly that reason.

- 💬 Greetings, help, thanks, goodbye
- 😄 Jokes & fun facts
- 💻 Coding and 🌐 translation prompts (answered from the message text)

Guarantees that `tests-js/` pins down:

- Every intent the matcher can return is answerable — a plural/singular key
  mismatch once made five of ten intents (including joke and fact) silently fall
  through to the default reply.
- Chat text reaches the DOM through `textContent`/`createElement` only.
- A reply in flight can be cancelled, and a reply that resolves after the user
  cleared the conversation is dropped instead of appended.
- Every string in the Arabic table is Arabic (plus brand names): a scan over all
  chat sources rejects unexpected scripts, after fragments of French, Spanish,
  Italian, Russian, Chinese and Japanese were found spliced into the UI text.

> **Note**: To connect to a real AI API (OpenAI, Anthropic, etc.), modify
> `js/ai.js` — and change `chat.demo` to `chat.provider` in the header, so the
> UI keeps telling the truth about what is behind it.

## 🎨 Customization

### Colors
Edit CSS variables in `css/style.css`:

```css
:root {
    --accent-primary: #6366f1;
    --accent-secondary: #8b5cf6;
    --bg-primary: #0a0a0f;
    /* ... */
}
```

### Translations
Add/edit translations in `js/i18n.js`:

```javascript
const translations = {
    ar: { /* Arabic */ },
    en: { /* English */ }
};
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**sayedelazameydesign-crypto**

- GitHub: [@sayedelazameydesign-crypto](https://github.com/sayedelazameydesign-crypto)

## 🙏 Acknowledgments

- Inspired by modern AI chat interfaces
- Built with ❤️ and AI assistance
- Fonts: [Cairo](https://fonts.google.com/specimen/Cairo) & [Inter](https://fonts.google.com/specimen/Inter)

---

<div align="center">

**⭐ Star this repo if you find it helpful!**

Made with ❤️ by [Easy AI](https://github.com/sayedelazameydesign-crypto/easy-ai)

</div>
