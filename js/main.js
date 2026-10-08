/**
 * Easy AI - Main Application Logic
 * Handles UI interactions, chat, navigation, and animations
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize app
    initApp();
});

function initApp() {
    window.easyAI.initializeBackend().then(updateChatCapability).catch(() => updateChatCapability('demo'));
    initNavigation();
    initLanguageToggle();
    initChat();
    initFeatureCards();
    initScrollAnimations();
    initSmoothScroll();
}

/* ============================================
   Navigation
   ============================================ */
function initNavigation() {
    const menuToggle = document.getElementById('menuToggle');
    const navLinks = document.querySelector('.nav-links');
    
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }
    
    // Update active nav link on scroll
    const sections = document.querySelectorAll('section[id]');
    const navLinkElements = document.querySelectorAll('.nav-link');
    
    window.addEventListener('scroll', () => {
        let current = '';
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            
            if (window.scrollY >= sectionTop - 200) {
                current = section.getAttribute('id');
            }
        });
        
        navLinkElements.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    });
}

/* ============================================
   Language Toggle
   ============================================ */
function initLanguageToggle() {
    const langToggle = document.getElementById('langToggle');
    
    if (langToggle) {
        langToggle.addEventListener('click', () => {
            window.i18n.toggleLanguage();
            updateChatLanguage();
        });
    }
    
    // Listen for language changes
    document.addEventListener('languageChanged', (e) => {
        updateDynamicContent(e.detail.lang);
    });
}

function updateChatCapability(mode) {
    const card = document.querySelector('.feature-card[data-tool="chat"]');
    if (!card) return;
    card.dataset.status = mode;
    const badge = card.querySelector('.feature-status');
    if (badge) {
        badge.className = `feature-status status-${mode}`;
        badge.setAttribute('data-i18n', `status.${mode}`);
        badge.textContent = window.i18n.t(`status.${mode}`);
    }
    const chatStatus = document.querySelector('.chat-status [data-i18n]');
    if (chatStatus && mode === 'implemented') {
        chatStatus.setAttribute('data-i18n', 'chat.connected');
        chatStatus.textContent = window.i18n.t('chat.connected');
    }
}

function updateChatLanguage() {
    // Update chat placeholder
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.placeholder = window.i18n.t('chat.placeholder');
    }
}

function updateDynamicContent(lang) {
    // Update any dynamically added content
    const welcomeMsg = document.querySelector('.ai-message .message-content p');
    if (welcomeMsg && !welcomeMsg.hasAttribute('data-i18n')) {
        welcomeMsg.textContent = window.i18n.t('chat.welcome');
    }
}

/* ============================================
   Chat Functionality
   ============================================ */
