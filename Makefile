.DEFAULT_GOAL := help

BASE_URL=https://iinm.github.io

.PHONY: help
## help | show help
help:
	@grep -E '^##' $(MAKEFILE_LIST) \
		| sed -E 's,## ,,' \
		| column -s '|' -t \
		| sed -E "s,^([^ ]+),$(shell tput setaf 6)\1$(shell tput sgr0),"

.PHONY: start-server
## start-server | Start development server
start-server:
	python -m http.server --bind 127.0.0.1 8000

.PHONY: sitemap
## sitemap | Create sitemap
sitemap:
	echo $(BASE_URL) > sitemap.txt
	find posts -name "*.html" -not -name "template.html" \
		| sort -r \
		| awk '{ printf "$(BASE_URL)/%s\n", $$1 }' \
		>> sitemap.txt
