# Client-side JavaScriptでMarkdownをHTMLに変換する

> *この記事が表示できているということは、HTMLに変換できているということでしょう。*

## サマリー

- Markdownで書いたブログ記事をHTMLに変換するためにMarkdown parserを書いた。
- この記事はClient-side JavaScriptで上記parserを使って表示している。※ 今後変えるかも
- まずは記事を書くための最低限のSyntaxのみをサポート。※ [Markdown Sandbox : 現時点でサポートする要素](/posts/?post=0000-00-00--markdown-sandbox)

## 背景、目的

先週末に技術ブログをはじめました。
仕事はバックエンドが中心なので、せっかくならフロントエンドの基本的な要素技術を学びながらブログを作ろうという意図で取り組んでいます。

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
            text: 'is '
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
               // To Be Continued...
```

構造解析する際には、問題を以下の2つに分けて考えました。
1. 見出しやリストなどの構造を捉える問題 (HTMLのBlock要素に近い)
2. 文字の装飾やLinkなど構造の末端にある要素を捉える問題 (HTMLのInline要素に近い)

(1) HTMLと違って行の途中で別のBlock要素は出てこないので改行で区切ってグルーピングします。
Blockの途中でインデントされていた場合は行頭からインデントを外して再帰的にグルーピングする処理を呼びます。

```javascript
// ※ 説明のため例外処理は省略
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
  }
  return blocks
}
```

(2) 構造の末端にある要素を捉える

```javascript
// ※ 正規表現で要素を探しているため、このような作りになっている
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

## 課題

- TableやInline HTMLなどサポートしてない要素は今後必要に応じて実装する予定です。
- 分かってはいましたがClient-side JavaScriptでレンダリングするとMarkdownファイルをダウンロードするまで白い画面が表示されてしまいます。今回は真っ白にならないようにブルブル震える絵文字を表示するようにしてみました。
- HTML要素への変換部分が煩雑（`createElement`、`appendChild`の繰り返し）。仮想DOMみたいな層を挟むと読みやすく、ブラウザがなくてもNode.js環境でテストできそう。※ 今回はテストまで書いてません
- 最低限のCSSを書いてみたが、同じ色が何箇所かに書いてあったりして冗長。カスタムプロパティなど使って整理したい。
- 読みづらいのでコードブロックはハイライト表示したい。

## まとめ

どのようにMarkdownの構造解析をしたのかを簡単に説明しました。
まだまだ改善の余地がありますが、これでアウトプットするための最低限の環境ができました。
これからいろいろ書いていきます。
