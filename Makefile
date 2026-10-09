PY ?= python3

.PHONY: install test scan doctor sync preview chat clean

install:
	$(PY) -m pip install -r requirements.txt -r requirements-dev.txt

test:
	$(PY) -m pytest -q

scan:
	$(PY) -m sync scan backend/*.py data site config docs js css tests-js index.html README.md SECURITY.md --gate

doctor:
	$(PY) -m sync doctor

sync:
	$(PY) -m sync run --source gdrive

preview:
	$(PY) scripts/build_pages.py
	$(PY) -m http.server 8000 --bind 0.0.0.0 --directory _pages

chat:
	$(PY) scripts/build_pages.py
	$(PY) -m backend --host 127.0.0.1 --port 8000

clean:
	rm -rf .pytest_cache **/__pycache__
