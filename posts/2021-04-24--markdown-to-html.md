# Client-side JavaScriptでMarkdownをHTMLに変換する

> *この記事が表示できているということは、HTMLに変換できているということでしょう。*

## サマリー

- フロントエンドの要素技術を学びながらブログを作っている。
- Markdownで書いたブログ記事をHTMLに変換するためにMarkdown parserを書いた。まずは記事を書くための最低限のSyntaxのみをサポート。※ [Markdown Sandbox : 現時点でサポートする要素](/posts/?post=0000-00-00--markdown-sandbox)
- この記事はClient-side JavaScriptで上記parserを使って表示している。※ 今後変えるかも

## 目的

先週末に技術ブログをはじめました。
仕事はバックエンドが中心なので、せっかくならフロントエンドの基本的な要素技術を学ぼう、という意図でライブラリ、フレームワークは使わずにブログを作っています。

その第一歩としてMarkdownで書いた記事をHTMLに変換することが目的です。
静的なコンテンツなのでコマンドラインツールでも目的は達成できますが、
JavaScript Modulesなど最近のブラウザでできることを
試したかったためClient-side JavaScriptでMarkdownを処理する方法を選びました。

## どんなものを作ったか？

Markdownの内容 (String) を受け取り、構造化して返します。

入力例:
```markdown
# Hello, World!

This **is** inline element.

- list item 1
  - nested list item 1
```

出力例:
```javascript
[
  {
    // 要素の種類
    type: 'heading',
    // 子要素
    contents: [],
    // 要素特有のプロパティはここに設定
    props: {
      level: 1,
      heading: 'Hello, World!'
    }
  },
  {
    type: 'empty_line',
    contents: [],
    props: {}
  },
  {
    type: 'inline',
    contents: [],
    props: {
      segments: [
        {
          type: 'text',
          props: {
            text: 'This '
          }
        },
        {
          type: 'bold',
          props: {
            text: 'is'
          }
        },
        // 長いので省略
        ...
      ]
    }
  },
  {
    type: 'unorderd_list',
    contents: [
      {
        type: 'list_item',
        contents: [
          {
            type: 'inline',
            contents: [],
            props: {
              segments: [
                {
                  type: 'text',
                  props: {
                    text: 'list item 1'
                  }
                }
              ]
            }
          },
          {
            type: 'unorderd_list',
            // 同じ構造のため省略
            ...
          }
        ],
        props: {}
      }
    ],
    props: {}
  }
]
```

## どのように実装したのか？

できるだけ簡単な方法で実装したく、はじめは構造解析すらせず `String.prototype.replace` を使ってHTMLへの変換を試しました。
途中まで書いてcode block内の要素まで変換してしまう問題に気が付き、構造解析とレンダリングの2ステップで実現する方向に切り替えました。
また、経験上MarkdownのPreviewerによって改行の扱いが異なるという気づきがあり、
こういった細かな制御はレンダリング時にコントロールしたく、レンダリングのステップを分けることで実現しやすくなると考えました。
（例: `\n\n`は段落の区切り、`\n`だけなら同じ段落にするなど）

ボツになったコード例:
```javascript
const html = markdownContent
               // heading
               .replace(/^(#+) (.+)$/gm, (match, levelChars, content) =>
                 `<h${levelChars.length}>${content}</h${levelChars.length}>`)
               // image
               .replace(/!\[([^\[]+)\]\(([^\)]+)\)/g, '<img src="$2" alt="$1">')
               // ...
```

構造解析する際には、問題を以下の2つに分けて考えました。
1. 見出しやリストなどの構造を捉える問題 (HTMLのBlock要素に近い)
2. 文字の装飾やLinkなど構造の末端にある要素を捉える問題 (HTMLのInline要素に近い)

(1) HTMLと違って行の途中で別のBlock要素は出てこないので改行で区切ってグルーピングします。
Blockの途中でインデントされていた場合は行頭からインデントを外して再帰的にグルーピングする処理を呼びます。

```javascript
const parseBlocks = (markdownContentLines) => {
  const blocks = []
  for (let start = 0; start < markdownContentLines.length;) {
    for (const reader of blockReaders) {
      // Blockの開始を見つけたら、
      if (reader.match(markdownContentLines, start)) {
        // Blockの終了まで読む
        const { block, readLineCount } = reader.read(markdownContentLines, start)
        blocks.push(block)
        start += readLineCount
        break
      }
    }
    // ※ 説明のため例外処理は省略
  }
  return blocks
}
```

(2) テキスト要素まで分解できたら、正規表現で文字の装飾やLinkなどの要素を見つけて、テキストを分割、再帰的に分割したテキストからも要素を探します。

```javascript
const parseInline = (inlineContent) => {
  if (inlineContent === '') return []
  for (const segmenter of inlineContentSegmenters) {
    // 文字の装飾やLinkなどの要素を見つけたら、前後の文字列と分割して返す。
    const { before, segment, after } = segmenter(inlineContent)
    if (segment) {
      // 再帰的に前後の文字列からも要素を探す
      return [...parseInline(before), segment, ...parseInline(after)]
    }
  }
  // 特に見つからなければplain text
  return [{ type: 'text', props: { text: inlineContent } }]
}
```

HTML要素への変換は上記の出力結果をトレースしながら`document.createElement`を呼んでいるだけなので割愛します。

## 今後の課題

- TableやInline HTMLなどサポートしてない要素は今後必要に応じて実装する予定です。
- HTML要素への変換部分が`createElement`、`appendChild`の繰り返しで煩雑になってしまったので、仮想DOMみたいな層を挟んでみようと考えています。
- 分かってはいましたがClient-sideレンダリングするとMarkdownファイルをダウンロードするまで白い画面が表示されてしまいます。他にもいくつか気づきがあり、対策してみたのでこれは次の記事で紹介できればと思います。
- コードハイライトしたい。

まだまだ改善の余地がありますが、これでブログを書くための最低限の環境ができました。
これからいろいろ書いていきます。

## 参考

- [Simple Markdown Parser with JavaScript and Regular Expressions](https://www.bigomega.dev/markdown-parser) - 最終的にはやりませんでしたが、正規表現でHTMLに直接書き換えるという発想を得ました。
- [marked](https://github.com/markedjs/marked) - block要素とinline要素に分けて処理するという発想を得ました。
