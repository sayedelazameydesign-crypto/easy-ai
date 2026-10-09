/**
 * Easy AI - Internationalization (i18n)
 * Arabic (RTL) and English (LTR).
 *
 * Every string below is either Arabic or English — nothing else. An earlier
 * revision had fragments of French, Spanish, Italian, Russian, Chinese and
 * Japanese spliced into the Arabic table (and some into the pattern matcher in
 * ai.js), which showed up verbatim in the public UI.
 *
 * Storage access goes through SafeStorage so a browser that blocks
 * localStorage degrades to "language resets on reload" instead of throwing at
 * module scope and killing the page.
 */

const translations = {
    ar: {
        // Brand
        brand: "Easy AI",

        // Navigation
        "nav.home": "الرئيسية",
        "nav.chat": "المحادثة",
        "nav.tools": "الأدوات",
        "nav.about": "عن المشروع",

        // Hero
        "hero.badge": "✨ ذكاء اصطناعي من الجيل الجديد",
        "hero.title1": "ذكاء اصطناعي",
        "hero.title2": "سهل وقوي",
        "hero.description": "منصة ذكاء اصطناعي حديثة تجعل الذكاء الاصطناعي في متناول الجميع. تحدَّث وأنشئ واكتشف قدرات الذكاء الاصطناعي.",
        "hero.cta1": "ابدأ المحادثة",
        "hero.cta2": "استكشف الأدوات",

        // Stats
        "stats.users": "مستخدم",
        "stats.chats": "محادثة",
        "stats.satisfaction": "رضا",

        // Features
        "features.badge": "🛠️ الأدوات",
        "features.title": "أدوات ذكاء اصطناعي قوية",
        "features.description": "اكتشف مجموعة متكاملة من الأدوات المدعومة بالذكاء الاصطناعي",
        "features.chat.title": "محادثة ذكية",
        "features.chat.desc": "تحدث مع الذكاء الاصطناعي بلغتك المفضلة",
        "features.translate.title": "ترجمة فورية",
        "features.translate.desc": "ترجم نصوصك بين العربية والإنجليزية",
        "features.summarize.title": "تلخيص النصوص",
        "features.summarize.desc": "احصل على ملخصات سريعة لأي نص طويل",
        "features.code.title": "مساعد برمجي",
        "features.code.desc": "احصل على مساعدة في كتابة وتصحيح الكود",
        "features.image.title": "وصف الصور",
        "features.image.desc": "أنشئ أوصافاً إبداعية للصور",
        "features.voice.title": "تحويل صوت لنص",
        "features.voice.desc": "حوّل الصوت إلى نص مكتوب",

        // Chat
        "chat.badge": "🤖 الدردشة",
        "chat.title": "تحدث مع Easy AI",
        "chat.description": "اسأل أي سؤال واحصل على إجابة فورية",
        "chat.online": "متصل الآن",
        "chat.placeholder": "اكتب رسالتك هنا...",
        "chat.welcome": "مرحباً! أنا Easy AI 👋 أنا مساعدك التجريبي. كيف يمكنني مساعدتك اليوم؟",
        "chat.typing": "يكتب...",
        "chat.cleared": "تم مسح المحادثة",

        // Honest demo state — the header shows one of these, never "online",
        // because there is no provider behind this build.
        "chat.demo": "وضع تجريبي · ردود محلية",
        "chat.demo.title": "لا يوجد مزوّد ذكاء اصطناعي متصل في هذه النسخة — كل الردود قوالب محلية داخل متصفحك، ولا يغادر أي شيء جهازك.",
        "chat.provider": "مزوّد متصل",
        "chat.restored": "تم استعادة المحادثة السابقة",

        // Message actions & notices
        "chat.stop": "إيقاف",
        "chat.send": "إرسال",
        "chat.attach": "إرفاق ملف",
        "chat.voice": "إدخال صوتي",
        "chat.clear": "مسح المحادثة",
        "chat.clearShort": "مسح",
        "chat.cancelled": "تم إيقاف الرد",
        "chat.error": "😅 تعذّر إنشاء الرد. حاول مرة أخرى.",
        "chat.truncated": "الرسالة طويلة جداً — حُفظ أول 20٬000 حرف فقط.",
        "chat.storageUnavailable": "الحفظ المحلي غير متاح في هذا المتصفح، لذا لن تبقى المحادثة بعد إعادة التحميل.",
        "chat.messageLog": "سجل رسائل المحادثة",
        "chat.notImplemented": "هذه الأداة غير مفعّلة في هذه النسخة التجريبية.",

        // Suggestions
        "suggestions.hello": "👋 قل مرحباً",
        "suggestions.help": "🆘 ما الذي يمكنك فعله؟",
        "suggestions.joke": "😄 أخبرني نكتة",
        "suggestions.fact": "🧠 أخبرني معلومة ممتعة",

        // About
        "about.badge": "ℹ️ عن المشروع",
        "about.title": "ما هو Easy AI؟",
        "about.description1": "Easy AI هو مشروع مفتوح المصدر يهدف إلى جعل الذكاء الاصطناعي في متناول الجميع. نوفر واجهة سهلة الاستخدام تدعم اللغة العربية والإنجليزية.",
        "about.description2": "سواء كنت مطوراً أو طالباً أو فضولياً، يوفر لك Easy AI أدوات ذكاء اصطناعي قوية دون أي تعقيدات.",
        "about.feature1": "مجاني ومفتوح المصدر",
        "about.feature2": "يدعم العربية والإنجليزية",
        "about.feature3": "واجهة سهلة الاستخدام",
        "about.feature4": "أدوات متعددة",
        "about.github": "⭐ تابعنا على GitHub",

        // Footer
        "footer.tagline": "ذكاء اصطناعي سهل للجميع",
        "footer.links": "روابط",
        "footer.resources": "الموارد",
        "footer.rights": "جميع الحقوق محفوظة.",
        "footer.made": "صنع بـ ❤️ باستخدام الذكاء الاصطناعي",

        // AI Responses
        "ai.greeting": "مرحباً! 👋 أنا Easy AI، مساعدك الذكي. كيف يمكنني مساعدتك اليوم؟",
        "ai.help": "يمكنني مساعدتك في: 💬 الإجابة على أسئلتك، 🌐 الترجمة بين العربية والإنجليزية، 📝 تلخيص النصوص، 💻 كتابة الكود، 🎨 وصف الصور، 😄 إخبارك بنكتة!",
        "ai.joke": "💡 لماذا ذهب الحاسوب إلى الطبيب؟ لأن لديه فيروس! 😄",
        "ai.joke2": "😄 ما الفرق بين المبرمج والساحر؟ الساحر يستخدم السحر، والمبرمج يصنع السحر! ✨",
        "ai.fact": "🧠 هل تعلم أن أول حاسوب إلكتروني كان يزن أكثر من 27 طناً؟ كان ذلك عام 1946!",
        "ai.fact2": "🚀 هل تعلم أن الذكاء الاصطناعي يستطيع اليوم توليد الموسيقى والفنون وحتى الشعر؟",
        "ai.default": "شكراً على سؤالك! 🤔 أنا نموذج تجريبي، لكن يمكنني مساعدتك في: المحادثة، الترجمة، التلخيص، والبرمجة. جرب أن تسألني شيئاً محدداً!",
        "ai.thanks": "على الرحب والسعة! 😊 هل هناك شيء آخر تريد معرفته؟",
        "ai.bye": "إلى اللقاء! 👋 أتمنى لك يوماً سعيداً!",
        "ai.love": "شكراً على لطفك! ❤️ أنا هنا دائماً لمساعدتك. 💪",
        "ai.creative": "✨ فكرة رائعة! دعني أساعدك فيها.",

        // Time
        "time.now": "الآن",
        "time.minute": "دقيقة",
        "time.minutes": "دقائق",
        "time.ago": "منذ"
    },

    en: {
        // Brand
        brand: "Easy AI",

        // Navigation
        "nav.home": "Home",
        "nav.chat": "Chat",
        "nav.tools": "Tools",
        "nav.about": "About",

        // Hero
        "hero.badge": "✨ Next-Gen Artificial Intelligence",
        "hero.title1": "Artificial Intelligence",
        "hero.title2": "Easy & Powerful",
        "hero.description": "A modern AI platform that makes artificial intelligence accessible to everyone. Chat, create, and discover the power of AI.",
        "hero.cta1": "Start Chatting",
        "hero.cta2": "Explore Tools",

        // Stats
        "stats.users": "Users",
        "stats.chats": "Chats",
        "stats.satisfaction": "Satisfaction",

        // Features
        "features.badge": "🛠️ Tools",
        "features.title": "Powerful AI Tools",
        "features.description": "Discover a complete suite of AI-powered tools",
        "features.chat.title": "Smart Chat",
        "features.chat.desc": "Chat with AI in your preferred language",
        "features.translate.title": "Instant Translation",
        "features.translate.desc": "Translate your texts between Arabic and English",
        "features.summarize.title": "Text Summarizer",
        "features.summarize.desc": "Get quick summaries of any long text",
        "features.code.title": "Code Assistant",
        "features.code.desc": "Get help writing and debugging code",
        "features.image.title": "Image Describer",
        "features.image.desc": "Create creative descriptions for images",
        "features.voice.title": "Speech to Text",
        "features.voice.desc": "Convert audio to written text",

        // Chat
        "chat.badge": "🤖 Chat",
        "chat.title": "Chat with Easy AI",
        "chat.description": "Ask any question and get an instant answer",
        "chat.online": "Online now",
        "chat.placeholder": "Type your message here...",
        "chat.welcome": "Hello! I'm Easy AI 👋 Your demo assistant. How can I help you today?",
        "chat.typing": "Typing...",
        "chat.cleared": "Chat cleared",

        // Honest demo state
        "chat.demo": "Demo mode · local responses",
        "chat.demo.title": "No AI provider is connected in this build — every reply is a local template inside your browser, and nothing leaves your device.",
        "chat.provider": "Provider connected",
        "chat.restored": "Previous conversation restored",

        // Message actions & notices
        "chat.stop": "Stop",
        "chat.send": "Send",
        "chat.attach": "Attach a file",
        "chat.voice": "Voice input",
        "chat.clear": "Clear conversation",
        "chat.clearShort": "Clear",
        "chat.cancelled": "Reply stopped",
        "chat.error": "😅 Could not generate a reply. Please try again.",
        "chat.truncated": "Message too long — only the first 20,000 characters were kept.",
        "chat.storageUnavailable": "Local storage is unavailable in this browser, so the conversation will not survive a reload.",
        "chat.messageLog": "Chat message log",
        "chat.notImplemented": "That tool is not enabled in this demo build.",

        // Suggestions
        "suggestions.hello": "👋 Say hello",
        "suggestions.help": "🆘 What can you do?",
        "suggestions.joke": "😄 Tell me a joke",
        "suggestions.fact": "🧠 Tell me a fun fact",

        // About
        "about.badge": "ℹ️ About",
        "about.title": "What is Easy AI?",
        "about.description1": "Easy AI is an open-source project aimed at making artificial intelligence accessible to everyone. We provide an easy-to-use interface that supports both Arabic and English.",
        "about.description2": "Whether you're a developer, student, or just curious, Easy AI provides powerful AI tools without any complexity.",
        "about.feature1": "Free & Open Source",
        "about.feature2": "Arabic & English Support",
        "about.feature3": "Easy-to-use Interface",
        "about.feature4": "Multiple Tools",
        "about.github": "⭐ Star on GitHub",

        // Footer
        "footer.tagline": "AI made easy for everyone",
        "footer.links": "Links",
        "footer.resources": "Resources",
        "footer.rights": "All rights reserved.",
        "footer.made": "Made with ❤️ using AI",

        // AI Responses
        "ai.greeting": "Hello! 👋 I'm Easy AI, your AI assistant. How can I help you today?",
        "ai.help": "I can help you with: 💬 Answering questions, 🌐 Translation between Arabic & English, 📝 Text summarization, 💻 Coding help, 🎨 Image descriptions, 😄 Telling jokes!",
        "ai.joke": "💡 Why did the computer go to the doctor? Because it had a virus! 😄",
        "ai.joke2": "😄 What's the difference between a programmer and a wizard? A wizard uses magic, a programmer creates magic! ✨",
        "ai.fact": "🧠 Did you know the first electronic computer weighed over 27 tons? That was in 1946!",
        "ai.fact2": "🚀 Did you know AI can now generate music, art, and even poetry?",
        "ai.default": "Thanks for your question! 🤔 I'm a demo model, but I can help you with: chatting, translation, summarization, and coding. Try asking me something specific!",
        "ai.thanks": "You're welcome! 😊 Is there anything else you'd like to know?",
        "ai.bye": "Goodbye! 👋 Have a great day!",
        "ai.love": "Thank you for your kindness! ❤️ I'm always here to help. 💪",
        "ai.creative": "✨ Great idea! Let me help you with it.",

        // Time
        "time.now": "Now",
        "time.minute": "minute",
        "time.minutes": "minutes",
        "time.ago": "ago"
    }
};

