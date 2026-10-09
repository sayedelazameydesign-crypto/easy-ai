/** Server-backed chat client. Never contains provider credentials. */
class ChatApiError extends Error {
    constructor(status) {
        super(status);
        this.name = 'ChatApiError';
        this.status = status;
    }
}

class ChatApiClient {
    constructor(baseUrl = '') {
        this.baseUrl = ChatApiClient.normalizeBaseUrl(baseUrl);
    }

    static normalizeBaseUrl(value) {
        if (!value) return '';
        const url = new URL(value, window.location.href);
        if (url.origin !== window.location.origin && url.protocol !== 'https:') {
            throw new Error('Cross-origin AI API must use HTTPS');
        }
        return url.href.replace(/\/$/, '');
    }

    async status() {
        try {
            const response = await fetch(`${this.baseUrl}/api/status`, { headers: { Accept: 'application/json' } });
            if (!response.ok) return { status: 'not_configured', chat: 'unavailable' };
            return response.json();
        } catch (_) {
            return { status: 'not_configured', chat: 'unavailable' };
        }
    }

    async complete(messages) {
        let response;
        try {
            response = await fetch(`${this.baseUrl}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({ messages })
            });
        } catch (_) {
            throw new ChatApiError('provider_error');
        }
        let payload = {};
        try { payload = await response.json(); } catch (_) { /* safe generic error below */ }
        if (!response.ok || payload.status !== 'ok' || typeof payload.reply !== 'string') {
            throw new ChatApiError(payload.status || 'provider_error');
        }
        return payload.reply;
    }
}

if (typeof window !== 'undefined') {
    window.ChatApiClient = ChatApiClient;
    window.ChatApiError = ChatApiError;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ChatApiClient, ChatApiError };
}
