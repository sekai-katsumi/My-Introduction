class ARSceneManager {
    constructor({ loadingSelector, statusSelector, interactionOverlaySelector }) {
        this.statusDisplay = new StatusDisplay(statusSelector);
        this.loadingManager = new LoadingManager(loadingSelector);
        this.interactionOverlay = document.querySelector(interactionOverlaySelector);
        this.arScene = document.querySelector("#ar-scene");
        
        // 初期化フラグ
        this.isInitialized = false;
        this.isARReady = false;
        
        // マーカーと動画のマッピング（修正されたファイル名に対応）
        this.markerVideoMap = {
            "marker-01": { video: "#video-01", plane: "#plane-01" },
            "marker-02": { video: "#video-02", plane: "#plane-02" },
            "marker-03": { video: "#video-03", plane: "#plane-03" }
        };

        // 1件表示用：全てのマーカーを中央に配置
        this.markerOffsets = {
            "marker-01": { x: 0, y: 0, z: 0 },
            "marker-02": { x: 0, y: 0, z: 0 },
            "marker-03": { x: 0, y: 0, z: 0 }
        };

        // 動的オフセット調整フラグ（1件表示用に無効化）
        this.enableDynamicSeparation = false;  // 1件表示時は位置調整不要
        this.conflictDetectionEnabled = false; // 競合検出も無効化

        // 1件表示制御用プロパティ
        this.maxSimultaneousMarkers = 1;  // 同時表示マーカー数制限
        this.currentActiveMarker = null;  // 現在アクティブなマーカー
        this.markerQueue = [];            // マーカー検出キュー

        this.instances = [];

        console.log("ARSceneManager initialized with marker offsets:", this.markerOffsets);
    }

    /**
     * AR体験を開始（ユーザーインタラクション後）
     */
    async startAR() {
        try {
            console.log("Starting AR experience...");
            
            // インタラクションオーバーレイを非表示
            this.interactionOverlay.style.display = "none";
            
            // ローディング表示
            this.loadingManager.show();
            this.statusDisplay.update("ステータス: カメラ初期化中...");
    
            // Android Chrome/Edge専用の処理
            const isAndroidChrome = /Android.*Chrome|Android.*Edge/i.test(navigator.userAgent);
            
            if (isAndroidChrome) {
                console.log("Detected Android Chrome/Edge - using special initialization");
                await this.initializeForAndroidChrome();
            } else {
                console.log("Standard browser initialization");
                await this.standardInitialization();
            }
            
        } catch (error) {
            console.error("AR initialization failed:", error);
            this.handleInitializationError("AR初期化失敗");
        }
    }

    /**
     * Android Chrome/Edge専用初期化
     */
    async initializeForAndroidChrome() {
        try {
            // カメラ権限を先に確認・取得
            this.statusDisplay.update("ステータス: カメラアクセス確認中...");
            
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: 'environment',
                    width: { ideal: 640, min: 320, max: 1280 },
                    height: { ideal: 480, min: 240, max: 960 },
                    frameRate: { ideal: 30, max: 30 }
                } 
            });
            
            console.log("Camera permission granted for Android Chrome/Edge");
            
            // ストリームを即座に停止（AR.jsに任せる）
            stream.getTracks().forEach(track => track.stop());
            
            // A-Frameシーンを表示
            this.arScene.style.display = "block";
            
            // Android Chrome/Edge用の長い初期化待機
            this.statusDisplay.update("ステータス: ARカメラ初期化中...");
            
            // 段階的初期化
            await this.prepareVideos();
            this.initializeInstances();
            
            // AR.jsの完全な初期化を待つ
            setTimeout(() => {
                this.setupAREvents();
                console.log("Android Chrome/Edge initialization complete");
            }, 2000); // 2秒待機
            
        } catch (error) {
            console.error("Android Chrome/Edge initialization failed:", error);
            this.handleInitializationError(this.getErrorMessage(error));
        }
    }

    /**
     * 標準ブラウザ初期化（Firefox等）
     */
    async standardInitialization() {
        try {
            // A-Frameシーンを先に表示
            this.arScene.style.display = "block";
            
            // カメラ権限要求を遅延実行
            setTimeout(async () => {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ 
                        video: { 
                            facingMode: 'environment',
                            width: { ideal: 1280, min: 640, max: 1920 },
                            height: { ideal: 960, min: 480, max: 1080 },
                            aspectRatio: { ideal: 4/3 }
                        } 
                    });
                    
                    stream.getTracks().forEach(track => track.stop());
                    await this.continueARInitialization();
                    
                } catch (error) {
                    this.handleInitializationError(this.getErrorMessage(error));
                }
            }, 500);
            
        } catch (error) {
            this.handleInitializationError("標準初期化失敗");
        }
    }

    /**
     * エラーメッセージ取得
     */
    getErrorMessage(error) {
        if (error.name === 'NotAllowedError') {
            return "カメラ権限が拒否されています。ブラウザ設定から権限を許可してページを再読み込みしてください。";
        } else if (error.name === 'NotFoundError') {
            return "カメラが見つかりません。";
        } else if (error.name === 'NotReadableError') {
            return "カメラが他のアプリで使用中です。";
        }
        return "カメラアクセス許可が必要です";
    }

    /**
     * 初期化エラー処理
     */
    handleInitializationError(message) {
        this.arScene.style.display = "none";
        this.interactionOverlay.style.display = "flex";
        this.loadingManager.hide();
        this.statusDisplay.showError(message);
    }

    /**
     * AR初期化の継続処理
     */
    async continueARInitialization() {
        try {
            // 動画要素の準備とユーザーインタラクション設定
            await this.prepareVideos();
            
            // ARコンポーネントとインスタンス初期化（オフセット適用）
            this.initializeInstances();
            
            // AR.jsイベントリスナー設定
            this.setupAREvents();
    
            // 衝突検出システム開始
            if (this.conflictDetectionEnabled) {
                this.startConflictDetection();
            }
            
        } catch (error) {
            console.error("AR initialization continuation failed:", error);
            this.statusDisplay.showError("AR初期化失敗");
        }
    }

    /**
     * 動画要素の準備（メタデータ読み込み完了まで待機）
     */
    async prepareVideos() {
        const videoElements = Object.values(this.markerVideoMap).map(refs => 
            document.querySelector(refs.video)
        );

        const loadPromises = videoElements.map(video => {
            return new Promise((resolve, reject) => {
                if (video.readyState >= 1) { // HAVE_METADATA以上
                    resolve();
                } else {
                    const onLoad = () => {
                        video.removeEventListener("loadedmetadata", onLoad);
                        video.removeEventListener("error", onError);
                        resolve();
                    };
                    const onError = (e) => {
                        video.removeEventListener("loadedmetadata", onLoad);
                        video.removeEventListener("error", onError);
                        console.warn(`Video load failed: ${video.src}`, e);
                        resolve(); // エラーでも続行
                    };
                    
                    video.addEventListener("loadedmetadata", onLoad);
                    video.addEventListener("error", onError);
                    video.load(); // 再読み込みを強制
                }
            });
        });

        await Promise.all(loadPromises);
        console.log("All videos metadata loaded");
    }

    /**
     * VideoPlayer + VideoPlane + ARMarker インスタンス作成（オフセット適用版）
     */
    initializeInstances() {
        Object.entries(this.markerVideoMap).forEach(([markerId, refs]) => {
            // マーカー固有のオフセットを取得
            const markerOffset = this.markerOffsets[markerId] || { x: 0, y: 0, z: 0 };
            
            const videoPlayer = new VideoPlayer(refs.video);
            
            // VideoPlaneにオフセットを渡して初期化
            const videoPlane = new VideoPlane(refs.plane, videoPlayer, markerOffset);
            
            const arMarker = new ARMarker(`#${markerId}`, videoPlane, this.statusDisplay);
    
            this.instances.push({ 
                markerId, 
                videoPlayer, 
                videoPlane, 
                arMarker,
                offset: markerOffset
            });
    
            console.log(`Instance initialized: ${markerId} with offset:`, markerOffset);
        });
        
        console.log("All instances initialized with offsets:", this.instances.length);
    }

    /**
     * AR.jsイベントリスナー設定
     */
    setupAREvents() {
        // A-Frameシーン開始イベント
        this.arScene.addEventListener("renderstart", () => {
            console.log("A-Frame render started");
            if (!this.isARReady) {
                const isAndroidChrome = /Android.*Chrome|Android.*Edge/i.test(navigator.userAgent);
                const delay = isAndroidChrome ? 3000 : 1000; // Android Chrome/Edge用に長い遅延
                setTimeout(() => this.onARReady(), delay);
            }
        });

        // カメラソース準備完了イベント
        this.arScene.addEventListener("sourceReady", () => {
            console.log("AR.js camera ready");
            const isAndroidChrome = /Android.*Chrome|Android.*Edge/i.test(navigator.userAgent);
            const delay = isAndroidChrome ? 1500 : 0; // Android用に追加遅延
            setTimeout(() => this.onARReady(), delay);
        });

        // エラーハンドリング
        this.arScene.addEventListener("arError", (event) => {
            console.error("AR Error:", event.detail);
            this.statusDisplay.showError("カメラアクセス失敗");
        });

        // マーカー検出デバッグ用のイベント追加
        this.arScene.addEventListener("markerFound", (event) => {
            console.log("Global marker found event:", event.target.id);
            this.statusDisplay.update(`ステータス: ${event.target.id} 検出中`, true, 2000);
        });

        this.arScene.addEventListener("markerLost", (event) => {
            console.log("Global marker lost event:", event.target.id);
        });

        // 定期的なマーカー状態チェック（デバッグ用）
        setInterval(() => {
            if (this.isARReady) {
                this.checkMarkerStatus();
            }
        }, 5000); // 5秒間隔

        // 強制的なAR Ready（最終手段）
        const isAndroidChrome = /Android.*Chrome|Android.*Edge/i.test(navigator.userAgent);
        const maxTimeout = isAndroidChrome ? 8000 : 3000; // Android用に長いタイムアウト
        
        setTimeout(() => {
            if (!this.isARReady) {
                console.log("Force AR ready after extended timeout for Android Chrome/Edge");
                this.onARReady();
            }
        }, maxTimeout);
    }

    /**
     * マーカー状態チェック（デバッグ用）
     */
    checkMarkerStatus() {
        console.log("=== Marker Status Check ===");
        this.instances.forEach(({ markerId, arMarker }) => {
            const markerElement = document.querySelector(`#${markerId}`);
            const isVisible = markerElement ? markerElement.object3D.visible : false;
            console.log(`${markerId}: detected=${arMarker.isMarkerDetected()}, visible=${isVisible}`);
        });
        console.log("===========================");
    }

    /**
     * AR準備完了時の処理
     */
    onARReady() {
        if (this.isARReady) return; // 重複実行防止
        
        this.isARReady = true;
        console.log("AR ready, binding marker events with single display mode");
    
        // Chrome/Edge用の追加初期化遅延
        setTimeout(() => {
            // マーカーイベントをバインド（1件表示モード）
            this.instances.forEach(({ arMarker, markerId, offset }) => {
                arMarker.bindEvents();
                console.log(`Marker events bound: ${markerId} in single display mode`);
            });
    
            // ローディング非表示
            this.loadingManager.hide();
            this.statusDisplay.update("ステータス: マーカーを探しています...");
            
            console.log("AR Scene Manager fully initialized with single marker display mode");
        }, 1000); // Chrome/Edge用に1秒遅延
    }

    /**
     * 衝突検出・位置調整システム（1件表示用に無効化）
     */
    startConflictDetection() {
        // console.log("Starting conflict detection system");
        console.log("Conflict detection disabled in single marker mode");
        
        // setInterval(() => {
        //     this.detectAndResolveConflicts();
        // }, 2000); // 2秒毎に衝突チェック
    }

    /**
     * マーカー位置衝突の検出と解決
     */
    detectAndResolveConflicts() {
        const activeInstances = this.instances.filter(instance => 
            instance.arMarker.isMarkerDetected()
        );

        if (activeInstances.length <= 1) {
            return; // 衝突なし
        }

        console.log(`Potential conflict detected: ${activeInstances.length} active markers`);

        // 動的位置分離を実行
        activeInstances.forEach((instance, index) => {
            if (index === 0) return; // 最初のマーカーは基準として維持
            
            // 追加のランダムオフセットを適用
            const additionalOffset = {
                x: (Math.random() - 0.5) * 2, // -1から+1
                y: 0,
                z: (Math.random() - 0.5) * 1  // -0.5から+0.5
            };

            const newOffset = {
                x: instance.offset.x + additionalOffset.x,
                y: instance.offset.y + additionalOffset.y,
                z: instance.offset.z + additionalOffset.z
            };

            instance.videoPlane.updateOffset(newOffset);
            console.log(`Conflict resolution: ${instance.markerId} moved to:`, newOffset);
        });

        this.statusDisplay.update("ステータス: 複数マーカー検出 - 位置調整中");
    }

    /**
     * 手動オフセット調整（デバッグ・テスト用）
     */
    adjustMarkerOffset(markerId, newOffset) {
        const instance = this.instances.find(inst => inst.markerId === markerId);
        if (instance) {
            instance.videoPlane.updateOffset(newOffset);
            instance.offset = { ...instance.offset, ...newOffset };
            console.log(`Manual offset adjustment: ${markerId}`, newOffset);
        }
    }

    /**
     * 全マーカーの位置リセット
     */
    resetAllPositions() {
        this.instances.forEach(instance => {
            const originalOffset = this.markerOffsets[instance.markerId];
            instance.videoPlane.updateOffset(originalOffset);
            instance.offset = { ...originalOffset };
        });
        console.log("All marker positions reset to original offsets");
        this.statusDisplay.update("ステータス: マーカー位置をリセット");
    }

    /**
     * デバッグ情報出力
     */
    debugMarkerPositions() {
        console.log("=== Marker Position Debug Info ===");
        this.instances.forEach(instance => {
            console.log(`${instance.markerId}:`, {
                detected: instance.arMarker.isMarkerDetected(),
                visible: instance.videoPlane.getVisibility(),
                offset: instance.offset
            });
            instance.videoPlane.debugInfo();
        });
        console.log("==================================");
    }

    /**
     * NEW: 単一マーカー表示制御
     */
    handleMarkerActivation(markerId, arMarker) {
        // 既に同じマーカーがアクティブな場合は何もしない
        if (this.currentActiveMarker === markerId) {
            return true;
        }
        
        // 他のマーカーがアクティブな場合は非アクティブ化
        if (this.currentActiveMarker) {
            console.log(`Deactivating current marker: ${this.currentActiveMarker} to show: ${markerId}`);
            const currentInstance = this.instances.find(inst => inst.markerId === this.currentActiveMarker);
            if (currentInstance) {
                currentInstance.arMarker.forceDeactivate(); // 強制非アクティブ化
            }
        }
        
        // 新しいマーカーをアクティブ化
        this.currentActiveMarker = markerId;
        this.statusDisplay.update(`ステータス: ${markerId} 表示中（単一表示モード）`);
        console.log(`Single marker mode: Activated ${markerId}`);
        return true;
    }

    /**
     * NEW: マーカー非アクティブ化処理
     */
    handleMarkerDeactivation(markerId) {
        if (this.currentActiveMarker === markerId) {
            this.currentActiveMarker = null;
            console.log(`Single marker mode: Deactivated ${markerId}`);
            
            // 待機状態に戻す
            setTimeout(() => {
                if (!this.currentActiveMarker) {
                    this.statusDisplay.update("ステータス: マーカーを探しています...");
                }
            }, 500);
        }
    }

    /**
     * リソース解放
     */
    destroy() {
        this.instances.forEach(({ arMarker }) => {
            arMarker.destroy();
        });
        this.instances = [];
        
        if (this.loadingManager) {
            this.loadingManager.hide();
        }
        
        if (this.statusDisplay) {
            this.statusDisplay.destroy();
        }
        
        console.log("ARSceneManager destroyed");
    }
}
