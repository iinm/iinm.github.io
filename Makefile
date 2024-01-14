.DEFAULT_GOAL := help

DOC_ROOT := $(CURDIR)/www/iinm.work
BASE_URL := https://iinm.work
LOCAL_BASE_URL := http://127.0.0.1:8000

POSTS = $(shell find $(DOC_ROOT)/posts/source -name '*.md' | sed -E 's,source/,,g; s,.md$$,.html,g')

.PHONY: help
## help | show help
help:
	@grep -E '^##' $(MAKEFILE_LIST) \
		| sed -E 's,## ,,' \
		| column -s '|' -t \
		| sed -E "s,^([^ ]+),$(shell tput setaf 6)\1$(shell tput sgr0),"

.PHONY: run
## run | run web server
run:
	$(info --- $@)
	python3 -m http.server --directory $(DOC_ROOT)

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
		> $(DOC_ROOT)/posts/$(shell basename $@)

.PHONY: clean
## clean | delete generated files
clean:
	$(info --- $@)
	rm -fv $(DOC_ROOT)/sitemap.txt
	find $(DOC_ROOT)/posts/source -name '*.md' \
		| sed -E 's,source/,,g; s,.md$$,.html,g' \
		| xargs rm -fv
