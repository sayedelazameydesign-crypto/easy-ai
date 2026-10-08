/**
 * Easy AI - AI Engine (Demo/Mock)
 * Simulates AI responses for demo purposes
 * In production, this would connect to a real AI API
 */


const FEATURE_CATALOG = Object.freeze({
    // Chat can move from demo to implemented only after /api/status confirms
    // that the server-side provider is configured.
    chat: { status: 'demo' },
    translate: Object.freeze({ status: 'unavailable' }),
    summarize: Object.freeze({ status: 'unavailable' }),
    code: Object.freeze({ status: 'unavailable' }),
    image: Object.freeze({ status: 'unavailable' }),
    voice: Object.freeze({ status: 'unavailable' })
});

function resolveFeatureActivation(tool, declaredStatus) {
    const runtimeStatus = FEATURE_CATALOG[tool]?.status;
    if (!runtimeStatus || runtimeStatus !== declaredStatus) {
        return Object.freeze({ allowed: false, reason: 'status_mismatch' });
    }
    if (runtimeStatus === 'unavailable') {
        return Object.freeze({ allowed: false, reason: 'unavailable' });
    }
    return Object.freeze({ allowed: true, reason: runtimeStatus });
}

class EasyAI {
    constructor(apiClient = null) {
        this.conversationHistory = [];
        this.isTyping = false;
        this.apiClient = apiClient || (typeof window !== 'undefined' && window.ChatApiClient
            ? new window.ChatApiClient() : null);
        this.mode = 'demo';
        
        // Response templates
        this.responses = {
            // Greetings
            greetings: [
                "ai.greeting",
                "ai.greeting"
            ],
            
            // Help
            help: ["ai.help"],
            
            // Jokes
            jokes: ["ai.joke", "ai.joke2"],
            
            // Facts
            facts: ["ai.fact", "ai.fact2"],
            
            // Thanks
            thanks: ["ai.thanks"],
            
            // Goodbye
            goodbye: ["ai.bye"],
            
            // Love/Kindness
            love: ["ai.love"],
            
            // Default
            default: ["ai.default"]
        };
    }
    
    async initializeBackend() {
        if (!this.apiClient) return 'demo';
        const status = await this.apiClient.status();
        if (status.status === 'ok' && status.chat === 'implemented') {
            this.mode = 'implemented';
            FEATURE_CATALOG.chat.status = 'implemented';
            return 'implemented';
        }
        this.mode = 'demo';
        FEATURE_CATALOG.chat.status = 'demo';
        return 'demo';
    }

    /**
     * Analyze message and determine intent
     */
    analyzeIntent(message) {
        const msg = message.toLowerCase().trim();
        const lang = window.i18n?.getLanguage() || 'ar';
        
        // Arabic patterns
        const arPatterns = {
            greeting: /^(مرحبا|اهلا|slam|hi|hello|hey|hii|هلا|peace|assalam)/i,
            help: /(ساعد|help|what can you|ماذا تستطيع|功能|できます)/i,
            joke: /(نكتة|joke|funny| laughed|笑话|dumpf)/i,
            fact: /(حقيقة|fact|did you know|هل تعلم|معلومة)/i,
            thanks: /(شكرا|thank|شكراً|thx)/i,
            goodbye: /(وداعا|bye|goodbye|مع السلامة|bay)/i,
            love: /(احبك|love you|i love|♥|❤|❤️)/i,
            code: /(code|كود|برمج|programming|js|python|html|css)/i,
            translate: /(ترجم|translate|ترجمة)/i,
            summarize: /(لخص|تلخيص|summarize|summary)/i,
            image: /(صورة|صور|image|photo)/i,
            voice: /(صوت|تسجيل|voice|audio|transcri)/i
        };
        
        // English patterns
        const enPatterns = {
            greeting: /^(hi|hello|hey|yo|sup|greetings)/i,
            help: /(help|what can you|功能|助けて)/i,
            joke: /(joke|funny|make me laugh|humor)/i,
            fact: /(fact|did you know|tell me something|trivia)/i,
            thanks: /(thank|thx|thanks|appreciate)/i,
            goodbye: /(bye|goodbye|see you|farewell|cya)/i,
            love: /(love you|i love|heart|❤️|♥)/i,
            code: /(code|programming|debug|function|javascript|python)/i,
            translate: /(translate|translation)/i,
            summarize: /(summarize|summary)/i,
            image: /(image|photo|picture)/i,
            voice: /(voice|audio|transcri)/i
        };
        
        const patterns = lang === 'ar' ? arPatterns : enPatterns;
        // Check unavailable capabilities first so generic words such as
        // "help" / "ساعدني" cannot route a tool request into demo chat.
        const intentOrder = [
            'translate', 'summarize', 'code', 'image', 'voice',
            'greeting', 'help', 'joke', 'fact', 'thanks', 'goodbye', 'love'
        ];
        
        for (const intent of intentOrder) {
            if (patterns[intent].test(msg)) {
                return intent;
            }
        }
        
        return 'default';
    }
    
