PY ?= python3

.PHONY: install test scan doctor sync preview clean

install:
	$(PY) -m pip install -r requirements.txt -r requirements-dev.txt

test:
	$(PY) -m pytest -q

scan:
	$(PY) -m sync scan data site config docs README.md SECURITY.md --gate

doctor:
	$(PY) -m sync doctor

sync:
	$(PY) -m sync run --source gdrive

preview:
	mkdir -p site/data && cp -R data/. site/data/
	$(PY) -m http.server 8000 --bind 0.0.0.0 --directory site

clean:
	rm -rf .pytest_cache **/__pycache__
