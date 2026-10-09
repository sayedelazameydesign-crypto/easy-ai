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

- 🤖 **AI Chat** - Interactive chat interface with smart responses
- 🌐 **Bilingual** - Full Arabic (RTL) and English (LTR) support
- 🌙 **Dark Theme** - Beautiful modern dark design with animations
- 📱 **Responsive** - Works on all devices
- ⚡ **Fast** - Pure HTML/CSS/JS, no frameworks
- 🎨 **Modern UI** - Glassmorphism, gradients, and smooth animations
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
make doctor    # فحص البيئة — بلا شبكة وبلا طباعة أي قيمة
make sync      # مزامنة حقيقية        |  make test   # 51 اختبارًا
make scan      # بوابة الفحص           |  make preview # معاينة الصفحات
```

## 🛠️ Built With

- **HTML5** - Semantic structure
- **CSS3** - Modern styling with CSS Variables
- **JavaScript (ES6+)** - Vanilla JS, no frameworks
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
│   ├── i18n.js         # Internationalization (AR/EN)
│   ├── ai.js           # AI engine (demo responses)
│   └── main.js         # App logic & interactions
├── sync/               # قناة المزامنة: drive, redact, crypto, scan, store, pipeline
├── site/               # لوحة المزامنة العامة (تُنشر تحت /sync/)
├── scripts/
│   └── build_pages.py  # تجميع artifact النشر: الدردشة في / واللوحة في /sync/
├── data/               # المخرجات المنقّحة + manifest بالبصمات (تُلزم)
├── config/sync.yaml    # إعداد القناة (بلا أسرار)
├── tests/              # 51 اختبارًا
├── docs/SETUP.md       # دليل الإعداد خطوة بخطوة
├── SECURITY.md         # نموذج التهديد والضوابط
└── .github/workflows/  # sync.yml (ساعي + Pages) · ci.yml (اختبارات + بوابة فحص)
```

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Focus chat input |
| `Ctrl/Cmd + L` | Toggle language |

## 🌐 Language Support

The app supports both **Arabic** and **English** with full RTL/LTR layout switching:

- Click the 🌐 button in the navbar to switch languages
- Language preference is saved in localStorage

## 🤖 AI Features (Demo)

The current version includes a **demo AI engine** that simulates responses:

- 💬 Smart conversations
- 🌐 Translation assistance
- 📝 Text summarization help
- 💻 Coding assistance
- 😄 Jokes & fun facts

> **Note**: To connect to a real AI API (OpenAI, Anthropic, etc.), modify `js/ai.js`

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
