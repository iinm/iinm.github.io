.DEFAULT_GOAL := help

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

sitemap.txt:
	find posts -name "*.md" \
		| grep -Eo '[0-9]{4}-[^.]+' \
		| grep -v "0000" \
		| sort -r \
		| awk '{ printf "https://iinm.github.io/posts/?post=%s\n", $$1 }' \
		> sitemap.txt
