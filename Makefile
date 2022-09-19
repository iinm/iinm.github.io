BASE_URL := https://iinm.github.io
LOCAL_BASE_URL := http://127.0.0.1:8000
POSTS = $(shell find posts/data -name '*.md' | xargs -n 1 basename | sed -E 's,(.+)\.md,posts/\1.html,g')

.PHONY: run
run:
	python3 -m http.server

.PHONY: lint
lint:
	npx eslint . --fix
	npx tsc --noEmit --allowJs

.PHONY: site
site: $(POSTS) sitemap.txt;

sitemap.txt: index.html
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
clean:
	find posts -maxdepth 1 -name '*.html' \
		| grep -v 'page.html' \
		| xargs rm