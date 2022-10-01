# mitmproxy の使い方

## mitmproxy とは

HTTP(S)のプロキシで、通信内容を覗いたり内容を書き換えることができます。

ref. [mitmproxy](https://mitmproxy.org/)

## mitmproxy のインストールと起動

ref. [Installation - mitmproxy docs](https://docs.mitmproxy.org/stable/overview-installation/)

```sh
# macOS
brew install mitmproxy

# or Arch Linux
pacman -S mitmproxy

# or Python Package Index
pipx install mitmproxy
```

```sh
mitmproxy

# or
mitmproxy -p 8080
```

## 証明書とプロキシの設定 (Android)

※ 以下の方法ではブラウザ (Chrome) の通信しかプロキシできません。
アプリの通信プロキシするには、[証明書を root のファイルシステム上に配置するか](https://github.com/mitmproxy/mitmproxy/issues/2054#issuecomment-327735569)、
[APK を書き換える](https://github.com/mitmproxy/mitmproxy/issues/2054#issuecomment-289206209)必要があります。

設定 > ネットワークとインターネット > インターネット >
利用している Wifi の ⚙️ アイコン > 詳細設定
![](https://user-images.githubusercontent.com/8685693/155329499-b8154ce4-45ce-4920-a3a8-a43d79e0bcce.png)

mitmproxy を動かしているマシンの IP アドレス、ポートを設定する。
![](https://user-images.githubusercontent.com/8685693/155329504-326bd614-5c7c-42d5-9b29-97f592f09538.png)

HTTPS の通信をプロキシするには Android 端末に証明書を設定する必要があります。

[http://mitm.it](http://mitm.it)に Android の Chrome でアクセスすると、各クライアント向けの証明書と設定方法が参照できます。ここから Android 向けの証明書をダウンロードします。
![](https://user-images.githubusercontent.com/8685693/155329507-024702c0-4107-4cff-ba2f-005e78bc6700.png)

このページの下にも書いてあるとおり、この証明書をインストールしても他のユーザから通信を覗かれるようなことはありません。

- このページや証明書のファイルは mitmproxy を動かしてるマシンから返しています。
- ここからダウンロードできる証明書は mitmproxy 初回起動時にランダムに生成されたものです。
  ![](https://user-images.githubusercontent.com/8685693/155329510-2280a9ef-c159-4212-81d7-c403cbc2a0f9.png)

設定 > セキュリティ > 詳細設定 > 暗号化と認証情報 > 証明書のインストール >
CA 証明書を選択して、ダウンロードした証明書をインストールします。

## 証明書とプロキシの設定 (Archlinux / GNOME)

Settings > Network > Network Proxy
![](https://user-images.githubusercontent.com/8685693/155333350-b1e24322-6278-4884-9bb1-3c8678f28a4b.png)

Android と同じように mitm.it から証明書をダウンロードしてインストールします。
ref. [Grawity/Adding a trusted CA certificate - Arch Linux Wiki](https://wiki.archlinux.org/title/User:Grawity/Adding_a_trusted_CA_certificate)

```sh
sudo trust anchor --store ./mitmproxy-ca-cert.pem
```

アンインストールするときは、

```sh
sudo trust anchor --remove ./mitmproxy-ca-cert.pem
```

## mitmproxy の操作方法

![](https://user-images.githubusercontent.com/8685693/155335446-dc9ea697-3aeb-4f5c-b7cf-c53da65a3be0.png)

| key / command              | 説明                                                               |
| -------------------------- | ------------------------------------------------------------------ |
| `h,j,k,l`                  | カーソル移動                                                       |
| `?`                        | ヘルプ                                                             |
| `q`                        | 戻る                                                               |
| `f`                        | フィルタ (ドメインやリクエスト/レスポンスの内容でフィルタできる)   |
| `:export.clip curl @focus` | 選択中のリクエストを curl コマンドとしてクリップボードにコピーする |

## ショートカットの設定

```yaml
# ~/.mitmproxy/keys.yaml
- key: c
  ctx: ["flowlist"]
  cmd: export.clip curl @focus
  help: Export a flow as a curl command to the clipboard.
```

ref. [Keyboard shortcut for copying URL/curl command/etc. #2649](https://github.com/mitmproxy/mitmproxy/issues/2649#issuecomment-392342343)

## 通信内容を書き換える

このような Python スクリプトを用意して、起動時に指定することでリクエスト・レスポンスの内容を書き換えることができます。

```python
# client_hints_override.py
from mitmproxy import http

class ClientHintsOverride:
    def request(self, flow: http.HTTPFlow) -> None:
        flow.request.headers["sec-ch-ua-platform"] = "Windows"
        flow.request.headers["sec-ch-ua-platform-version"] = "10"

addons = [ClientHintsOverride()]
```

```sh
mitmproxy -s ./client_hints_override.py
```

ref. [Creating scripts for mitmproxy - Bad Gateway](https://lucaslegname.github.io/mitmproxy/2020/11/04/mitmproxy-scripts.html)
