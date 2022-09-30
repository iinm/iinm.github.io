.DEFAULT_GOAL := help

BASE_URL := https://iinm.github.io
LOCAL_BASE_URL := http://127.0.0.1:8000
POSTS = $(shell find posts/data -name '*.md' | xargs -n 1 basename | sed -E 's,(.+)\.md,posts/\1.html,g')

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
	python3 -m http.server

.PHONY: site
## site | generate site
site: $(POSTS) sitemap.txt;

sitemap.txt:
	echo $(BASE_URL) > sitemap.txt
	find posts -maxdepth 1 -name '*.html' \
		| grep -v 'page.html' \
		| sort \
		| xargs -n 1 basename \
		| xargs -I {} echo $(BASE_URL)/posts/{} \
		>> sitemap.txt

posts/%.html: posts/data/%.md
	google-chrome-stable --headless --disable-gpu --disable-software-rasterizer \
		--virtual-time-budget=5000 \
		--dump-dom \
		'$(LOCAL_BASE_URL)/posts/page.html?path=$(shell basename $@)' \
		> posts/$(shell basename $@)

.PHONY: clean
## clean | delete generated files
clean:
	find posts -maxdepth 1 -name '*.html' \
		| grep -v 'page.html' \
		| xargs rm