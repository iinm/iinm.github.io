# 自作コーディングエージェントでClaude Codeの資産を使う

昨年から、学習機会や安全性を高める目的で、自分専用のコーディングエージェントとサンドボックス環境を作り、実務でも活用しています。

周囲はほぼ全員Claude Codeを利用しており、commandやsubagent、skillなどの資産が少しずつ蓄積されつつありますが、
基本的にはプレーンテキストで書かれた指示書であり、ファイルパスを渡して読み込ませれば良いというスタンスでした。
そんな中、実務でSDD (Spec-Driven Development) 補助ツールの [Spec Kit](https://github.com/github/spec-kit) をClaude Code
で試した際にいくつか発見があり、Claude Codeの資産を自作エージェントから活用できるように機能拡張しました。

> 🎧 この記事の内容について、AIがポッドキャスト風に解説した音声です。

<audio controls preload="metadata" style="display:block; width:100%; margin:1em 0;">
  <source src="https://pub-0bb49aa929f242d49c89ed8c297932b5.r2.dev/audio/posts/2026-02-23--my-coding-agent-with-claude-code-assets--96k.m4a" type="audio/mp4">
</audio>

## Spec Kit + Claude Code を使っての発見

※ Spec Kitの話はほぼありません

Spec KitはSDDを補助するcommand (`/` で呼び出せるプロンプト、例えば、仕様検討、調査、システム設計、タスク分解、実装など) を
様々なコーディングエージェント向けにインストールしてくれます。
今回は、同僚の環境に合わせてClaude Code向けのcommandを `.claude/commands` にインストール、
私も素直にClaude Codeを使ってSpec Kitが提唱するSDDのプロセスを実践してみました。

以下、気がついたポイントです。もう、自作なんてやめてClaude Codeを使おうかと思いました。

- **`/` commandをこれまで以上に頻繁に使うようになった、そしてClaude Codeの使い心地が良い**
  - 当たり前ですが、Spec Kitのcommandを頻繁に使うようになり、自作エージェントにもcommand機能が欲しくなってきました。
  - そして、Claude Codeのcommandの補完など、使い心地が良い。自作エージェントにも `/commit` などの組み込みコマンドは
    ありますが、前方一致のTab補完機能しかありません。
- **subagentによって一度に任せられる仕事のスコープが広がる**
  - 実装計画用の [`/speckit.plan`](https://github.com/github/spec-kit/blob/6f523ede22c9ac22691b50cb4fcaeaa92891f7ff/templates/commands/plan.md?plain=1#L53) 
    では、調査項目ごとにsubagentを起動するように指示されています。
    subagentもただの指示書に過ぎないとナメていました。ごめんなさい。
    実際に使ってみて、これはエージェントの仕事のスコープを狭めて成功率を高め、かつ、調査や試行錯誤の過程をメインの
    コンテキストから分離することでトークンの消費を抑えてくれる仕組みであると理解できました。
  - これまでの自作エージェントの使い方だと、調査項目ごとに調査依頼 → 調査結果をファイルに書き出してもらう → コンテキストをリセットする、という流れで実行する必要がありますが、
    subagentの機能があれば最初の一度の指示で複数項目の調査が可能になります。

## 自作エージェントからClaude Codeの資産を使う

もう、Claude Codeを使えば良いじゃないかと思うところですが、学習機会や安全性へのこだわりを諦めることはできず、
Claude Codeの資産を活用できるように自作エージェントを進化させることにしました。

### Memory (CLAUDE.md, .claude/rules)

前提として、自作エージェントは `AGENTS.md` を読むようになっています。

- `.claude/rules` を使わないプロジェクトでは、`AGENTS.md` を `CLAUDE.md` へのシンボリックリンクにすることで対応していました。
- `.claude/rules` を使うプロジェクトでは、`AGENTS.md` でセッション開始時にルールファイルのYAML front matterをリストアップするよう指示します。
  ただし、自動で読んでくれないこともあるので、「プロジェクトルールの確認・適用」を明示的に指示しています。
  （今後の改善ポイント）

```AGENTS.md
Locate project rule files at session start:

Global rules: list files without `paths:` in frontmatter

    rg --files-without-match --hidden --glob '*.md' --pcre2 --multiline '\A---\npaths:' ./.claude/rules

Scoped rules: list files with `paths:` in frontmatter

    rg --hidden --glob '*.md' --heading --pcre2 --multiline --only-matching '\A---\npaths:[\s\S]*?\n---\n' ./.claude/rules

When to Read Rules:

- Global rules: Read before working on any file.
- Scoped rules: Read when your target path matches any pattern in `paths`.
```

### Commands (.claude/commands)

単純に `/prompts:claude/<id>` の形式で呼び出せるようにしました。

- 独自管理のプロンプトも同じ枠組みで呼び出したいので、プレフィックス `claude/` を付けています。
- 部分一致でTab補完が効くようになり、 `/pr<Tab>` → `/prompts:` → `/prompts:dep<Tab>` → `/prompts:claude/deploy` のように指定できます。

![](/images/2026-02-23--my-coding-agent-with-claude-code-assets/2026-02-23--22-47-05.png)

また、Claude Codeのプラグインとして公開されているURLを補足説明付きで読み込むことができます。

```markdown
---
import: https://raw.githubusercontent.com/anthropics/claude-plugins-official/4ca561fb8532594e7a5faef945e85096fcec0616/plugins/feature-dev/commands/feature-dev.md
---

- Use memory file instead of TodoWrite
- Parallel execution is not supported. Execute all tasks sequentially.
```

### Skills (.claude/skills)

Skillsはエージェントが自己判断で読み込むことができ、かつ、ユーザーがcommandとして呼び出すこともできることが特徴です。

- commandとして呼び出す際は `/prompts:claude/skill/<id>` の形式で呼び出し可能です。
- エージェント判断で読み込めるように、Skillのfront matterを取得する指示をシステムプロンプトに入れましたが、まだ試験運用中です。

```markdown
- SKILL.md: Reusable workflows with specialized knowledge
  Find: rg ["--hidden", "--heading", "--line-number", "--pcre2", "--multiline", "--glob", "SKILL.md", "\\A---\\n[\\s\\S]*?\\n---", "./"]
  If skill matches task: read full file and apply the workflow
```

### Subagents (.claude/agents)

Subagentの実現がもっとも難しいポイントです。
Claude Codeのsubagentは並列実行が可能ですが、自作エージェントで実現するには大掛かりな構成変更が必要になります。
私個人としてはエージェントが並列実行で早く仕事が終わっても、私自身が別プロジェクトの仕事でブロックされることが多いため、
あまり恩恵は受けられません。そこで、今回は直列実行しかできないという制約のもとsubagentを実現しました。

並列実行を捨てると実は簡単に実現できて、私の場合は、**メインのコンテキストをForkして最終結果だけを残す**、というアプローチで実現しました。単純なアプローチですが、subagentによる調査や試行錯誤の過程をクリアできるので、コンテキストを肥大化させずに複数ステップを連続実行する、という私がやりたかったことは実現できました。
- (1) User: QA Engineerサブエージェントでテストケースをレビューして
- (2) Agent: ツール `delegateToSubagent(agent=qa-engineer, goal=テストケースのレビューをする...)` を呼び出す
- (3) System: あなたは今から、QA Engineerです。テストケースをレビューしてください... 完了したら `reportAsSubagent` ツールで報告すること
- (4) Agent: (これまでの会話は保持したまま) QA Engineerとしてテストケースのレビュー
- (5) Agent: ツール `reportAsSubagent` で最終結果を報告
  - **ここで、subagentとしての(3)~(5)までの履歴はクリアして、最終結果だけを残します**

また、commandと同様に`/agents:qa-engineer 直近編集したテストをレビュー` のように明示的に呼び出し可能です。

## 参考

[agent](https://github.com/iinm/dotfiles/tree/main/agent) - コーディングエージェントの実装
