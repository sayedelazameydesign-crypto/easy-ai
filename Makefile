# Prefer the project venv when it exists (scripts/setup-linux-dev.sh creates it);
# Debian 12+ marks the system interpreter as externally managed (PEP 668), so
# `python3 -m pip install` against it fails. Override with: make PY=python3 …
PY ?= $(shell [ -x .venv/bin/python ] && echo .venv/bin/python || echo python3)

# Every surface the CI scan gate covers — keep in sync with .github/workflows/ci.yml.
SCAN_PATHS := data site config docs scripts README.md SECURITY.md Makefile \
	pyproject.toml requirements.txt requirements-dev.txt

.PHONY: bootstrap install test lint scan quality doctor sync preview clean

# One-shot environment setup on Debian/Ubuntu: OS tools + .venv + deps + checks.
# Degrades gracefully when apt mirrors are unreachable (CI sandboxes).
bootstrap:
	bash scripts/setup-linux-dev.sh

install:
	$(PY) -m pip install -r requirements.txt -r requirements-dev.txt

test:
	$(PY) -m pytest -q

lint:
	$(PY) -m ruff check .

scan:
	$(PY) -m sync scan $(SCAN_PATHS) --gate

# Everything CI runs, in order, minus shellcheck (install it via apt or
# `npm i -g shellcheck` — see .github/workflows/ci.yml).
quality: lint test scan
	$(PY) -m sync doctor

doctor:
	$(PY) -m sync doctor

sync:
	$(PY) -m sync run

preview:
	$(PY) scripts/build_pages.py
	$(PY) -m http.server 8000 --bind 0.0.0.0 --directory _pages

clean:
	rm -rf .pytest_cache **/__pycache__
