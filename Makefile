# Prefer the project venv when it exists (scripts/setup-linux-dev.sh creates it);
# Debian 12+ marks the system interpreter as externally managed (PEP 668), so
# `python3 -m pip install` against it fails. Override with: make PY=python3 …
PY ?= $(shell [ -x .venv/bin/python ] && echo .venv/bin/python || echo python3)
NODE ?= $(shell command -v node 2>/dev/null)

# Every surface the CI scan gate covers — keep in sync with .github/workflows/ci.yml.
#
# tests/ and tests-js/ are deliberately NOT here: they must embed fake secrets
# (AKIA…, ghp_…, PEM blocks, JWTs) to prove the redactor and the gate actually
# catch them. Scanning the fixtures would make the gate fail on its own test
# data, so the gate covers what ships — data/, site/, docs/, config/, the
# published js/, index.html and the build files.
SCAN_PATHS := data site config docs scripts js \
	README.md SECURITY.md Makefile pyproject.toml \
	requirements.txt requirements-dev.txt index.html

.PHONY: bootstrap install test test-py test-js lint scan quality doctor sync preview clean

# One-shot environment setup on Debian/Ubuntu: OS tools + .venv + deps + checks.
# Degrades gracefully when apt mirrors are unreachable (CI sandboxes).
bootstrap:
	bash scripts/setup-linux-dev.sh

install:
	$(PY) -m pip install -r requirements.txt -r requirements-dev.txt

# Sync-channel tests (pytest) + front-end tests (node:test).
test: test-py test-js

test-py:
	$(PY) -m pytest -q

test-js:
	@if [ -z "$(NODE)" ]; then \
		echo "node not found — the front-end suites need Node.js 18+ (22 in CI)."; \
		exit 1; \
	fi
	$(NODE) scripts/run-js-tests.cjs

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
