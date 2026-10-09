#!/usr/bin/env bash
# Baseline Linux development setup for the easy-ai project (Debian/Ubuntu).
#
# What it does, in order:
#   1. probes network reachability for apt / PyPI / GitHub (each independently),
#   2. installs OS-level dev tools via apt when apt is reachable,
#   3. creates .venv and installs the Python requirements (PyPI may work even
#      when apt mirrors are firewalled — common in CI sandboxes),
#   4. verifies the result and prints an honest OK/MISSING table.
#
# Safe to rerun. Never touches project source files. Never prints secret values.
set -Eeuo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# Privilege handling. NOTE: an empty bash array expands to nothing under
# `set -u` on bash < 4.4, so every use below is guarded by PRIVILEGED, not by
# the array's length (which is 0 both for "root" and for "no sudo at all").
SUDO=()
PRIVILEGED=0
if [[ "${EUID}" -eq 0 ]]; then
  PRIVILEGED=1
elif command -v sudo >/dev/null 2>&1; then
  SUDO=(sudo)
  PRIVILEGED=1
else
  printf 'NOTE: no sudo and not root — OS packages will be skipped.\n' >&2
fi

if [[ ! -r /etc/os-release ]]; then
  printf 'ERROR: cannot identify this Linux distribution.\n' >&2
  exit 1
fi
# shellcheck source=/etc/os-release
. /etc/os-release
if [[ "${ID:-}" != "debian" && "${ID:-}" != "ubuntu" && "${ID_LIKE:-}" != *debian* ]]; then
  printf 'ERROR: this script supports Debian/Ubuntu-based systems only (detected: %s).\n' \
    "${PRETTY_NAME:-unknown}" >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

PACKAGES=(
  ca-certificates curl wget git build-essential make gcc
  jq ripgrep fd-find tree less tmux sqlite3 git-lfs
  python3-venv python3-pip unzip zip rsync procps file
)

# --- reachability probes -----------------------------------------------------
# curl exit codes: 0 = ok, 6 = DNS failure, 7 = connect refused, 28 = timeout,
# 35 = TLS handshake blocked. We only care "reachable or not".
probe() {
  local url="$1"
  curl -sS -o /dev/null --max-time 15 -I "$url" >/dev/null 2>&1
}

APT_OK=0;  probe http://deb.debian.org/debian/dists/bookworm/InRelease && APT_OK=1
PYPI_OK=0; probe https://pypi.org/simple/ && PYPI_OK=1
GH_OK=0;   probe https://api.github.com/ && GH_OK=1

printf '\n== easy-ai Linux development setup ==\n'
printf 'Distribution : %s\n' "${PRETTY_NAME:-unknown}"
printf 'Repository   : %s\n' "$REPO_ROOT"
printf 'apt mirror   : %s\n' "$([[ $APT_OK  -eq 1 ]] && echo reachable || echo UNREACHABLE)"
printf 'PyPI         : %s\n' "$([[ $PYPI_OK -eq 1 ]] && echo reachable || echo UNREACHABLE)"
printf 'GitHub API   : %s\n' "$([[ $GH_OK   -eq 1 ]] && echo reachable || echo UNREACHABLE)"

# --- 1) OS packages ----------------------------------------------------------
if [[ $APT_OK -eq 1 && $PRIVILEGED -eq 1 ]]; then
  printf '\n-- Installing OS packages --\n'
  "${SUDO[@]}" apt-get update
  "${SUDO[@]}" apt-get install -y --no-install-recommends "${PACKAGES[@]}"
else
  printf '\n-- Skipping OS packages (apt unreachable or no privileges) --\n'
  printf '   Missing tools stay missing; nothing else in this project needs them.\n'
fi

