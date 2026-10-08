# 🤖 Easy AI

> ذكاء اصطناعي سهل للجميع | AI made easy for everyone

A modern, bilingual (Arabic/English) AI assistant web application with a beautiful dark theme.

![Easy AI](https://img.shields.io/badge/version-1.0.0-blue)
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

## 🛠️ Built With

- **HTML5** - Semantic structure
- **CSS3** - Modern styling with CSS Variables
- **JavaScript (ES6+)** - Vanilla JS, no frameworks
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
├── index.html          # Main HTML file
├── css/
│   └── style.css       # Dark theme styles (RTL/LTR)
├── js/
│   ├── i18n.js         # Internationalization (AR/EN)
│   ├── ai.js           # AI engine (demo responses)
│   └── main.js         # App logic & interactions
└── README.md
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
