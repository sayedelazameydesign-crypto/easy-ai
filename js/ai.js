/**
 * Easy AI - Response engine (local demo).
 *
 * IMPORTANT, and stated in the UI too: there is no AI provider behind this.
 * Every reply is a canned template resolved through i18n, with a simulated
 * delay. Nothing leaves the browser. The chat header says "demo mode" rather
 * than "online" so the page never implies a live model it does not have.
 */

class EasyAI {
    constructor() {
        this.conversationHistory = [];
        this.isTyping = false;

        /**
         * Intent -> translation keys.
         *
         * The keys here MUST be exactly the strings analyzeIntent() returns.
         * They used to be plural ("greetings", "jokes", "facts") while the
         * analyzer returned singular names, so five of the ten intents silently
         * fell through to `default` — the joke and fact buttons never told a
         * joke or a fact. tests-js/test_ai.cjs asserts this mapping stays whole.
         */
        this.responses = {
            greeting: ["ai.greeting"],
            help: ["ai.help"],
            joke: ["ai.joke", "ai.joke2"],
            fact: ["ai.fact", "ai.fact2"],
            thanks: ["ai.thanks"],
            goodbye: ["ai.bye"],
            love: ["ai.love"],
            default: ["ai.default"]
        };

        /** Intents answered from the message text rather than a fixed template. */
        this.contextualIntents = new Set(["code", "translate", "default"]);

        /** In-memory history cap: this is a demo, not a transcript archive. */
        this.maxHistory = 200;

        /**
         * The template key behind the most recent reply, or null for a
         * free-form/contextual answer. The UI stores it so a persisted reply
         * can follow a later language switch — guessing the key afterwards
         * would pick the wrong template whenever an intent has several.
         */
        this.lastResponseKey = null;
    }

    /**
     * Intent patterns, one table per language.
     *
     * Ordered most specific first: a message is judged by what it asks for, so
     * "hello, can you help me?" is a help request, not a greeting. The old
     * tables also mixed in CJK fragments that no pattern in this bilingual
     * (Arabic/English) app could ever serve — see tests-js/i18n.test.cjs.
     */
    static get patterns() {
        return {
            ar: [
                ["help", /(ساعد|مساعدة|ماذا تستطيع|ما الذي تستطيع|what can you|help)/i],
                ["joke", /(نكتة|نكته|ضحكني|مزح|joke|funny|laugh)/i],
                ["fact", /(حقيقة|معلومة|هل تعلم|fact|did you know|trivia)/i],
                ["code", /(كود|برمجة|مبرمج|دالة|خطأ برمجي|code|programming|debug|javascript|python)/i],
                ["translate", /(ترجم|ترجمة|translate|translation)/i],
                ["thanks", /(شكرا|شكراً|مشكور|تسلم|thank|thanks|thx|appreciate)/i],
                ["goodbye", /(وداعا|وداعاً|مع السلامة|باي|bye|goodbye|see you|farewell|cya)/i],
                ["love", /(احبك|أحبك|حبيبي|love you|i love)/i],
                // Greeting last: anchored, so it only fires when the message
                // actually starts with a greeting.
                ["greeting", /^(مرحبا|مرحباً|اهلا|أهلا|اهلين|أهلين|هلا|السلام عليكم|سلام|hi|hello|hey|yo|sup|greetings)/i]
            ],
            en: [
                ["help", /(help|what can you|assist me|support)/i],
                ["joke", /(joke|funny|make me laugh|humor)/i],
                ["fact", /(fact|did you know|tell me something|trivia)/i],
                ["code", /(code|programming|debug|function|javascript|python)/i],
                ["translate", /(translate|translation)/i],
                ["thanks", /(thank|thanks|thx|appreciate)/i],
                ["goodbye", /(bye|goodbye|see you|farewell|cya)/i],
                ["love", /(love you|i love|❤️|♥)/i],
                ["greeting", /^(hi|hello|hey|yo|sup|greetings)/i]
            ]
        };
    }

    /** Every intent name analyzeIntent() can ever return. */
    static get intents() {
        return ["help", "joke", "fact", "code", "translate", "thanks",
                "goodbye", "love", "greeting", "default"];
    }

    /**
     * Analyze a message and return one of EasyAI.intents.
     */
    analyzeIntent(message) {
        const msg = String(message === null || message === undefined ? "" : message)
            .toLowerCase().trim();
        if (!msg) return "default";

        const lang = (typeof window !== "undefined" && window.i18n && window.i18n.getLanguage)
            ? window.i18n.getLanguage()
            : "ar";
        const table = EasyAI.patterns[lang] || EasyAI.patterns.ar;

        for (const [intent, pattern] of table) {
            if (pattern.test(msg)) return intent;
        }
        return "default";
    }

    /**
     * Resolve an intent to translation keys that actually exist.
     * A key missing from the i18n tables falls back to `default` instead of
     * leaking the raw key into the conversation.
     */
    responseKeysFor(intent) {
        const translate = (typeof window !== "undefined" && window.i18n && window.i18n.t)
            ? window.i18n.t : null;
        let keys = Object.prototype.hasOwnProperty.call(this.responses, intent)
            ? this.responses[intent] : null;

        if (!keys || !keys.length) return this.responses.default;
        if (!translate) return keys;

        const known = keys.filter((k) => translate(k) !== k);
        return known.length ? known : this.responses.default;
    }

