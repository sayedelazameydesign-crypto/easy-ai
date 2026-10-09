/**
 * Easy AI - Main Application Logic
 * UI interactions, chat, navigation and animations.
 *
 * Rules this file follows:
 *  - Chat text reaches the DOM through textContent/createElement only. The
 *    previous revision built messages with innerHTML + a hand-rolled escaper
 *    that did not escape quotes — safe in that one spot, but one attribute
 *    away from being an injection point.
 *  - Every reply is tied to a session id, so a reply that finishes after the
 *    user cleared (or reloaded) the conversation is dropped, not appended.
 *  - A reply in flight can be cancelled, and the button says so.
 *  - Unwired controls are marked disabled with an honest label rather than
 *    looking clickable and doing nothing.
 */

/* Shared chat controller state — `var` on purpose: a redeclaration anywhere
   else in the page would be a hard SyntaxError with let/const, and this file is
   loaded as a classic script alongside i18n.js and ai.js. */
/**
 * Access to the global object is guarded everywhere below: referencing a bare
 * `window` throws a ReferenceError outside a browser (e.g. the Node test
 * runner), and these helpers keep the exported utilities loadable anywhere.
 */
function getGlobal() {
    return typeof window !== 'undefined' ? window : null;
}

function getI18n() {
    const root = getGlobal();
    return root && root.i18n ? root.i18n : null;
}

function getAI() {
    const root = getGlobal();
    return root && root.easyAI ? root.easyAI : null;
}

var chatState = {
    store: null,
    session: 0,
    controller: null,
    elements: null,
    storageNoticeShown: false
};

// Guarded so this file can be required from Node for testing without a DOM.
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        initApp();
    });
}

function initApp() {
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

    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            const open = navLinks.classList.toggle('active');
            menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
    }

    // Update active nav link on scroll
    const sections = document.querySelectorAll('section[id]');
    const navLinkElements = document.querySelectorAll('.nav-link');

    const win = getGlobal();
    if (!win) return;

    win.addEventListener('scroll', () => {
        let current = '';

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            if (win.scrollY >= sectionTop - 200) {
                current = section.getAttribute('id');
            }
        });

        navLinkElements.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    }, { passive: true });
}

/* ============================================
   Language Toggle
   ============================================ */
function initLanguageToggle() {
    const langToggle = document.getElementById('langToggle');

    if (langToggle) {
        langToggle.addEventListener('click', () => {
            const i18n = getI18n();
            if (i18n) i18n.toggleLanguage();
            updateChatLanguage();
        });
    }

    // Listen for language changes
    document.addEventListener('languageChanged', (e) => {
        updateDynamicContent(e.detail.lang);
        retranslateMessages();
    });
}

function updateChatLanguage() {
    const chatInput = document.getElementById('chatInput');
    const i18n = getI18n();
    if (chatInput && i18n) {
        chatInput.placeholder = i18n.t('chat.placeholder');
    }
}

function updateDynamicContent() {
    const welcomeMsg = document.querySelector('.ai-message .message-content p');
    const i18n = getI18n();
    if (welcomeMsg && !welcomeMsg.hasAttribute('data-i18n') && i18n) {
        welcomeMsg.textContent = i18n.t('chat.welcome');
    }
}

/**
 * Re-render stored messages in the newly selected language.
 * Messages that carry a translation key follow the switch; plain user text and
 * free-form replies stay exactly as they were written.
 */
function retranslateMessages() {
    const i18n = getI18n();
    if (!chatState.elements || !i18n) return;
    const { chatMessages } = chatState.elements;
    if (!chatMessages) return;

    chatMessages.querySelectorAll('.message').forEach(node => {
        const key = node.getAttribute('data-i18n-key');
        if (!key) return;
        const textNode = node.querySelector('.message-content p');
        if (textNode) textNode.textContent = i18n.t(key);
    });
}

/* ============================================
   Chat
   ============================================ */
function initChat() {
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    const chatMessages = document.getElementById('chatMessages');
    const clearBtn = document.getElementById('clearChat');
    const suggestions = document.querySelectorAll('.suggestion-btn');

    if (!chatInput || !sendBtn || !chatMessages) return;

    chatState.elements = { chatInput, sendBtn, chatMessages, clearBtn };

    initChatStore();
    restoreMessages();

    // Auto-resize textarea
    chatInput.addEventListener('input', () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = Math.min(chatInput.scrollHeight, 150) + 'px';
    });

    // Enter sends, Shift+Enter adds a line
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Send — or cancel, while a reply is in flight
    sendBtn.addEventListener('click', () => {
        if (chatState.controller) {
            cancelReply();
        } else {
            sendMessage();
        }
    });

    if (clearBtn) {
        clearBtn.addEventListener('click', () => clearChat());
    }

    suggestions.forEach(btn => {
        btn.addEventListener('click', () => {
            handleSuggestion(btn.getAttribute('data-suggestion'));
        });
    });

    // Unwired tools: disabled and labelled, not silently dead.
    markUnimplemented('attachBtn', 'chat.attach');
    markUnimplemented('voiceBtn', 'chat.voice');
}