/**
 * Storage-backed language state. A blocked or broken localStorage must never
 * stop the page from rendering, so every access is guarded and the failure is
 * remembered for an honest notice in the UI.
 */
const LANG_KEY = 'easy-ai-lang';

function readStoredLang() {
    try {
        if (typeof SafeStorage !== 'undefined' && SafeStorage) {
            const value = SafeStorage.get(LANG_KEY);
            return value === 'ar' || value === 'en' ? value : null;
        }
    } catch (err) { /* fall through */ }
    try {
        if (typeof localStorage !== 'undefined') {
            const value = localStorage.getItem(LANG_KEY);
            return value === 'ar' || value === 'en' ? value : null;
        }
    } catch (err) { /* unavailable */ }
    return null;
}

function writeStoredLang(lang) {
    try {
        if (typeof SafeStorage !== 'undefined' && SafeStorage) {
            return SafeStorage.set(LANG_KEY, lang);
        }
    } catch (err) { /* fall through */ }
    try {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(LANG_KEY, lang);
            return true;
        }
    } catch (err) { /* unavailable */ }
    return false;
}

// Current language state
let currentLang = readStoredLang() || 'ar';

/**
 * Get translation for a key. Falls back to English, then to the key itself.
 */
function t(key) {
    if (typeof key !== 'string') return '';
    const table = translations[currentLang] || translations.en;
    if (Object.prototype.hasOwnProperty.call(table, key)) return table[key];
    if (Object.prototype.hasOwnProperty.call(translations.en, key)) return translations.en[key];
    return key;
}

