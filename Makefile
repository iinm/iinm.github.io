.DEFAULT_GOAL := help

DOC_ROOT := $(CURDIR)/www/iinm.github.io
BASE_URL := https://iinm.github.io
LOCAL_BASE_URL := http://127.0.0.1:8000

POSTS = $(shell find $(DOC_ROOT)/posts/source -name '*.md' | sed -E 's,source/,,g; s,.md$$,.html,g')

.PHONY: help
## help | show help
help:
	@grep -E '^##' $(MAKEFILE_LIST) \
		| sed -E 's,## ,,' \
		| column -s '|' -t \
		| sed -E "s,^([^ ]+),$(shell tput setaf 6)\1$(shell tput sgr0),"

.PHONY: start-server
## start-server | start web server
start-server:
	$(info --- $@)
	@if test -f run/server.pid; then \
		echo "server.pid exists"; \
		exit 1; \
	fi
	python3 -m http.server --bind 127.0.0.1 --directory $(DOC_ROOT) \
		2> run/server.stderr \
		> run/server.stdout \
		& \
		echo "$$!" > run/server.pid

.PHONY: stop-server
## stop-server | stop web server
stop-server:
	$(info --- $@)
	kill "$$(cat run/server.pid)"
	rm -f run/server.pid run/server.stdout run/server.stderr

.PHONY: tail-logs
## tail-logs | show server logs
tail-logs:
	$(info --- $@)
	tail -f run/server.stdout run/server.stderr

.PHONY: site
## site | generate site
site: $(POSTS) $(DOC_ROOT)/sitemap.txt
	$(info --- $@)

$(DOC_ROOT)/sitemap.txt:
	$(info --- $@)
	echo $(BASE_URL) > $(DOC_ROOT)/sitemap.txt
	find $(DOC_ROOT)/posts -maxdepth 1 -name '*.html' \
		| grep -v 'post.html' \
		| sort \
		| xargs -n 1 basename \
		| xargs -I {} echo $(BASE_URL)/posts/{} \
		>> $(DOC_ROOT)/sitemap.txt

$(DOC_ROOT)/posts/%.html: $(DOC_ROOT)/posts/source/%.md $(DOC_ROOT)/posts/post.html
	$(info --- $@)
	google-chrome-stable --headless --disable-gpu --disable-software-rasterizer \
		--virtual-time-budget=5000 \
		--dump-dom \
		'$(LOCAL_BASE_URL)/posts/post.html?path=$(shell basename $@)&mode=prerender' \
		2>> run/chrome.stderr \
		> $(DOC_ROOT)/posts/$(shell basename $@)

.PHONY: clean
## clean | delete generated files
clean:
	$(info --- $@)
	rm -fv $(DOC_ROOT)/sitemap.txt
	find $(DOC_ROOT)/posts/source -name '*.md' \
		| sed -E 's,source/,,g; s,.md$$,.html,g' \
		| xargs rm -fv
