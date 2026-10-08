/**
 * Easy AI - Internationalization (i18n)
 * Supports Arabic (RTL) and English (LTR)
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
        "hero.description": "منصة ذكاء اصطناعي حديثة rendent l'IA accessible à tous. Discutez, créez et découvrez la puissance de l'intelligence artificielle.",
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
        "features.voice.desc": "حول audio إلى نص مكتوب",
        
        // Chat
        "chat.badge": "🤖 الدردشة",
        "chat.title": "تحدث مع Easy AI",
        "chat.description": "اسأل أي سؤال واحصل على إجابة فورية",
        "chat.online": "متصل الآن",
        "chat.placeholder": "اكتب رسالتك هنا...",
        "chat.welcome": "مرحباً! أنا Easy AI 👋 أنا مساعدك الذكي. كيف يمكنني مساعدتك اليوم؟",
        "chat.typing": "يكتب...",
        "chat.cleared": "تم مسح المحادثة",
        
        // Suggestions
        "suggestions.hello": "👋 قل مرحباً",
        "suggestions.help": "🆘 ما الذي يمكنك فعله؟",
        "suggestions.joke": "😄 أخبرني نكتة",
        "suggestions.fact": "🧠 autonomy un fait intéressant",
        
        // About
        "about.badge": "ℹ️ عن المشروع",
        "about.title": "ما هو Easy AI؟",
        "about.description1": "Easy AI هو مشروع مفتوح المصدر يهدف إلى جعل الذكاء الاصطناعي في متناول الجميع. نوفر واجهة سهلة الاستخدام تدعم اللغة العربية والإنجليزية.",
        "about.description2": "سواء كنت مطوراً أو طالباً أو فضولياً، يوفر لك Easy AI أدوات ذكاء اصطناعي قوية دون أي تعقيدات.",
        "about.feature1": "مجاني ومفتوح المصدر",
        "about.feature2": "يدعم العربية والإنجليزية",
        "about.feature3": "واجهة سهلة الاستخدام",
        "about.feature4": "أدوات متعددة",
        "about.github": "⭐ Star on GitHub",
        
        // Footer
        "footer.tagline": "ذكاء اصطناعي سهل للجميع",
        "footer.links": "روابط",
        "footer.resources": "الموارد",
        "footer.rights": "جميع الحقوق محفوظة.",
        "footer.made": "صنع بـ ❤️ باستخدام الذكاء الاصطناعي",
        
        // AI Responses
        "ai.greeting": "مرحباً! 👋 أنا Easy AI، مساعدك الذكي. كيف يمكنني مساعدتك اليوم؟",
        "ai.help": "يمكنني مساعدتك في: 💬 الإجابة على أسئلتك، 🌐 الترجمة بين العربية والإنجليزية، 📝 تلخيص النصوص، 💻 كتابة الكود، 🎨 وصف الصور، 😄 إخبارك بنكتة!",
        "ai.joke": "💡 لماذا went الع disagree الصdik? لأنه Aron stubborn! 😄",
        "ai.joke2": "😄 ما الفرق بين المبرمج وال wizard؟Wizard يستخدم السحر، والمبرمج يصنع السحر! ✨",
        "ai.fact": "🧠 هل تعلم أن أول كمبيوتر elektroner般 كان يزن أكثر من 27 طناً؟ وذلك عام 1946!",
        "ai.fact2": "🚀 هل تعلم أن الذكاء الاصطناعي يمكنه الآن/generated muzika, art, وكتابةPoetry؟",
        "ai.default": "شكراً على سؤالك! 🤔 أنا نموذج تجريبي، لكن يمكنني مساعدتك في: المحادثة، الترجمة، التلخيص، والبرمجة. جرب أن تسألني شيئاً محدداً!",
        "ai.thanks": "على الرحب والسعة! 😊 هل هناك شيء آخر تريد معرفته؟",
        "ai.bye": "إلى اللقاء! 👋 buona giornata!",
        "ai.love": "شكراً على kindness! ❤️ أنا هنا دائماً لمساعدتك. 💪",
        
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
        "chat.welcome": "Hello! I'm Easy AI 👋 Your AI assistant. How can I help you today?",
        "chat.typing": "Typing...",
        "chat.cleared": "Chat cleared",
        
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
        "about.feature3": "Easy-to-Use Interface",
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
        
        // Time
        "time.now": "Now",
        "time.minute": "minute",
        "time.minutes": "minutes",
        "time.ago": "ago"
    }
};

// Current language state
let currentLang = localStorage.getItem('easy-ai-lang') || 'ar';

/**
 * Get translation for a key
 */
function t(key) {
    return translations[currentLang]?.[key] || translations['en'][key] || key;
}

/**
 * Set language
 */
function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('easy-ai-lang', lang);
    
    // Update HTML attributes
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.body.dir = lang === 'ar' ? 'rtl' : 'ltr';
    
    // Update all translated elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.textContent = t(key);
    });
    
    // Update placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        el.placeholder = t(key);
    });
    
    // Update language toggle button
    const langLabel = document.getElementById('langLabel');
    if (langLabel) {
        langLabel.textContent = lang === 'ar' ? 'EN' : 'ع';
    }
    
    // Dispatch language change event
    document.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
}

/**
 * Toggle language
 */
function toggleLanguage() {
    const newLang = currentLang === 'ar' ? 'en' : 'ar';
    setLanguage(newLang);
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

// Initialize language on load
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        setLanguage(currentLang);
    });
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
    window.i18n = {
        t,
        setLanguage,
        toggleLanguage,
        getLanguage,
        isRTL,
        translations
    };
}
