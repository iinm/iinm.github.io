# このブログの表示速度改善の記録

## サマリー

簡素なサイトなので油断していたが、表示速度を改善する余地があったためいくつか対策した。
- Webフォントをやめて、各種OSで利用できるフォントを指定
- 直列だったCSS、JavaScriptのGETを並列化
- コンテンツをPrefetch
- (おまけ) コンテンツのfetch中にローディング画面を表示して、白い画面が表示されることを防いだ。

## 改善前

![](https://resource-iinm-github-io.s3-ap-northeast-1.amazonaws.com/2021-04-29--speed-up-my-blog/init.webp)

Developer toolsで通信内容を確認すると以下のことがわかります。

- 通信サイズの大半がWebフォント。通信量、回数ともに多い。
- page.css, site.cssを直列でGETしている。
- main.js, markdown.js, .mdを直列でGETしている。

## Step 1: Webフォントをやめる

OSによって利用できるフォントが異なることにより、本文とコードブロックのフォントサイズのバランス等
が崩れることを懸念してWebフォントを指定していました。
しかし、想定以上にサイズが大きかったため諦めて各OSで利用できるフォントの指定に変更しました。
※ Androidには明朝体が入っていないためゴシック体で表示されます。

before:

```css
@import url('https://fonts.googleapis.com/css2?family=Lora&family=Ubuntu+Mono&family=Shippori+Mincho:wght@500&display=swap');

body {
  font-family: 'Lora', 'Shippori Mincho', serif;
  ...
}
```

after:

```css
body {
  font-family:
  'Noto Serif CJK JP',    /* for Ubuntu */
  'Hiragino Mincho ProN', /* for macOS */
  'Yu Mincho',            /* for Windows */
  serif
  ;
```


## Step 2: CSS, JavaScriptを並列でGETする

before: サイト全体に適用したい`site.css`とページ固有の`page.css`に分け、`page.css`から`site.css`をimportしていましたが、これではCSSのGETリクエストが直列になってしまいます。

```css
/* page.css */
@import '../site.css';
```

after: importではなく、linkタグで読み込むように変更しました。

```html
<!-- posts/index.html -->
<link rel="stylesheet" href="/site.css" type="text/css" media="all">
<link rel="stylesheet" href="page.css" type="text/css" media="all">
```

JavaScript Modulesも同様です。コンテンツ(Markdown)のfetchとレンダリングをする`main.js`とMarkdownを処理する
`markdown.js`に分けていて、`main.js`から`markdown.js`をimportしていたため、JavaScriptファイルのGET
リクエストが直列になっていました。

before:

```javascript
// posts/main.js
import * as markdown from '/modules/markdown.js'
```

after: `index.html`でまとめてimport、dependency injection風に依存moduleを渡すように書き換えました。
（この方法ではModuleが増えると破綻しそうですね。）

※ [modulepreload](https://developer.mozilla.org/en-US/docs/Web/HTML/Link_types/modulepreload)という仕組みもありますが、画面のレンダリングがブロックされて白い画面が表示される時間が長くなってしまったため今回は利用しませんでした。

```html
<!-- posts/index.html -->
<script type="module">
  import * as markdown from '/modules/markdown.js'
  import * as main from './main.js'
  window.onload = () => main.render({ modules: { markdown } })
</script>
```

ここまでの修正でCSSファイル2つ、JavaScriptファイル2つを並列でGETするようになりました。

![](https://resource-iinm-github-io.s3-ap-northeast-1.amazonaws.com/2021-04-29--speed-up-my-blog/no-import.webp)

## Step 3: インデックスページで最新の記事をPrefetchする

Query stringからMarkdownファイルのURLを組み立てているため、
JavaScriptとMarkdownのGETリクエストはどうしても直列になってしまいます。
インデックスページで最新の記事をprefetchするよう設定しました。

※ 2021-04-29時点でSafariではサポートしていません。また、この方法でJavaScript ModulesをPrefetchすることはできません。
参考：[Preloading modules](https://developers.google.com/web/updates/2017/12/modulepreload)

```html
<! -- index.html -->
<!-- Prefetch latest post -->
<link rel="prefetch" href="posts/?post=2021-04-24--markdown-to-html">
<link rel="prefetch" href="posts/2021-04-24--markdown-to-html.md">
```

ここまでの修正で、Markdownファイルのfetch時間がほぼなくなりました。

![](https://resource-iinm-github-io.s3-ap-northeast-1.amazonaws.com/2021-04-29--speed-up-my-blog/prefetched.webp)

## おまけ: ローディング画面を表示して、白い画面が表示される時間を短くする

このブログの作り上、Prefetchできない状況ではMarkdownファイルをfetchするまで白い画面が表示されてしまいます。
読み込み中であることが分かるようにローディング画面を表示するように修正しました。

before:

![](https://resource-iinm-github-io.s3-ap-northeast-1.amazonaws.com/2021-04-29--speed-up-my-blog/no-loading-screen.gif)

after:

![](https://resource-iinm-github-io.s3-ap-northeast-1.amazonaws.com/2021-04-29--speed-up-my-blog/loading-screen.gif)

## 今後の課題

- modulepreloadの挙動確認
- JavaScript Modulesの使い方改善: 結果的にDepedency Indejction風になりテストが書きやすそうな形になったものの、Moduleが増えて依存関係が複雑になると煩雑になることが見えている。（Bundler使おうな！って結論になるかもしれない）
- Service workerの利用: 他のサイトを見るとService workerを使って各種リソースをfetchしていた。何ができるのか？から調べる。
