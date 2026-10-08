# AI backend design (P1-B)

## Scope and deployment decision

P1-B adds one server-side text-chat API. It does not add tools, autonomous agents,
image analysis, speech, translation, or summarization. Static GitHub Pages remains
an explicitly labelled demo because Pages cannot run this Python backend.

The implemented adapter targets OpenAI's HTTPS chat-completions endpoint on a fixed
host. Production activation is **not approved by this change**. A real response is
only possible when an operator deliberately runs the backend with server-side
configuration.

## Provider and hosting review

Reviewed on 2026-10-08. Official SDK/repository documentation confirms that all
candidate APIs require server-side credentials, but current pricing, free-tier,
card, and regional eligibility could not be independently verified from the
restricted development environment. Consequently, this project makes no claim of
free or zero-cost operation and enables no hosted provider by default.

| Option | Applicability | Billing/free-tier decision | Operational risk |
|---|---|---|---|
| OpenAI API | Implemented as the single adapter; fixed official API host | Requires operator verification and an explicit spending limit before production | Quota, billing, model lifecycle, and provider outage |
| Google Gemini API | Technically viable, but would require a second adapter | Not adopted; current eligibility and billing must be checked first | Quota and regional availability changes |
| Groq API | Technically viable, but would require a second adapter | Not adopted; current free limits and production terms must be checked first | Free-tier exhaustion and model availability |

Hosting comparison:

| Host type | Result |
|---|---|
| GitHub Pages | Frontend only; cannot host `/api/chat` |
| Local Python process | Supported and testable; recommended for P1-B verification |
| Managed container/function | Possible later, but no platform is selected because public abuse controls, pricing, persistence for distributed rate limiting, and billing were not verified |

Before any production deployment, an operator must review the provider's current
official pricing and terms, configure a provider-side hard spending/quota limit,
and add an upstream authenticated gateway or equivalent abuse protection. The
in-memory limiter is defense-in-depth for one process, not protection for a public,
distributed deployment.

## API contract

`GET /api/status` returns:

```json
{"status":"ok","chat":"implemented"}
```

or `not_configured` when no server provider is active.

`POST /api/chat` accepts only:

```json
{"messages":[{"role":"user","content":"Hello"}]}
```

Roles are limited to `user` and `assistant`. The final message must be from the
user. Unknown fields, oversized bodies, excessive history, and invalid types are
rejected.

Success returns `{"status":"ok","reply":"..."}`. Safe failure statuses are:

- `not_configured`
- `invalid_request`
- `rate_limited`
- `provider_timeout`
- `provider_error`

Provider response bodies, credentials, and internal exception text are never
returned. Request content is not logged by the development server.

## Configuration

All values are server-side environment variables:

| Variable | Purpose |
|---|---|
| `AI_PROVIDER` | Must be `openai` for the implemented adapter |
| `AI_MODEL` | Operator-selected model identifier |
| `AI_API_KEY` | Server-only provider credential |
| `AI_ALLOWED_ORIGINS` | Comma-separated exact browser origins |
| `AI_TIMEOUT_SECONDS` | Provider timeout, default 20 seconds |
| `AI_RATE_LIMIT_REQUESTS` | Per-process/IP requests per minute, default 20 |

No provider URL can be supplied by a browser request. The adapter endpoint is fixed
in server code to prevent SSRF or arbitrary proxying. The adapter sends a bounded
`max_completion_tokens` value as well as enforcing the response character limit.

## Frontend/backend origins

The browser uses same-origin `/api` by default. If a future deployment puts the
backend on another origin, set the reviewed public HTTPS origin in the static page:

```html
<meta name="easy-ai-api-base" content="https://api.example.com">
```

The client rejects a cross-origin HTTP URL. Configure `AI_ALLOWED_ORIGINS` on the
backend with the exact HTTPS frontend origin (no wildcard). A configured allowlist
requires an `Origin` header and supports a restricted CORS preflight. This is only
browser access policy: it is not authentication. A public deployment still needs
an authenticated reverse proxy/API gateway, distributed rate limiting, quotas,
and abuse monitoring. TLS must terminate at a trusted proxy or managed host, and
`AI_API_KEY` must be supplied from that host's secret manager rather than a file in
the web root.

The development server deliberately uses the socket peer address and ignores
`X-Forwarded-For`. A future trusted proxy deployment must define and test an
explicit trusted-proxy policy before using forwarded addresses for rate limiting.

## Local operation

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
export AI_PROVIDER=openai
export AI_MODEL='operator-reviewed-model-id'
export AI_API_KEY='server-side-only'
export AI_ALLOWED_ORIGINS='http://localhost:8000'
.venv/bin/python -m backend --host 127.0.0.1 --port 8000
```

Without these settings the API reports `not_configured`, while the frontend stays
in its visibly labelled demo mode. It never presents preset responses as provider
output.

## Security limits

- 20 messages per conversation by default.
- 4,000 characters per message and 12,000 total input characters.
- 8,000 output characters.
- 64 KiB HTTP body cap.
- Fixed provider endpoint and network timeout.
- Exact-origin CORS allowlist; when configured, missing and mismatched origins are rejected.
- CORS is not treated as authentication or protection for non-browser clients.
- In-memory, per-process/socket-peer-IP sliding-window rate limit; forwarded IP headers are ignored.
- No body or credential logging by default.

The local limiter resets on restart and does not coordinate multiple instances.
Therefore this implementation must not be exposed as an unlimited public API.
