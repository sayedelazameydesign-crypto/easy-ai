"""easy-ai — قناة المزامنة الآمنة / secure sync channel.

    Google Drive ──TLS/OAuth2──▶ GitHub Actions (hourly)
        ──▶ redact (المُحمِّر) ──▶ vault/ (AES-256-GCM) + data/ (sanitized JSON/MD)
        ──▶ integrity scan (بوابة) ──▶ commit ──▶ GitHub Pages (public dashboard)

Design rules inherited from the owner integrations gateway:
* A secret is never printed, never serialized, never committed.
* Half-configured credentials are "not configured" — never attempted.
* Every outbound message passes through the redactor built from the secrets.
* Honest display: the dashboard says "متزامن" only when the manifest says so;
  otherwise "غير معروف" — never a fabricated "جاهز".
"""

__version__ = "1.0.0"
