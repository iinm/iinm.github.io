.DEFAULT_GOAL := help

.PHONY: help
## help | show help
help:
	@grep -E '^##' $(MAKEFILE_LIST) \
		| sed -E 's,## ,,' \
		| column -s '|' -t \
		| sed -E "s,^([^ ]+),$(shell tput setaf 6)\1$(shell tput sgr0),"

.PHONY: run-server
## run-server | Run server for local development
run-server:
	$(info --- $@)
	python -m http.server --bind 127.0.0.1 8000

.PHONY: render-posts
## render-posts | Render posts
render-posts:
	find posts -name '*.md' \
		| xargs -n 1 basename \
		| sed 's,\.md$$,,g' \
		| xargs -I {} bash -c "google-chrome-stable --disable-gpu --disable-software-rasterizer --headless --virtual-time-budget=5000 --dump-dom 'http://127.0.0.1:8000/posts/?post={}' > posts/{}.html"
