from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class ChatConfig:
    provider: str = ""
    model: str = ""
    api_key: str = ""
    allowed_origins: tuple[str, ...] = ()
    max_messages: int = 20
    max_message_chars: int = 4000
    max_total_chars: int = 12000
    max_output_chars: int = 8000
    timeout_seconds: float = 20.0
    rate_limit_requests: int = 20
    rate_limit_window_seconds: int = 60

    @property
    def configured(self) -> bool:
        return self.provider == "openai" and bool(self.model and self.api_key)

    @classmethod
    def from_env(cls, env: dict[str, str] | None = None) -> "ChatConfig":
        env = os.environ if env is None else env
        origins = tuple(x.strip() for x in env.get("AI_ALLOWED_ORIGINS", "").split(",") if x.strip())
        return cls(
            provider=env.get("AI_PROVIDER", "").strip().lower(),
            model=env.get("AI_MODEL", "").strip(),
            api_key=env.get("AI_API_KEY", ""),
            allowed_origins=origins,
            timeout_seconds=float(env.get("AI_TIMEOUT_SECONDS", "20")),
            rate_limit_requests=int(env.get("AI_RATE_LIMIT_REQUESTS", "20")),
        )