# Debian/Ubuntu ship `fdfind`; add a convenience wrapper if needed.
if command -v fdfind >/dev/null 2>&1 && ! command -v fd >/dev/null 2>&1; then
  if [[ $PRIVILEGED -eq 1 ]]; then
    printf '\nCreating /usr/local/bin/fd wrapper for fdfind...\n'
    printf '#!/bin/sh\nexec fdfind "$@"\n' | "${SUDO[@]}" tee /usr/local/bin/fd >/dev/null
    "${SUDO[@]}" chmod 0755 /usr/local/bin/fd
  else
    printf '\nCreating ~/.local/bin/fd wrapper for fdfind...\n'
    mkdir -p "$HOME/.local/bin"
    printf '#!/bin/sh\nexec fdfind "$@"\n' > "$HOME/.local/bin/fd"
    chmod 0755 "$HOME/.local/bin/fd"
  fi
fi

# --- 2) Python environment ---------------------------------------------------
# Debian 12+/Ubuntu 23+ mark the system interpreter as externally managed
# (PEP 668), so `pip install` into it fails. Use a project-local venv.
PY=python3
printf '\n-- Python environment --\n'
if [[ ! -x "$REPO_ROOT/.venv/bin/python" ]]; then
  if $PY -m venv "$REPO_ROOT/.venv" 2>/dev/null; then
    printf 'created .venv\n'
  else
    printf 'WARNING: python3-venv unavailable; falling back to system interpreter.\n' >&2
  fi
fi
if [[ -x "$REPO_ROOT/.venv/bin/python" ]]; then
  PY="$REPO_ROOT/.venv/bin/python"
fi
printf 'interpreter: %s (%s)\n' "$PY" "$("$PY" --version 2>&1)"

if [[ $PYPI_OK -eq 1 ]]; then
  "$PY" -m pip install --upgrade pip >/dev/null
  "$PY" -m pip install -r requirements.txt -r requirements-dev.txt
else
  printf 'PyPI unreachable — skipping dependency install.\n' >&2
fi

# --- 3) verification ---------------------------------------------------------
printf '\n== Verification ==\n'
for cmd in bash git curl wget make gcc jq rg fd tree less tmux sqlite3 git-lfs python3 node npm; do
  if command -v "$cmd" >/dev/null 2>&1; then
    printf 'OK      %-10s %s\n' "$cmd" "$(command -v "$cmd")"
  else
    printf 'MISSING %-10s (not required by easy-ai)\n' "$cmd"
  fi
done

printf '\nVersions:\n'
git --version
"$PY" --version
if command -v node >/dev/null 2>&1; then node --version; else printf 'Node.js: not installed\n'; fi
if command -v npm  >/dev/null 2>&1; then npm  --version; else printf 'npm: not installed\n'; fi

printf '\n== Project checks ==\n'
# A failing check must fail the script: with `set -o pipefail` a bare
# `cmd || printf …` swallows the exit status and CI would report success.
FAILED=0
if "$PY" -c 'import requests, cryptography, yaml, pytest' 2>/dev/null; then
  printf 'OK      dependencies import cleanly\n'
  if ! "$PY" -m pytest -q; then
    printf 'FAILED  pytest — see output above\n' >&2
    FAILED=1
  fi
  if ! "$PY" -m sync scan data site config docs README.md SECURITY.md --gate; then
    printf 'FAILED  scan gate — see output above\n' >&2
    FAILED=1
  fi
  # doctor reports NOT CONFIGURED without credentials — that is correct, not a
  # failure, so it never gates the script.
  "$PY" -m sync doctor || true
  # ruff is a standalone binary installed into the venv by requirements-dev.txt.
  RUFF="$REPO_ROOT/.venv/bin/ruff"
  [[ -x "$RUFF" ]] || RUFF="$(command -v ruff || true)"
  if [[ -n "$RUFF" ]]; then
    if ! "$RUFF" check .; then
      printf 'FAILED  ruff — see output above\n' >&2
      FAILED=1
    fi
  else
    printf 'NOTE    ruff not installed — lint step skipped\n'
  fi
else
  printf 'MISSING one or more Python dependencies (requests/cryptography/PyYAML/pytest)\n' >&2
  FAILED=1
fi

if [[ $FAILED -ne 0 ]]; then
  printf '\nSetup finished with FAILURES — no project source files were modified.\n' >&2
  exit 1
fi

printf '\nSetup complete. No project source files were modified.\n'
printf 'Next: make test | make lint | make doctor | make scan | make preview\n'