function markUnimplemented(id, labelKey) {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.disabled = true;
    btn.setAttribute('aria-disabled', 'true');
    applyLabel(btn, labelKey);
    btn.title = btn.getAttribute('aria-label') || '';
}

function applyLabel(node, key) {
    const i18n = getI18n();
    if (!i18n) return;
    const text = i18n.t(key);
    node.setAttribute('data-i18n-aria-label', key);
    node.setAttribute('aria-label', text);
}

/**
 * Persistence. When storage is blocked the chat still works — it just says so,
 * once, instead of implying the conversation was saved.
 */
function initChatStore() {
    if (typeof ChatStore === 'undefined' || !ChatStore) {
        chatState.store = null;
        return;
    }
    chatState.store = ChatStore.create();
    chatState.store.load();

    if (!chatState.store.isAvailable() && !chatState.storageNoticeShown) {
        chatState.storageNoticeShown = true;
        announce(getI18n() ? getI18n().t('chat.storageUnavailable') : '');
    }
}

function storeMessage(message) {
    if (!chatState.store) return null;
    return chatState.store.append(message);
}

function restoreMessages() {
    if (!chatState.store) return;
    const saved = chatState.store.all();
    if (!saved.length) return;

    saved.forEach(msg => {
        appendMessageNode(msg.role, msg.text, msg.ts, msg.key);
    });
    announce(getI18n() ? getI18n().t('chat.restored') : '');
}

function sendMessage() {
    const { chatInput } = chatState.elements;
    const message = chatInput.value.trim();
    if (!message) return;
    if (chatState.controller) return;    // one reply at a time

    addMessage(message, 'user');

    chatInput.value = '';
    chatInput.style.height = 'auto';

    showTypingIndicator();
    hideSuggestions();
    setPending(true);

    // A new session invalidates any reply still in flight from before.
    chatState.session += 1;
    const session = chatState.session;
    const controller = new AbortController();
    chatState.controller = controller;

    const ai = getAI();
    const work = ai
        ? ai.generateResponse(message, { signal: controller.signal })
        : Promise.reject(new Error('engine unavailable'));

    work
        .then(response => {
            if (session !== chatState.session) return;      // stale: dropped
            hideTypingIndicator();
            addMessage(response, 'ai', responseKeyFor(ai));
            showSuggestions();
        })
        .catch(error => {
            // A stale session means the user cancelled or cleared: cancelReply()
            // and clearChat() already told them what happened.
            if (session !== chatState.session) return;
            hideTypingIndicator();
            addMessage(translate('chat.error'), 'ai', 'chat.error', { persist: false });
            console.error('AI Error:', error);
            showSuggestions();
        })
        .finally(() => {
            if (session === chatState.session) {
                chatState.controller = null;
                setPending(false);
            }
        });
}

/**
 * The template key behind the reply that was just produced, so the stored
 * message can follow a later language switch. Free-form and contextual replies
 * have no key and are stored as plain text.
 */
function responseKeyFor(ai) {
    if (!ai) return null;
    const key = ai.lastResponseKey;
    return typeof key === 'string' && key ? key : null;
}

/**
 * Stop the reply in flight.
 *
 * Bumping the session makes the abandoned promise stale, so its catch handler
 * returns without rendering anything — which means the "stopped" line has to be
 * written here, by the action the user actually took. Otherwise cancelling
 * would silently swallow the reply and leave no trace at all.
 */
function cancelReply() {
    if (!chatState.controller) return;
    chatState.controller.abort();
    chatState.controller = null;
    chatState.session += 1;              // any in-flight reply is now stale
    hideTypingIndicator();
    setPending(false);
    addMessage(translate('chat.cancelled'), 'ai', 'chat.cancelled', { persist: false });
    showSuggestions();
}

/**
 * Switch the send button between "send" and "stop" while a reply is pending.
 */
function setPending(pending) {
    const { sendBtn } = chatState.elements || {};
    if (!sendBtn) return;
    sendBtn.classList.toggle('is-stop', pending);
    sendBtn.setAttribute('aria-label', translate(pending ? 'chat.stop' : 'chat.send'));
    sendBtn.setAttribute('data-i18n-aria-label', pending ? 'chat.stop' : 'chat.send');
    const icon = sendBtn.querySelector('.send-icon');
    if (icon) icon.textContent = pending ? '■' : '➤';
}

