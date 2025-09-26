# WebAR動画体験デモ

このプロジェクトは、軽量なWebAR体験を提供する技術デモです。スマートフォンのカメラを利用して、マーカーを読み取ると動画が再生されます。将来的には製品カタログやガイドページも統合したWebアプリ（PWA対応）として拡張可能です。

---

## ディレクトリ構成

推奨されるディレクトリ構成は以下の通りです。

```text
myIntroduction/
├── assets/
│   ├── images/                 # サイト用画像(ロゴやサムネイル)      
│   ├── markers/                # ARマーカー(pattファイル)
│   └── videos/                 # 動画(mp4)
├── css/
│   └── style.css
├── js/
│   ├── video/                  # 動画関連スクリプト
│   │   ├── alternativeVideo.js
│   │   ├── videoPlane.js
│   │   └── videoPlayer.js
│   ├── ar/                     # AR関連スクリプト
│   │   ├── arMarker.js
│   │   └── arSceneManager.js
│   └── core/                   # 共通ユーティリティ
│       ├── loadingManager.js
│       ├── serviceWorker.js
│       └── statusDisplay.js
├── pages/
│   ├── guide.html
│   ├── benefit.html
│   └── information.html
├── favicon.ico
├── index.html
├── manifest.json                 
└── README.md
```

* `assets/`：動画やマーカー画像を格納
* `css/`：スタイルシート
* `js/`：JavaScript モジュール
* HTML ファイル：各ページ

---

## 主要機能

* AR動画再生
　マーカーを認識すると指定した動画が再生されます。
* ユーザー操作による開始
　「AR体験を開始」ボタンでカメラアクセスとAR表示を制御。
* ステータス表示
　ARシーンの読み込みや認識状況を画面上に表示。
* 軽量構成
　HTML/CSS/JS + 動画・マーカーのみで動作可能。

---

## 技術スタック

* A-Frame (WebVR / WebARフレームワーク)
* AR.js (マーカー型ARライブラリ)
* HTML5 / CSS3 / JavaScript (ES6+)
* 静的サイトホスティング：GitHub Pages / Netlify

---

## 開発・動作確認

* リポジトリをクローン
　git clone [Github-URL](https://github.com/sekai-katsumi/My-Introduction.git)

* pages/index.html をブラウザで開く（ローカルで表示確認可能）

* モバイル端末でのテストでは HTTPS 環境が必要
　ファイル構成を確認し、assets/videos と assets/markers 内のファイルを適切に配置
