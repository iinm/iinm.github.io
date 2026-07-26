# Corne Cherry のPro Microの交換

今年4月にオフィス勤務が増えたことで外付けキーボードの持ち運びが面倒になり、3ヶ月ほどMacBookのキーボードを使っていました。
6月頃からリモートワークが増えてきたのでまたCorne Cherryを使おうと引っ張り出したら、なんと、USB端子が剥がれていました。
2022年6月頃購入したものなので、ちょうど4年ほど使用したタイミングとなります。
長く使っていればまた起きることなので、Pro Micro交換の手順を整理しておこうと思います。

![](/images/2026-07-26--corne-cherry-pro-micro-replacement-linux/broken-pro-micro.jpg)

## 環境

- Corne Cherry:
  - [“Corne Cherry” – 半田付けのいらない42キー スプリットキーボードキット](https://bit-trade-one.co.jp/selfmadekb/adskbcc/) (2022年6月頃購入)
  - ビルドガイド: [corne-cherry/doc/buildguide_ver.BTO_jp.md](https://github.com/bit-trade-one/crkbd/blob/master/corne-cherry/doc/buildguide_ver.BTO_jp.md)
  - 現行のCorne V4 Cherryよりも前のモデルで、v1-3のどれなのかは不明
- ファームウェア書き込みなどのセットアップ用のPC: ThinkPad T490s (Debian 13)

## 必要だったもの

- [Pro Micro Micro-B版 コンスルーセット](https://shop.yushakobo.jp/products/21)
  - 遊舎工房で 1,210円 + 配送料 550円 + 税 160円 = 1,760円 でした
- はんだごて
  - ど素人すぎて、コンスルーってやつを基板とPro Microに挿すだけだと勘違いしていたのですが、
    挿してみるとPro Micro側はゆるゆるで、はんだ付けが必要でした

## 手順

- Pro Microにファームウェアを書き込んでおく
  - v1-v3はファームウェアが共通です: [docs/firmware/firmware_en.md](https://github.com/foostan/crkbd/blob/main/docs/firmware/firmware_en.md)
  - [Crkbd - Remap](https://remap-keys.app/catalog/EfziB9K7ZcxLnIHXl5AQ/firmware) の `crkbd:via` (qmk018じゃない方) を書き込みます ※ 以前ファームウェアを書き込むときはCLIで書き込みましたが、今はChromeからできることに驚きました
  - ブートローダーは通常のPro Microであれば `caterina` を選択します（互換機だと違うらしい）
  - Chromeからファームウェアを書き込むためには、非rootユーザーがデバイスにアクセスできるように以下の設定が必要でした
    ```sh
    sudo tee /etc/udev/rules.d/50-qmk.rules > /dev/null <<'EOF'
    # Caterina (Pro Micro)
    SUBSYSTEMS=="usb", ATTRS{idVendor}=="2341", TAG+="uaccess"
    SUBSYSTEMS=="usb", ATTRS{idVendor}=="1b4f", TAG+="uaccess"
    SUBSYSTEMS=="usb", ATTRS{idVendor}=="2a03", TAG+="uaccess"
    SUBSYSTEMS=="usb", ATTRS{idVendor}=="239a", TAG+="uaccess"
    EOF
    sudo udevadm control --reload-rules
    sudo udevadm trigger
    sudo usermod -aG dialout $USER
    ```
- Pro Microにコンスルーを挿して、はんだ付けで固定する
  - 向きはもともと使っていたPro Microをよく見て合わせます
- Pro Microを基板に挿す
- キーマップの再設定
  - 以前は [VIA](https://caniusevia.com/) のデスクトップアプリを使ってましたが、現在は [VIAのWebアプリ](https://usevia.app/)から設定できます
  - 設定をJSONでエクスポートしていたので、インポートするだけで復旧できました
    [crkbd.json](https://github.com/iinm/dotfiles/blob/main/crkbd.json)
  - ここでもChromeからキーボードの設定を書き換えるために、非rootユーザーからのアクセスを許可する必要がありました
    ※ 一時的な設定なので雑に `MODE=0666` としてますが、恒久的な設定にする場合は専用のgroup作り、そのグループのユーザーだけがアクセスできるよう制限したほうが良いです。
    ```sh
    sudo tee /etc/udev/rules.d/92-viia.rules > /dev/null <<'EOF'
    KERNEL=="hidraw*", SUBSYSTEM=="hidraw", MODE="0666", TAG+="uaccess", TAG+="udev-acl"
    EOF
    sudo udevadm control --reload
    sudo udevadm trigger
    ```