function translate(key) {
    const i18n = getI18n();
    return i18n ? i18n.t(key) : key;
}

/**
 * Add a message to the view and (unless told not to) to persistent storage.
 */
function addMessage(text, sender, i18nKey, options) {
    const opts = options || {};
    const ts = Date.now();

    if (opts.persist === false) {
        appendMessageNode(sender, text, ts, i18nKey);
        return;
    }

    // Store first, then render the stored record: what the user sees and what
    // survives a reload must be the same text, including any truncation.
    const stored = storeMessage({
        role: sender === 'user' ? 'user' : 'ai', text, key: i18nKey, ts
    });
    appendMessageNode(sender, stored ? stored.text : text, stored ? stored.ts : ts, i18nKey);
    if (stored && stored.truncated) announce(translate('chat.truncated'));
}

/**
 * Build a message node with DOM APIs only — no innerHTML, no string escaping
 * to get wrong. Multi-line replies keep their line breaks via CSS white-space.
 */
function appendMessageNode(sender, text, ts, i18nKey) {
    const { chatMessages } = chatState.elements || {};
    if (!chatMessages) return null;

    const isUser = sender === 'user';
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user' : 'ai'}-message fade-in`;
    if (i18nKey) messageDiv.setAttribute('data-i18n-key', i18nKey);

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.setAttribute('aria-hidden', 'true');
    avatar.textContent = isUser ? '👤' : '🤖';

    const content = document.createElement('div');
    content.className = 'message-content';

    const paragraph = document.createElement('p');
    const i18n = getI18n();
    paragraph.textContent = i18nKey && i18n
        ? i18n.t(i18nKey)
        : String(text == null ? '' : text);

    const time = document.createElement('span');
    time.className = 'message-time';
    time.textContent = formatTime(ts);

    content.appendChild(paragraph);
    content.appendChild(time);
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
    return messageDiv;
}

/** Push a transient status line to the aria-live region (never to the log). */
function announce(text) {
    if (!text) return;
    const live = document.getElementById('chatLive');
    if (live) live.textContent = text;
}

function showTypingIndicator() {
    const { chatMessages } = chatState.elements || {};
    if (!chatMessages || document.getElementById('typingIndicator')) return;

    const typingDiv = document.createElement('div');
    typingDiv.className = 'message ai-message typing-message';
    typingDiv.id = 'typingIndicator';

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.setAttribute('aria-hidden', 'true');
    avatar.textContent = '🤖';

    const content = document.createElement('div');
    content.className = 'message-content';

    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    for (let i = 0; i < 3; i++) {
        const dot = document.createElement('span');
        dot.className = 'typing-dot';
        indicator.appendChild(dot);
    }
    const label = document.createElement('span');
    label.className = 'sr-only';
    label.textContent = translate('chat.typing');

    content.appendChild(indicator);
    content.appendChild(label);
    typingDiv.appendChild(avatar);
    typingDiv.appendChild(content);
    chatMessages.appendChild(typingDiv);
    scrollToBottom();
}

function hideTypingIndicator() {
    const typing = document.getElementById('typingIndicator');
    if (typing) typing.remove();
}

function hideSuggestions() {
    const container = document.getElementById('chatSuggestions');
    if (container) container.style.display = 'none';
}

function showSuggestions() {
    const container = document.getElementById('chatSuggestions');
    if (container) container.style.display = 'flex';
}

function clearChat() {
    const { chatMessages } = chatState.elements || {};
    if (!chatMessages) return;

    // Cancelling first means no reply can land in the cleared conversation.
    cancelReply();

    const messages = chatMessages.querySelectorAll('.message');
    messages.forEach((msg, index) => {
        if (index > 0) msg.remove();     // keep the welcome message
    });

    if (getAI()) getAI().clearHistory();
    if (chatState.store) chatState.store.clear();
    chatState.storageNoticeShown = false;
    if (chatState.store && !chatState.store.isAvailable()) {
        chatState.storageNoticeShown = true;
    }

    showSuggestions();
    announce(translate('chat.cleared'));
}

function scrollToBottom() {
    const { chatMessages } = chatState.elements || {};
    if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
}

function handleSuggestion(type) {
    const i18n = getI18n();
    const lang = i18n ? i18n.getLanguage() : 'ar';
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

    const table = suggestionTexts[lang] || suggestionTexts.en;
    const { chatInput } = chatState.elements;
    chatInput.value = table[type] || suggestionTexts.en[type] || '';
    sendMessage();
}

/* ============================================
   Feature Cards
   ============================================ */
