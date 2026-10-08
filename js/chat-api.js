/** Server-backed chat client. Never contains provider credentials. */
class ChatApiError extends Error {
    constructor(status) {
        super(status);
        this.name = 'ChatApiError';
        this.status = status;
    }
}

class ChatApiClient {
    async status() {
        try {
            const response = await fetch('/api/status', { headers: { Accept: 'application/json' } });
            if (!response.ok) return { status: 'not_configured', chat: 'unavailable' };
            return response.json();
        } catch (_) {
            return { status: 'not_configured', chat: 'unavailable' };
        }
    }

    async complete(messages) {
        let response;
        try {
            response = await fetch('/api/chat', {
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
