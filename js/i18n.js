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
        "hero.badge": "✨ تجربة محادثة توضيحية",
        "hero.title1": "مساعد تجريبي",
        "hero.title2": "واضح وسهل",
        "hero.description": "واجهة ثنائية اللغة تستعرض تجربة محادثة بردود ثابتة. لا يوجد نموذج ذكاء اصطناعي أو مزود خارجي متصل حاليًا.",
        "hero.cta1": "ابدأ المحادثة",
        "hero.cta2": "استكشف الأدوات",
        
        // Stats
        "stats.users": "لا توجد بيانات استخدام",
        "stats.chats": "ردود ثابتة",
        "stats.satisfaction": "تشغيل محلي",
        
        // Features
        "features.badge": "🛠️ الأدوات",
        "features.title": "حالة ميزات العرض",
        "features.description": "توضح كل بطاقة ما يعمل كتجربة وما يحتاج إلى خدمة غير متصلة.",
        "status.implemented": "متصل فعليًا",
        "status.demo": "تجريبي",
        "status.unavailable": "غير متاح",
        "feature.unavailable.notice": "هذه الميزة غير متاحة حاليًا لأنها تحتاج إلى خدمة خارجية غير متصلة.",
        "features.chat.title": "محادثة تجريبية",
        "features.chat.desc": "جرّب ردودًا ثابتة ومحاكاة بسيطة بالعربية أو الإنجليزية.",
        "features.translate.title": "الترجمة",
        "features.translate.desc": "غير متاحة؛ لم تُربط خدمة ترجمة فعلية بعد.",
        "features.summarize.title": "تلخيص النصوص",
        "features.summarize.desc": "غير متاح؛ لا يوجد نموذج متصل لتلخيص النصوص.",
        "features.code.title": "مساعد برمجي",
        "features.code.desc": "غير متاح؛ لا توجد خدمة متصلة لتحليل الشيفرة.",
        "features.image.title": "وصف الصور",
        "features.image.desc": "غير متاح؛ الواجهة لا تستقبل الصور أو تحللها.",
        "features.voice.title": "تحويل صوت لنص",
        "features.voice.desc": "غير متاح؛ لا يوجد تسجيل أو تحويل للصوت.",
        
        // Chat
        "chat.badge": "🤖 الدردشة",
        "chat.title": "تحدث مع Easy AI",
        "chat.description": "جرّب محادثة توضيحية تعتمد على ردود معدّة مسبقًا.",
        "chat.online": "وضع تجريبي",
        "chat.connected": "نموذج متصل",
        "chat.error.not_configured": "خدمة المحادثة غير مهيأة حاليًا.",
        "chat.error.rate_limited": "تم بلوغ حد الطلبات. حاول لاحقًا.",
        "chat.error.provider_timeout": "انتهت مهلة مزود النموذج. حاول مجددًا.",
        "chat.error.provider_error": "تعذّر الحصول على رد من مزود النموذج.",
        "chat.placeholder": "اكتب رسالتك هنا...",
        "chat.welcome": "مرحبًا! هذه محادثة تجريبية بردود ثابتة، وليست نموذج ذكاء اصطناعي متصلًا. اختر اقتراحًا لتجربة الواجهة.",
        "chat.typing": "يكتب...",
        "chat.cleared": "تم مسح المحادثة",
        
        // Suggestions
        "suggestions.hello": "👋 قل مرحباً",
        "suggestions.help": "🆘 ما الذي يمكنك فعله؟",
        "suggestions.joke": "😄 أخبرني نكتة",
        "suggestions.fact": "🧠 أخبرني حقيقة ممتعة",
        
        // About
        "about.badge": "ℹ️ عن المشروع",
        "about.title": "ما هو Easy AI؟",
        "about.description1": "Easy AI مشروع مفتوح المصدر يعرض واجهة محادثة ثنائية اللغة، مع قناة مستقلة وآمنة لمزامنة البيانات المنقّحة.",
        "about.description2": "المحادثة الحالية محاكاة توضيحية، أما الترجمة والتلخيص والبرمجة والصور والصوت فتحتاج إلى خدمات غير متصلة بعد.",
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
        "ai.help": "هذه تجربة توضيحية بردود ثابتة: يمكنني عرض التحيات والنكات والحقائق وبعض الردود العامة. الترجمة والتلخيص والبرمجة والصور والصوت غير متاحة فعليًا.",
        "ai.joke": "💡 لماذا ذهب الحاسوب إلى الطبيب؟ لأنه أُصيب بفيروس! 😄",
        "ai.joke2": "😄 ما الفرق بين المبرمج والساحر؟ الساحر يستخدم السحر، والمبرمج يصنعه! ✨",
        "ai.fact": "🧠 هل تعلم أن أول حاسوب إلكتروني عام كان يزن أكثر من 27 طنًا؟ كان ذلك عام 1946!",
        "ai.fact2": "🚀 هل تعلم أن الذكاء الاصطناعي يستطيع الآن إنشاء الموسيقى والفنون وكتابة الشعر؟",
        "ai.default": "شكرًا على رسالتك! هذه محاكاة بردود ثابتة وليست نموذجًا متصلًا، لذلك قد لا أستطيع الإجابة عن طلبك فعليًا.",
        "ai.thanks": "على الرحب والسعة! 😊 هل هناك شيء آخر تريد معرفته؟",
        "ai.bye": "إلى اللقاء! 👋 أتمنى لك يومًا سعيدًا!",
        "ai.love": "شكرًا على لطفك! ❤️ أنا هنا دائمًا لمساعدتك. 💪",
        
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
        "hero.badge": "✨ Demo Conversation Experience",
        "hero.title1": "Demo Assistant",
        "hero.title2": "Clear & Simple",
        "hero.description": "A bilingual interface demonstrating preset chat responses. No AI model or external provider is currently connected.",
        "hero.cta1": "Start Chatting",
        "hero.cta2": "Explore Tools",
        
        // Stats
        "stats.users": "No usage telemetry",
        "stats.chats": "Preset responses",
        "stats.satisfaction": "Runs locally",
        
        // Features
        "features.badge": "🛠️ Tools",
        "features.title": "Demo Feature Status",
        "features.description": "Each card clearly shows what is a demo and what requires an unconnected service.",
        "status.implemented": "Connected",
        "status.demo": "Demo",
        "status.unavailable": "Unavailable",
        "feature.unavailable.notice": "This feature is currently unavailable because it requires an external service that is not connected.",
        "features.chat.title": "Demo Chat",
        "features.chat.desc": "Try preset responses and simple simulation in Arabic or English.",
        "features.translate.title": "Translation",
        "features.translate.desc": "Unavailable; no real translation service is connected.",
        "features.summarize.title": "Text Summarizer",
        "features.summarize.desc": "Unavailable; no model is connected to summarize text.",
        "features.code.title": "Code Assistant",
        "features.code.desc": "Unavailable; no service is connected to analyze code.",
        "features.image.title": "Image Describer",
        "features.image.desc": "Unavailable; the interface cannot upload or analyze images.",
        "features.voice.title": "Speech to Text",
        "features.voice.desc": "Unavailable; audio recording and transcription are not implemented.",
        
        // Chat
        "chat.badge": "🤖 Chat",
        "chat.title": "Chat with Easy AI",
        "chat.description": "Try a demonstration chat powered by preset responses.",
        "chat.online": "Demo mode",
        "chat.connected": "Model connected",
        "chat.error.not_configured": "The chat service is not configured.",
        "chat.error.rate_limited": "The request limit was reached. Try again later.",
        "chat.error.provider_timeout": "The model provider timed out. Please try again.",
        "chat.error.provider_error": "A response could not be obtained from the model provider.",
        "chat.placeholder": "Type your message here...",
        "chat.welcome": "Hello! This is a preset-response demo, not a connected AI model. Choose a suggestion to try the interface.",
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
        "about.description1": "Easy AI is an open-source bilingual chat interface with a separate secure channel for publishing sanitized synchronized data.",
        "about.description2": "The current chat is a demonstration. Translation, summarization, coding, image, and voice tools require services that are not connected yet.",
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
        "ai.help": "This is a preset-response demo: I can show greetings, jokes, facts, and a few general responses. Translation, summarization, coding, image, and voice tools are not actually available.",
        "ai.joke": "💡 Why did the computer go to the doctor? Because it had a virus! 😄",
        "ai.joke2": "😄 What's the difference between a programmer and a wizard? A wizard uses magic, a programmer creates magic! ✨",
        "ai.fact": "🧠 Did you know the first electronic computer weighed over 27 tons? That was in 1946!",
        "ai.fact2": "🚀 Did you know AI can now generate music, art, and even poetry?",
        "ai.default": "Thanks for your message! This is a preset-response simulation, not a connected model, so I may not be able to fulfill your request.",
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
let currentLang = (typeof localStorage !== 'undefined' && localStorage.getItem('easy-ai-lang')) || 'ar';

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
    if (!translations[lang]) return;
    currentLang = lang;
    if (typeof localStorage !== 'undefined') localStorage.setItem('easy-ai-lang', lang);
    if (typeof document === 'undefined') return;
    
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

// CommonJS export keeps translations testable without a browser or build step.
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { translations, t, setLanguage, getLanguage, isRTL };
}
