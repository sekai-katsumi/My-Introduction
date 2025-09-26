class ARMarker {
    constructor(selector, videoPlane, statusDisplay) {
        this.marker = document.querySelector(selector);
        this.videoPlane = videoPlane;
        this.statusDisplay = statusDisplay;
        this.isDetected = false;
        this.lastDetectionTime = 0;
        
        // デバウンス用のタイマー
        this.foundTimeout = null;
        this.lostTimeout = null;
        
        if (!this.marker) {
            console.error(`Marker not found: ${selector}`);
            return;
        }

        console.log(`ARMarker initialized for: ${this.marker.id}`);
    }

    /**
     * マーカーイベントをバインド
     */
    bindEvents() {
        if (!this.marker) return;

        // マーカー検出イベント（デバウンス付き）
        this.marker.addEventListener("markerFound", (event) => {
            console.log(`Marker found: ${this.marker.id}`);
            this.handleMarkerFound();
        });

        // マーカー消失イベント（デバウンス付き）
        this.marker.addEventListener("markerLost", (event) => {
            console.log(`Marker lost: ${this.marker.id}`);
            this.handleMarkerLost();
        });

        // AR.jsマーカーの直接イベント（代替手段）
        this.marker.addEventListener("markervisible", (event) => {
            console.log(`Marker visible: ${this.marker.id}`);
            this.handleMarkerFound();
        });

        this.marker.addEventListener("markerinvisible", (event) => {
            console.log(`Marker invisible: ${this.marker.id}`);
            this.handleMarkerLost();
        });

        console.log(`Events bound for marker: ${this.marker.id}`);

        // AR.js固有のイベントも追加でリッスン
        if (this.marker.components && this.marker.components['arjs-anchor']) {
            console.log(`AR.js anchor component found for: ${this.marker.id}`);
        }

        // マーカーエレメントの準備完了チェック
        const checkMarkerReady = () => {
            if (this.marker.object3D && this.marker.object3D.visible !== undefined) {
                console.log(`Marker object3D ready: ${this.marker.id}`);
                return true;
            }
            return false;
        };

        if (!checkMarkerReady()) {
            setTimeout(() => {
                if (checkMarkerReady()) {
                    console.log(`Delayed marker ready: ${this.marker.id}`);
                }
            }, 1000);
        }
    }

    /**
     * マーカー検出時の処理（デバウンス機能付き）
     */
    handleMarkerFound() {
        // 既に検出状態の場合は何もしない
        if (this.isDetected) return;

        // 消失タイマーをクリア
        if (this.lostTimeout) {
            clearTimeout(this.lostTimeout);
            this.lostTimeout = null;
        }

        // 検出タイマー設定（短時間で複数発火を防ぐ）
        if (this.foundTimeout) {
            clearTimeout(this.foundTimeout);
        }

        this.foundTimeout = setTimeout(() => {
            this.activateMarker();
            this.foundTimeout = null;
        }, 100); // 100ms のデバウンス
    }

    /**
     * マーカー消失時の処理（デバウンス機能付き）
     */
    handleMarkerLost() {
        // 検出タイマーをクリア
        if (this.foundTimeout) {
            clearTimeout(this.foundTimeout);
            this.foundTimeout = null;
        }

        // 消失タイマー設定（一時的な消失を無視）
        if (this.lostTimeout) {
            clearTimeout(this.lostTimeout);
        }

        this.lostTimeout = setTimeout(() => {
            this.deactivateMarker();
            this.lostTimeout = null;
        }, 1500); // 1.5秒に延長して安定性向上
    }

    /**
     * マーカーアクティベーション（1件表示対応）
     */
    activateMarker() {
        if (this.isDetected) return;
        
        // マーカー検出強度をチェック
        const markerElement = this.marker;
        if (markerElement && markerElement.object3D) {
            const confidence = this.getMarkerConfidence();
            if (confidence < 0.3) {
                console.log(`Marker confidence too low: ${confidence} for ${this.marker.id}`);
                return;
            }
            console.log(`Marker confidence: ${confidence} for ${this.marker.id}`);
        }
        
        // ARSceneManagerで単一表示制御をチェック
        if (window.arSceneManager && !window.arSceneManager.handleMarkerActivation(this.marker.id, this)) {
            console.log(`Marker activation blocked by single display mode: ${this.marker.id}`);
            return;
        }
        
        this.isDetected = true;
        this.lastDetectionTime = Date.now();
        
        console.log(`Activating marker (single mode): ${this.marker.id}`);
        
        // ステータス更新（1件表示モード表示）
        // this.statusDisplay.update(`ステータス: ${this.marker.id} 検出中`);
        
        // 動画プレーンを表示・再生（中央配置）
        this.videoPlane.show();
        
        // 少し遅延を入れて動画再生（プレーン表示完了後）
        setTimeout(async () => {
            try {
                await this.videoPlane.videoPlayer.play();
                console.log(`Video started for marker (single mode): ${this.marker.id}`);
            } catch (error) {
                console.warn(`Failed to start video for marker ${this.marker.id}:`, error);
                // this.statusDisplay.update(`エラー: ${this.marker.id} 動画再生失敗`);
            }
        }, 200);
    }

    /**
     * マーカー非アクティベーション（1件表示対応）
     */
    deactivateMarker() {
        if (!this.isDetected) return;
        
        this.isDetected = false;
        
        console.log(`Deactivating marker (single mode): ${this.marker.id}`);
        
        // 🆕 ARSceneManagerに非アクティブ化を通知
        if (window.arSceneManager) {
            window.arSceneManager.handleMarkerDeactivation(this.marker.id);
        }
        
        // 動画プレーンを非表示・一時停止
        this.videoPlane.hide();
    }

    /**
     * NEW: 強制非アクティブ化（他マーカー表示時の強制切り替え用）
     */
    forceDeactivate() {
        if (!this.isDetected) return;
        
        console.log(`Force deactivating marker: ${this.marker.id}`);
        
        // タイマーをクリア
        if (this.foundTimeout) {
            clearTimeout(this.foundTimeout);
            this.foundTimeout = null;
        }
        
        if (this.lostTimeout) {
            clearTimeout(this.lostTimeout);
            this.lostTimeout = null;
        }
        
        // 即座に非アクティブ化
        this.isDetected = false;
        this.videoPlane.hideImmediate(); // アニメーションなしで即座に非表示
        
        console.log(`Force deactivated marker: ${this.marker.id}`);
    }

    /**
     * マーカーの検出状態確認
     */
    isMarkerDetected() {
        return this.isDetected;
    }

    /**
     * 最後の検出時刻取得
     */
    getLastDetectionTime() {
        return this.lastDetectionTime;
    }

    /**
     * マーカー検出の信頼度を取得
     */
    getMarkerConfidence() {
        try {
            if (this.marker && this.marker.object3D && this.marker.object3D.visible) {
                // マーカーの可視性を基準にした簡易信頼度計算
                const scale = this.marker.object3D.scale;
                const position = this.marker.object3D.position;
                
                // スケールと位置の安定性で信頼度を算出
                const scaleStability = Math.min(scale.x, scale.y, scale.z);
                const positionStability = 1.0 / (1.0 + Math.abs(position.z));
                
                return Math.min(scaleStability * positionStability, 1.0);
            }
            return 0;
        } catch (error) {
            console.warn(`Error calculating marker confidence: ${error}`);
            return 0.5; // デフォルト値
        }
    }


    /**
     * リソース解放
     */
    destroy() {
        if (this.foundTimeout) {
            clearTimeout(this.foundTimeout);
            this.foundTimeout = null;
        }
        
        if (this.lostTimeout) {
            clearTimeout(this.lostTimeout);
            this.lostTimeout = null;
        }
        
        console.log(`ARMarker destroyed: ${this.marker.id}`);
    }
}