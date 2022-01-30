# Arch Linux インストールメモ

Arch Linuxのインストールから、基本的なデスクトップ環境、Webブラウザと日本語入力をインストールするまでのメモです。
基本的には [Installation Guide](https://wiki.archlinux.org/title/installation_guide) の流れの通りですが、今後のアップデートで問題が発生したときに対応できるように設定した内容を残すことが目的です。
(特に考えることがなかった部分は省略します。)

- ハードウェア: ThinkPad T490s
- インストールに使用したイメージ: [archlinux-2022.01.01-x86_64.iso](http://ftp.jaist.ac.jp/pub/Linux/ArchLinux/iso/2022.01.01/archlinux-2022.01.01-x86_64.iso)
- デュアルブート: なし
- Desktop環境: Gnome

---
ここからはライブ環境での操作

## パーティショニング

- EFI用とroot用の2つに分割
- 後でswapfileを追加するのでswap用パーティションはなし
- rootファイルシステムは [LUKS on a partition](https://wiki.archlinux.org/title/Dm-crypt/Encrypting_an_entire_system#LUKS_on_a_partition) の方法で暗号化
  - `cryptsetup open /dev/nvme0n1p2 root` とすると `/dev/mapper/root` を通して暗号化されたvolumeに読み書きできるようになる。

```
NAME        MAJ:MIN RM   SIZE RO TYPE  MOUNTPOINTS
nvme0n1     259:0    0 238.5G  0 disk
├─nvme0n1p1 259:1    0   512M  0 part  /boot
└─nvme0n1p2 259:2    0   238G  0 part
  └─root    254:0    0   238G  0 crypt /
```

## パッケージのインストール

- KernelはLTS版のlinux-ltsを選択 [ref](https://wiki.archlinux.org/title/Kernel)
- その他、最低限必要なパッケージを追加でインストール

```sh
pacstrap /mnt base linux-lts linux-firmware \
  neovim iwd sudo intel-ucode
```

## Initramfs

volumeを暗号化しているのでHOOKSにencryptを追加。

```conf
# mkinitcpio.conf
HOOKS=(... block encrypt filesystem ...)
```

## ブートローダー

- [systemd-boot](https://wiki.archlinux.org/title/Systemd-boot) を選択。追加でパッケージをインストールする必要がなく、機能も必要十分だったため。
- Intelのプロセッサを使っているので intel-ucode を読み込むように設定。
- volumeを暗号化しているのでoptionsに設定を追加。

```conf
# /boot/loader/entries/arch.conf
title   Arch Linux
linux   /vmlinuz-linux-lts
initrd  /intel-ucode.img
initrd  /initramfs-linux-lts.img
options cryptdevice=UUID=4fdc1b7b-1991-4458-b33c-8639d59b3758:root root=/dev/mapper/root
```

---
ここからはインストール後のrootユーザによる操作

## ユーザ作成

```sh
# sudoが使えるようにwheel groupに追加しておく
useradd -m -g wheel me

# パスワード設定
passwd me
```

```conf
# /etc/sudoers ( edit by command 'EDITOR=nvim visudo' )
%wheel ALL=(ALL) ALL
```

---
ここからは追加した一般ユーザによる操作

## Wifi設定

Gnome & NetworkManagerをインストールするまではiwdを使う。
※ 先にNetworkManagerをインストールしてnmcliを使うでも良かったが、ライブ環境にインストールされていたiwdを初めて触ったので、使ってみたかった。

iwdの設定 [ref](https://wiki.archlinux.org/title/Iwd#Optional_configuration)
- DHCPを使うには `EnableNetworkConfiguration=True` が必要
- DNSの設定も必要で、特に追加パッケージのインストールが不要なsystemdのものを使うことにした。

```conf
# /etc/iwd/main.conf

[General]
EnableNetworkConfiguration=True

[Network]
NameResolvingService=systemd
```

```sh
# Gnomeインストール後はNetworkManagerを使うのでenableにはしない
sudo systemctl start iwd
sudo systemctl start systemd-resolved
```

## Gnomeのインストール
[ref](https://wiki.archlinux.org/title/GNOME)

```sh
# パッケージのインストール
sudo pacman -Sy gnome gnome-terminal networkmanager

# 自動起動設定
sudo systemctl enable gdm
sudo systemctl enable NetworkManager

sudo reboot
```

## フォント

```sh
# Notoフォントをインストール
sudo pacman -Sy noto-fonts noto-fonts-cjk noto-fonts-emoji

# 購入したフォントを ~/.fonts に配置
```

## ブラウザ (Google Chrome)

インストール
```sh
# AURを使うには開発用パッケージが必要
sudo pacman -Sy base-devel

mkdir ~/aur
cd ~/aur

git clone https://aur.archlinux.org/google-chrome
cd google-chrome

makepkg -si
```

画面共有できるようにする [ref](https://wiki.archlinux.org/title/PipeWire#WebRTC_screen_sharing)
```sh
sudo pacman -Sy xdg-desktop-portal xdg-desktop-portal-gnome
```
[chrome://flags/#enable-webrtc-pipewire-capturer](chrome://flags/#enable-webrtc-pipewire-capturer) を有効化

## 日本語入力 (Mozc)

[ref](https://wiki.archlinux.org/title/Fcitx5)

```sh
sudo pacman -Sy fcitx5-im fcitx5-mozc
```

環境変数を設定
```
# /etc/environment

GTK_IM_MODULE=fcitx
QT_IM_MODULE=fcitx
XMODIFIERS=@im=fcitx
```

## 残タスク

- Swapfileの追加
- AUR Helperをインストール (AURからインストールしたパッケージを簡単に更新できるようにしたい)