    /**
     * Generate AI response
     */
    async generateResponse(userMessage) {
        const lang = window.i18n?.getLanguage() || 'ar';

        if (this.mode === 'implemented') {
            const messages = this.conversationHistory
                .slice(-19)
                .map(({ role, content }) => ({ role, content }));
            messages.push({ role: 'user', content: userMessage });
            const response = await this.apiClient.complete(messages);
            this.conversationHistory.push({ role: 'user', content: userMessage, timestamp: Date.now() });
            this.conversationHistory.push({ role: 'assistant', content: response, timestamp: Date.now() });
            return response;
        }

        const intent = this.analyzeIntent(userMessage);
        // Simulate thinking delay only in explicitly labeled demo mode.
        await this.simulateDelay();

        // Never simulate success for capabilities that are not connected.
        if (FEATURE_CATALOG[intent]?.status === 'unavailable') {
            const response = window.i18n?.t('feature.unavailable.notice') ||
                'This feature is currently unavailable.';
            this.conversationHistory.push({ role: 'user', content: userMessage, timestamp: Date.now() });
            this.conversationHistory.push({ role: 'assistant', content: response, timestamp: Date.now() });
            return response;
        }
        
        // Get response key
        const responseKeys = this.responses[intent] || this.responses.default;
        const randomKey = responseKeys[Math.floor(Math.random() * responseKeys.length)];
        
        // Get translated response
        let response = window.i18n?.t(randomKey) || randomKey;
        
        // Add context-aware responses
        if (intent === 'default') {
            response = this.generateContextualResponse(userMessage, lang);
        }
        
        // Store in history
        this.conversationHistory.push({
            role: 'user',
            content: userMessage,
            timestamp: Date.now()
        });
        this.conversationHistory.push({
            role: 'assistant',
            content: response,
            timestamp: Date.now()
        });
        
        return response;
    }
    
    /**
     * Generate contextual response for default cases
     */
    generateContextualResponse(message, lang) {
        const msg = message.toLowerCase();
        
        // Check for questions
        if (msg.includes('?') || msg.includes('؟')) {
            return lang === 'ar' 
                ? `سؤال مثير للاهتمام! 🤔 دعني أفكر... 💭 ${window.i18n.t('ai.default')}`
                : `Interesting question! 🤔 Let me think... 💭 ${window.i18n.t('ai.default')}`;
        }
        
        // Check for code-related
        if (/code|function|bug|error|كود|خطأ|برنامج/i.test(msg)) {
            return lang === 'ar'
                ? `💻 يبدو أنه سؤال برمجي! يمكنني مساعدتك في:
• كتابة شيفرة واضحة
• شرح الأخطاء
• مراجعة الشيفرة
• اقتراح تحسينات

ما اللغة البرمجية التي تحتاج إلى المساعدة فيها؟`
                : `💻 Looks like a coding question! I can help you with:
• Writing clean code
• Explaining errors
• Code review
• Improvement suggestions

What programming language do you need help with?`;
        }
        
        // Check for translation request
        if (/ترجم|translate/i.test(msg)) {
            return lang === 'ar'
                ? `🌐 خدمة الترجمة التجريبية جاهزة!

يمكنني مساعدتك في:
• العربية ↔ الإنجليزية
• النصوص القصيرة والطويلة
• الأسلوب الرسمي وغير الرسمي

ما النص الذي تريد ترجمته؟`
                : `🌐 Translation service ready! 

I can translate between:
• English ↔ العربية
• Short and long texts
• Formal and casual

What text would you like me to translate?`;
        }
        
        return window.i18n?.t('ai.default') || "Thanks for your message! How can I help?";
    }
    
    /**
     * Simulate AI thinking delay
     */
    simulateDelay() {
        return new Promise(resolve => {
            const delay = 800 + Math.random() * 1200; // 0.8-2 seconds
            setTimeout(resolve, delay);
        });
    }
    
    /**
     * Get conversation history
     */
    getHistory() {
        return this.conversationHistory;
    }
    
    /**
     * Clear conversation history
     */
    clearHistory() {
        this.conversationHistory = [];
    }
    
    /**
     * Generate a creative response (for special cases)
     */
    generateCreative(prompt) {
        const templates = {
            ar: [
                `✨ بناءً على: "${prompt}"، إليك اقتراحي...`,
                `🚀 فكرة رائعة! دعني أساعدك في: "${prompt}"`,
                `💡 بعد التفكير في "${prompt}"، إليك ما توصلت إليه...`
            ],
            en: [
                `✨ Based on: "${prompt}", here's my suggestion...`,
                `🚀 Great idea! Let me help you with: "${prompt}"`,
                `💡 After thinking about "${prompt}", here's what I found...`
            ]
        };
        
        const lang = window.i18n?.getLanguage() || 'ar';
        const langTemplates = templates[lang] || templates.en;
        return langTemplates[Math.floor(Math.random() * langTemplates.length)];
    }
}

// Create global AI instance
if (typeof window !== 'undefined') {
    window.easyAI = new EasyAI();
    window.easyAIFeatures = FEATURE_CATALOG;
    window.resolveFeatureActivation = resolveFeatureActivation;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EasyAI, FEATURE_CATALOG, resolveFeatureActivation };
}