function initChat() {
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    const chatMessages = document.getElementById('chatMessages');
    const clearBtn = document.getElementById('clearChat');
    const suggestions = document.querySelectorAll('.suggestion-btn');
    let requestInFlight = false;
    
    if (!chatInput || !sendBtn) return;
    
    // Auto-resize textarea
    chatInput.addEventListener('input', () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = Math.min(chatInput.scrollHeight, 150) + 'px';
    });
    
    // Send message on Enter (Shift+Enter for new line)
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Send button click
    sendBtn.addEventListener('click', sendMessage);
    
    // Clear chat
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            clearChat();
        });
    }
    
    // Suggestion buttons
    suggestions.forEach(btn => {
        btn.addEventListener('click', () => {
            const suggestion = btn.getAttribute('data-suggestion');
            handleSuggestion(suggestion);
        });
    });
    
    function sendMessage() {
        const message = chatInput.value.trim();
        if (!message || requestInFlight) return;
        requestInFlight = true;
        sendBtn.disabled = true;
        
        // Add user message
        addMessage(message, 'user');
        
        // Clear input
        chatInput.value = '';
        chatInput.style.height = 'auto';
        
        // Show typing indicator
        showTypingIndicator();
        
        // Hide suggestions
        hideSuggestions();
        
        // Generate AI response
        window.easyAI.generateResponse(message)
            .then(response => {
                hideTypingIndicator();
                addMessage(response, 'ai');
                showSuggestions();
            })
            .catch(error => {
                hideTypingIndicator();
                const status = error?.status;
                const key = ['rate_limited', 'provider_timeout', 'not_configured'].includes(status)
                    ? `chat.error.${status}` : 'chat.error.provider_error';
                addMessage(window.i18n.t(key), 'ai');
                console.error('AI request failed:', status || 'provider_error');
            })
            .finally(() => {
                requestInFlight = false;
                sendBtn.disabled = false;
            });
    }
    
    function addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message fade-in`;
        
        const avatar = sender === 'user' ? '👤' : '🤖';
        const time = getCurrentTime();
        
        messageDiv.innerHTML = `
            <div class="message-avatar">${avatar}</div>
            <div class="message-content">
                <p>${escapeHtml(text)}</p>
                <span class="message-time">${time}</span>
            </div>
        `;
        
        chatMessages.appendChild(messageDiv);
        scrollToBottom();
    }
    
    function showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message ai-message typing-message';
        typingDiv.id = 'typingIndicator';
        typingDiv.innerHTML = `
            <div class="message-avatar">🤖</div>
            <div class="message-content">
                <div class="typing-indicator">
                    <span class="typing-dot"></span>
                    <span class="typing-dot"></span>
                    <span class="typing-dot"></span>
                </div>
            </div>
        `;
        
        chatMessages.appendChild(typingDiv);
        scrollToBottom();
    }
    
    function hideTypingIndicator() {
        const typing = document.getElementById('typingIndicator');
        if (typing) {
            typing.remove();
        }
    }
    
    function hideSuggestions() {
        const suggestionsContainer = document.getElementById('chatSuggestions');
        if (suggestionsContainer) {
            suggestionsContainer.style.display = 'none';
        }
    }
    
    function showSuggestions() {
        const suggestionsContainer = document.getElementById('chatSuggestions');
        if (suggestionsContainer) {
            suggestionsContainer.style.display = 'flex';
        }
    }
    
    function clearChat() {
        // Keep only the welcome message
        const messages = chatMessages.querySelectorAll('.message');
        messages.forEach((msg, index) => {
            if (index > 0) {
                msg.remove();
            }
        });
        window.easyAI.clearHistory();
        showSuggestions();
    }
    
    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    function handleSuggestion(type) {
        const lang = window.i18n.getLanguage();
        const suggestionTexts = {
            ar: {
                hello: 'مرحبا! 👋',
                help: 'ما الذي يمكنك فعله؟',
                joke: 'أخبرني نكتة 😄',
                fact: 'أخبرني حقيقة ممتعة 🧠'
            },
            en: {
                hello: 'Hello! 👋',
                help: 'What can you do?',
                joke: 'Tell me a joke 😄',
                fact: 'Tell me a fun fact 🧠'
            }
        };
        
        const text = suggestionTexts[lang][type] || suggestionTexts.en[type];
        chatInput.value = text;
        sendMessage();
    }
}

/* ============================================
   Feature Cards
   ============================================ */
function initFeatureCards() {
    const cards = document.querySelectorAll('.feature-card');

    cards.forEach(card => {
        card.addEventListener('click', () => {
            const tool = card.getAttribute('data-tool');
            const declaredStatus = card.getAttribute('data-status');
            const activation = window.resolveFeatureActivation(tool, declaredStatus);

            // Fail closed if markup and runtime capability metadata disagree.
            if (activation.reason === 'status_mismatch') {
                console.error(`Feature status mismatch: ${tool}`);
                return;
            }

            scrollToChat();
            if (activation.reason === 'unavailable') {
                const chatInput = document.getElementById('chatInput');
                if (chatInput) {
                    chatInput.value = window.i18n.t('feature.unavailable.notice');
                    chatInput.focus();
                }
                return;
            }

            // Chat is a declared demo; prefill a harmless demo greeting.
            const chatInput = document.getElementById('chatInput');
            if (chatInput) {
                chatInput.value = window.i18n.getLanguage() === 'ar' ? 'مرحبًا! 👋' : 'Hello! 👋';
                chatInput.focus();
            }
        });
    });
}

function scrollToChat() {
    const chatSection = document.getElementById('chat');
    if (chatSection) {
        chatSection.scrollIntoView({ behavior: 'smooth' });
    }
}

/* ============================================
   Scroll Animations
   ============================================ */
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // Observe elements for animation
    const animatedElements = document.querySelectorAll('.feature-card, .section-header, .chat-container, .about-content, .about-visual');
    animatedElements.forEach(el => {
        observer.observe(el);
    });
}

/* ============================================
   Smooth Scroll
   ============================================ */
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

/* ============================================
   Utility Functions
   ============================================ */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getCurrentTime() {
    const lang = window.i18n?.getLanguage() || 'ar';
    const now = new Date();
    
    if (lang === 'ar') {
        return now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    } else {
        return now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
}

/* ============================================
   Keyboard Shortcuts
   ============================================ */
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + K to focus chat
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const chatInput = document.getElementById('chatInput');
        if (chatInput) {
            chatInput.focus();
            scrollToChat();
        }
    }
    
    // Ctrl/Cmd + L to toggle language
    if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
        e.preventDefault();
        window.i18n.toggleLanguage();
    }
});

/* ============================================
   Console Easter Egg
   ============================================ */
console.log(`
🤖 %cEasy AI %cv1.0.0
%c✨ AI made easy for everyone
%c🌐 Supports Arabic & English
%c⭐ GitHub: https://github.com/sayedelazameydesign-crypto/easy-ai

%cKeyboard Shortcuts:
  Ctrl/Cmd + K  →  Focus chat
  Ctrl/Cmd + L  →  Toggle language
`,
    'font-size: 24px; font-weight: bold; background: linear-gradient(135deg, #6366f1, #8b5cf6); -webkit-background-clip: text; color: transparent;',
    'font-size: 12px; color: #8b5cf6;',
    'font-size: 14px; color: #a0a0b0;',
    'font-size: 12px; color: #6b6b7b;',
    'font-size: 12px; color: #6366f1;',
    'font-size: 11px; color: #6b6b7b;'
);