/**
 * Set language
 */
function setLanguage(lang) {
    currentLang = lang === 'en' ? 'en' : 'ar';
    writeStoredLang(currentLang);

    if (typeof document === 'undefined') return;

    // Update HTML attributes
    document.documentElement.lang = currentLang;
    document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
    if (document.body) document.body.dir = currentLang === 'ar' ? 'rtl' : 'ltr';

    // Update all translated elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
        el.textContent = t(el.getAttribute('data-i18n'));
    });

    // Update placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
    });

    // Update accessible labels and tooltips
    document.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
        el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria-label')));
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        el.setAttribute('title', t(el.getAttribute('data-i18n-title')));
    });

    // Update language toggle button
    const langLabel = document.getElementById('langLabel');
    if (langLabel) {
        langLabel.textContent = currentLang === 'ar' ? 'EN' : 'ع';
    }

    // Dispatch language change event
    document.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang: currentLang } }));
}

/**
 * Toggle language
 */
function toggleLanguage() {
    setLanguage(currentLang === 'ar' ? 'en' : 'ar');
}

/**
 * Get current language
 */
function getLanguage() {
    return currentLang;
}

/**
 * Check if current language is RTL
 */
function isRTL() {
    return currentLang === 'ar';
}

/**
 * True when the chosen language can be persisted, i.e. it will survive a
 * reload. The UI can report the opposite honestly instead of implying a save
 * that never reached durable storage.
 */
function isPersistent() {
    try {
        if (typeof SafeStorage !== 'undefined' && SafeStorage) {
            return SafeStorage.isAvailable();
        }
    } catch (err) { /* fall through */ }
    try {
        return typeof localStorage !== 'undefined' && !!localStorage;
    } catch (err) {
        return false;
    }
}

// Initialize language on load
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        setLanguage(currentLang);
    });
}

const i18n = {
    t,
    setLanguage,
    toggleLanguage,
    getLanguage,
    isRTL,
    isPersistent,
    translations
};

// Export for use in other scripts
if (typeof window !== 'undefined') {
    window.i18n = i18n;
}

// CommonJS export for the Node test suite.
if (typeof module === 'object' && module.exports) {
    module.exports = i18n;
}
