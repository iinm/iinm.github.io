# Arch Linux インストールメモ

Arch Linuxのインストールから、基本的なデスクトップ環境、Webブラウザと日本語入力をインストールするまでのメモです。
基本的には [Installation Guide](https://wiki.archlinux.org/title/installation_guide) の流れの通りですが、今後のアップデートで問題が発生したときに対応できるように設定した内容を残すことが目的です。
(特に考えることがなかった部分は省略します。)

- ハードウェア: ThinkPad T490s
- インストールに使用したイメージ: [archlinux-2022.01.01-x86_64.iso](http://ftp.jaist.ac.jp/pub/Linux/ArchLinux/iso/2022.01.01/)
- デュアルブート: なし
- Desktop環境: GNOME

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

- KernelはLTS版のlinux-ltsを選択
- その他、最低限必要なパッケージを追加でインストール

```sh
pacstrap /mnt base linux-lts linux-firmware \
  neovim iwd sudo intel-ucode
```

ref. [Kernel - ArchWiki](https://wiki.archlinux.org/title/Kernel)

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

## Swapfile追加

```sh
dd if=/dev/zero of=/swapfile bs=1M count=512 status=progress
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
```

```
# /etc/fstab

/swapfile none swap defaults 0 0
```

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

GNOME & NetworkManagerをインストールするまではiwdを使う。
※ 先にNetworkManagerをインストールしてnmcliを使うでも良かったが、ライブ環境にインストールされていたiwdを初めて触ったので、使ってみたかった。

iwdの設定
- DHCPを使うには `EnableNetworkConfiguration=True` が必要
- DNSの設定も必要で、特に追加パッケージのインストールが不要なsystemdのものを使うことにした。

```conf
# /etc/iwd/main.conf

[General]
EnableNetworkConfiguration=True

[Network]
NameResolvingService=systemd
```

ref. [iwd - ArchWiki](https://wiki.archlinux.org/title/Iwd#Optional_configuration)

```sh
# GNOMEインストール後はNetworkManagerを使うのでenableにはしない
sudo systemctl start iwd
sudo systemctl start systemd-resolved
```

## GNOMEのインストール
```sh
# パッケージのインストール
sudo pacman -Sy gnome gnome-terminal networkmanager

# 自動起動設定
sudo systemctl enable gdm
sudo systemctl enable NetworkManager

sudo reboot
```

ref. [GNOME - ArchWiki](https://wiki.archlinux.org/title/GNOME)

## フォント

```sh
# Notoフォントをインストール
sudo pacman -Sy noto-fonts noto-fonts-cjk noto-fonts-emoji

# その他、購入したフォントを ~/.fonts に配置
```

## AUR Helperのインストール

```sh
# AURを使うには開発用パッケージが必要
sudo pacman -Sy git base-devel

cd ~/Downloads
git clone https://aur.archlinux.org/yay-bin.git && cd yay-bin
makepkg -si
```

ref. [yay](https://github.com/Jguer/yay)

## ブラウザ (Google Chrome)

インストール
```sh
yay -Sy google-chrome
```

画面共有できるようにする
```sh
sudo pacman -Sy xdg-desktop-portal xdg-desktop-portal-gnome
```
[chrome://flags/#enable-webrtc-pipewire-capturer](chrome://flags/#enable-webrtc-pipewire-capturer) を有効化

ref. [PipeWire - ArchWiki](https://wiki.archlinux.org/title/PipeWire#WebRTC_screen_sharing)

## 日本語入力 (Mozc)

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

ref. [Fcitx5 - ArchWiki](https://wiki.archlinux.org/title/Fcitx5)