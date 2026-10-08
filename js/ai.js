/**
 * Easy AI - AI Engine (Demo/Mock)
 * Simulates AI responses for demo purposes
 * In production, this would connect to a real AI API
 */

class EasyAI {
    constructor() {
        this.conversationHistory = [];
        this.isTyping = false;
        
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
            translate: /(ترجم|translate|ترجمة)/i
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
            translate: /(translate|translation)/i
        };
        
        const patterns = lang === 'ar' ? arPatterns : enPatterns;
        
        for (const [intent, pattern] of Object.entries(patterns)) {
            if (pattern.test(msg)) {
                return intent;
            }
        }
        
        return 'default';
    }
    
    /**
     * Generate AI response
     */
    async generateResponse(userMessage) {
        const intent = this.analyzeIntent(userMessage);
        const lang = window.i18n?.getLanguage() || 'ar';
        
        // Simulate thinking delay
        await this.simulateDelay();
        
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
                ? `سؤال interesante! 🤔 دعني أفكر... 💭 ${window.i18n.t('ai.default')}`
                : `Interesting question! 🤔 Let me think... 💭 ${window.i18n.t('ai.default')}`;
        }
        
        // Check for code-related
        if (/code|function|bug|error|كود|خطأ|برنامج/i.test(msg)) {
            return lang === 'ar'
                ? `💻 seems like سؤال برمجي! يمكنني مساعدتك في:
• كتابة كود clean
• explicar الأخطاء
• Code review
• suggestions تحسين

ما اللغة البرمجية التي need?`
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
                ? `🌐 خدمة الترجمة جاهزة! 

可以ني الترجمة بين:
• العربية ↔ English
• نصوص قصيرة وطويلة
• fonctionnaires

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
                `💡 после thinking في "${prompt}"، here's ما trouvéته...`
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
}
