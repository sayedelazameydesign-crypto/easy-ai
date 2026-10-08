"""المُحمِّر / the redactor — nothing leaves the process without passing it.

Same philosophy as ``backend/integrations/redact.py`` in the owner gateway:
the redactor is built from the *actual secret values* present in the
environment (exact-match scrubbing), plus pattern-based scrubbing for tokens,
keys, contact data and cards that may appear inside synced documents.
"""
from __future__ import annotations

import re
from typing import Any, Iterable

REDACTED = "[REDACTED:{kind}]"


def _luhn_ok(digits: str) -> bool:
    total, alt = 0, False
    for ch in reversed(digits):
        d = ord(ch) - 48
        if alt:
            d *= 2
            if d > 9:
                d -= 9
        total += d
        alt = not alt
    return total % 10 == 0


_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("PRIVKEY", re.compile(
        r"-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----")),
    ("JWT", re.compile(r"\beyJ[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]{8,}\b")),
    ("TOKEN", re.compile(
        r"\b(?:gh[pousr]_[A-Za-z0-9]{30,}"
        r"|github_pat_[A-Za-z0-9_]{20,}"
        r"|sk-[A-Za-z0-9_\-]{16,}"
        r"|secret_[A-Za-z0-9]{20,}"
        r"|xox[baprs]-[A-Za-z0-9\-]{10,}"
        r"|AIza[A-Za-z0-9_\-]{30,}"
        r"|AKIA[0-9A-Z]{16}"
        r"|ya29\.[A-Za-z0-9_\-]{20,}"
        r"|1//0[A-Za-z0-9_\-]{20,})\b")),
    ("BEARER", re.compile(r"(?i)\bbearer\s+[A-Za-z0-9._~+/\-]{16,}=*")),
    ("EMAIL", re.compile(r"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b")),
    ("PHONE", re.compile(r"(?<![\w.])\+\d[\d\s().\-]{8,17}\d(?![\w.])")),
]

_CARD = re.compile(r"(?<!\d)(?:\d[ \-]?){12,18}\d(?!\d)")


class Redactor:
    """Scrubs secrets and sensitive data from any text/structure.

    ``secret_values``: the exact values of every secret in the environment
    (from :func:`sync.config.collect_secret_values`). They are matched
    verbatim and replaced with ``[REDACTED:SECRET]``.
    """

    def __init__(self, secret_values: Iterable[str] = (),
                 extra_patterns: dict[str, str] | None = None):
        self._exact = [re.compile(re.escape(v)) for v in secret_values if v and len(v) >= 8]
        self._patterns = list(_PATTERNS)
        for name, pat in (extra_patterns or {}).items():
            self._patterns.append((name.upper(), re.compile(pat)))
        self.total = 0

    # -- text -------------------------------------------------------------
    def redact_text(self, text: str) -> tuple[str, int]:
        count = 0
        for pat in self._exact:
            text, n = pat.subn(REDACTED.format(kind="SECRET"), text)
            count += n
        for kind, pat in self._patterns:
            text, n = pat.subn(REDACTED.format(kind=kind), text)
            count += n

        def _card(m: re.Match[str]) -> str:
            nonlocal count
            digits = re.sub(r"\D", "", m.group(0))
            if 13 <= len(digits) <= 19 and _luhn_ok(digits):
                count += 1
                return REDACTED.format(kind="CARD")
            return m.group(0)

        text = _CARD.sub(_card, text)
        self.total += count
        return text, count

    # -- structures -------------------------------------------------------
    def redact_obj(self, obj: Any) -> tuple[Any, int]:
        if isinstance(obj, str):
            return self.redact_text(obj)
        if isinstance(obj, dict):
            out, count = {}, 0
            for k, v in obj.items():
                if isinstance(k, str):
                    k, kc = self.redact_text(k)
                    count += kc
                v, vc = self.redact_obj(v)
                out[k] = v
                count += vc
            return out, count
        if isinstance(obj, (list, tuple)):
            out, count = [], 0
            for v in obj:
                v, vc = self.redact_obj(v)
                out.append(v)
                count += vc
            return out, count
        return obj, 0