    /**
     * Generate a reply.
     *
     * @param {string} userMessage
     * @param {{signal?: AbortSignal}} [options]  a signal lets the UI cancel the
     *   simulated delay; the promise then rejects with an AbortError and the
     *   caller drops the reply instead of appending a stale one.
     */
    async generateResponse(userMessage, options = {}) {
        const intent = this.analyzeIntent(userMessage);
        const lang = (typeof window !== "undefined" && window.i18n && window.i18n.getLanguage)
            ? window.i18n.getLanguage() : "ar";

        await this.simulateDelay(options.signal);

        let response;
        if (this.contextualIntents.has(intent)) {
            this.lastResponseKey = null;
            response = this.generateContextualResponse(userMessage, lang, intent);
        } else {
            const keys = this.responseKeysFor(intent);
            this.lastResponseKey = keys[Math.floor(Math.random() * keys.length)];
            response = this.translate(this.lastResponseKey);
        }

        this._remember(userMessage, response);
        return response;
    }

    translate(key) {
        if (typeof window !== "undefined" && window.i18n && typeof window.i18n.t === "function") {
            return window.i18n.t(key);
        }
        return key;
    }

    _remember(userMessage, response) {
        const now = Date.now();
        this.conversationHistory.push(
            { role: "user", content: userMessage, timestamp: now },
            { role: "assistant", content: response, timestamp: now }
        );
        if (this.conversationHistory.length > this.maxHistory) {
            this.conversationHistory =
                this.conversationHistory.slice(this.conversationHistory.length - this.maxHistory);
        }
    }

    /**
     * Context-aware replies for coding / translation / unmatched messages.
     */
    generateContextualResponse(message, lang, intent) {
        const msg = String(message || "").toLowerCase();
        const isArabic = lang === "ar";

        if (intent === "code" || (!intent && /code|function|bug|error|كود|خطأ|برنامج/i.test(msg))) {
            return isArabic
                ? "💻 يبدو أنه سؤال برمجي! أستطيع مساعدتك في:\n"
                  + "• كتابة كود نظيف\n• شرح الأخطاء\n• مراجعة الكود\n• اقتراحات للتحسين\n\n"
                  + "بأي لغة برمجة تحتاج المساعدة؟"
                : "💻 Looks like a coding question! I can help you with:\n"
                  + "• Writing clean code\n• Explaining errors\n• Code review\n"
                  + "• Improvement suggestions\n\nWhat programming language do you need help with?";
        }

        if (intent === "translate" || (!intent && /ترجم|translate/i.test(msg))) {
            return isArabic
                ? "🌐 خدمة الترجمة جاهزة!\n\nأستطيع الترجمة بين:\n"
                  + "• العربية ↔ الإنجليزية\n• النصوص القصيرة والطويلة\n• الأسلوب الرسمي والودّي\n\n"
                  + "ما النص الذي تريد ترجمته؟"
                : "🌐 Translation service ready!\n\nI can translate between:\n"
                  + "• English ↔ Arabic\n• Short and long texts\n• Formal and casual\n\n"
                  + "What text would you like me to translate?";
        }

        if (msg.includes("?") || msg.includes("؟")) {
            return isArabic
                ? `سؤال مثير للاهتمام! 🤔 دعني أفكر... 💭 ${this.translate("ai.default")}`
                : `Interesting question! 🤔 Let me think... 💭 ${this.translate("ai.default")}`;
        }

        return this.translate("ai.default");
    }

    /**
     * Simulate thinking delay (0.8–2s), cancellable through an AbortSignal.
     */
    simulateDelay(signal) {
        return new Promise((resolve, reject) => {
            if (signal && signal.aborted) {
                reject(new DOMException("Aborted", "AbortError"));
                return;
            }
            const delay = 800 + Math.random() * 1200;
            const timer = setTimeout(() => {
                if (signal) signal.removeEventListener("abort", onAbort);
                resolve();
            }, delay);

            function onAbort() {
                clearTimeout(timer);
                reject(new DOMException("Aborted", "AbortError"));
            }

            if (signal) signal.addEventListener("abort", onAbort, { once: true });
        });
    }

    getHistory() {
        return this.conversationHistory.slice();
    }

    clearHistory() {
        this.conversationHistory = [];
        this.lastResponseKey = null;
    }

    /**
     * Creative reply for special cases. Templates resolve through i18n so they
     * follow the active language.
     */
    generateCreative(prompt) {
        const key = "ai.creative";
        const text = this.translate(key);
        if (text !== key) return text;
        // No template available: build a neutral line in the active language.
        const lang = (typeof window !== "undefined" && window.i18n && window.i18n.getLanguage)
            ? window.i18n.getLanguage() : "ar";
        return lang === "ar"
            ? `✨ بناءً على: "${prompt}"، إليك اقتراحي...`
            : `✨ Based on: "${prompt}", here's my suggestion...`;
    }
}

// Create the global instance only in a browser.
if (typeof window !== "undefined") {
    window.easyAI = new EasyAI();
}

// CommonJS export for the Node test suite.
if (typeof module === "object" && module.exports) {
    module.exports = { EasyAI };
}