function initFeatureCards() {
    const cards = document.querySelectorAll('.feature-card');

    cards.forEach(card => {
        card.addEventListener('click', () => {
            const tool = card.getAttribute('data-tool');
            scrollToChat();

            const chatInput = document.getElementById('chatInput');
            if (!chatInput) return;

            const i18n = getI18n();
    const lang = i18n ? i18n.getLanguage() : 'ar';
            const prompts = {
                ar: {
                    chat: 'مرحبا! 👋',
                    translate: 'ترجم: Hello World',
                    summarize: 'لخص هذا النص: ...',
                    code: 'ساعدني في كتابة كود...',
                    image: 'صف هذه الصورة...',
                    voice: 'حول هذا الصوت إلى نص...'
                },
                en: {
                    chat: 'Hello! 👋',
                    translate: 'Translate: مرحبا بالعالم',
                    summarize: 'Summarize this text: ...',
                    code: 'Help me write code...',
                    image: 'Describe this image...',
                    voice: 'Convert this audio to text...'
                }
            };

            const table = prompts[lang] || prompts.en;
            chatInput.value = table[tool] || prompts.en[tool] || '';
            chatInput.focus();
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
    if (typeof IntersectionObserver === 'undefined') return;

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

    const animatedElements = document.querySelectorAll(
        '.feature-card, .section-header, .chat-container, .about-content, .about-visual');
    animatedElements.forEach(el => observer.observe(el));
}

/* ============================================
   Smooth Scroll
   ============================================ */
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (!href || href === '#') return;
            const target = document.querySelector(href);
            if (!target) return;
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });
}

/* ============================================
   Utilities
   ============================================ */
function formatTime(ts) {
    const i18n = getI18n();
    const lang = i18n ? i18n.getLanguage() : 'ar';
    const date = typeof ts === 'number' && ts > 0 ? new Date(ts) : new Date();
    const locale = lang === 'ar' ? 'ar-EG' : 'en-US';
    try {
        return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    } catch (err) {
        return date.toTimeString().slice(0, 5);
    }
}

/* ============================================
   Keyboard Shortcuts
   ============================================ */
/**
 * Decide whether a key event belongs to the app.
 *
 * Ctrl/Cmd+L is deliberately NOT claimed: it focuses the browser's address bar
 * (and opens the AI sidebar in some browsers), and the previous revision called
 * preventDefault() on it, stealing a browser-level shortcut from the user.
 * Language toggle moves to Ctrl/Cmd+Shift+L.
 */
function isAppShortcut(event) {
    if (!event || typeof event.key !== 'string') return null;
    const mod = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();

    if (event.key === 'Escape') return 'cancel';
    if (!mod) return null;
    if (key === 'k' && !event.shiftKey && !event.altKey) return 'focus-chat';
    if (key === 'l' && event.shiftKey && !event.altKey) return 'toggle-language';
    return null;
}

if (typeof document !== 'undefined') {
    document.addEventListener('keydown', handleGlobalKeydown);
}

function handleGlobalKeydown(e) {
    const action = isAppShortcut(e);
    if (!action) return;

    if (action === 'cancel') {
        // Only claim Escape while a reply is actually in flight.
        if (!chatState.controller) return;
        e.preventDefault();
        cancelReply();
        return;
    }

    e.preventDefault();
    if (action === 'focus-chat') {
        const chatInput = document.getElementById('chatInput');
        if (chatInput) {
            chatInput.focus();
            scrollToChat();
        }
    } else if (action === 'toggle-language') {
        const i18n = getI18n();
            if (i18n) i18n.toggleLanguage();
        updateChatLanguage();
    }
}

/* ============================================
   Console banner
   ============================================ */
(function logBanner() {
    if (typeof document === 'undefined') return;
    const holder = document.body || document.documentElement;
    const version = (holder && holder.getAttribute('data-app-version')) || 'dev';
    console.log(`
🤖 %cEasy AI %cv${version}
%c✨ AI made easy for everyone
%c🌐 Supports Arabic & English
%c🧪 Chat is a local demo — no provider is connected
%c⭐ GitHub: https://github.com/sayedelazameydesign-crypto/easy-ai

%cKeyboard shortcuts:
  Ctrl/Cmd + K        →  Focus chat
  Ctrl/Cmd + Shift + L →  Toggle language
  Escape              →  Cancel the reply in flight
`,
        'font-size: 24px; font-weight: bold; background: linear-gradient(135deg, #6366f1, #8b5cf6); -webkit-background-clip: text; color: transparent;',
        'font-size: 12px; color: #8b5cf6;',
        'font-size: 14px; color: #a0a0b0;',
        'font-size: 12px; color: #6b6b7b;',
        'font-size: 12px; color: #ffc857;',
        'font-size: 12px; color: #6366f1;',
        'font-size: 11px; color: #6b6b7b;'
    );
})();

// CommonJS export for the Node test suite (no DOM touched at load time).
if (typeof module === 'object' && module.exports) {
    module.exports = { isAppShortcut, formatTime };
}
