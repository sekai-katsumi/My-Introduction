class VideoPlayer {
    constructor(selector) {
        this.video = document.querySelector(selector);
        this.playing = false;
        this.playAttempted = false;
        this.retryCount = 0;
        this.maxRetries = 3;
        this.audioEnabled = true; // 音声有効フラグ
        this.defaultVolume = 0.8; // デフォルト音量
        
        if (!this.video) {
            console.error(`Video element not found: ${selector}`);
            return;
        }

        // iOS Safari対応のための設定
        this.video.setAttribute('webkit-playsinline', 'true');
        this.video.setAttribute('playsinline', 'true');
        
        // 音声設定：最初はミュート、ユーザー操作後に有効化
        this.video.muted = true; // 自動再生のため初期はミュート
        this.video.volume = this.defaultVolume;
        
        // 動画の状態をログ出力
        this.setupVideoEvents();
        
        console.log(`VideoPlayer initialized: ${this.video.id} with audio support`);
    }

    /**
     * 動画イベントリスナー設定（音声対応版）
     */
    setupVideoEvents() {
        this.video.addEventListener('loadstart', () => {
            console.log(`Video ${this.video.id}: Load started`);
        });

        this.video.addEventListener('loadedmetadata', () => {
            console.log(`Video ${this.video.id}: Metadata loaded`);
        });

        this.video.addEventListener('canplay', () => {
            console.log(`Video ${this.video.id}: Can start playing`);
        });

        this.video.addEventListener('playing', () => {
            console.log(`Video ${this.video.id}: Started playing`);
            this.playing = true;
            this.retryCount = 0;
            
            // 音声を有効化（ユーザー操作後）
            if (this.audioEnabled && this.video.muted) {
                this.enableAudio();
            }
        });

        this.video.addEventListener('pause', () => {
            console.log(`Video ${this.video.id}: Paused`);
            this.playing = false;
        });

        this.video.addEventListener('ended', () => {
            console.log(`Video ${this.video.id}: Ended`);
            this.playing = false;
        });

        this.video.addEventListener('error', (e) => {
            console.error(`Video ${this.video.id} error:`, e);
            this.playing = false;
        });

        this.video.addEventListener('stalled', () => {
            console.warn(`Video ${this.video.id}: Playback stalled`);
        });

        this.video.addEventListener('waiting', () => {
            console.warn(`Video ${this.video.id}: Waiting for data`);
        });

        // 音声関連イベント
        this.video.addEventListener('volumechange', () => {
            console.log(`Video ${this.video.id}: Volume changed to ${this.video.volume}, muted: ${this.video.muted}`);
        });
    }

    /**
     * 動画再生（音声対応版）
     */
    async play() {
        if (!this.video || this.playing) {
            return;
        }

        try {
            // 動画が準備できるまで待機
            if (this.video.readyState < 2) {
                await this.waitForVideoReady();
            }

            console.log(`Attempting to play video: ${this.video.id} (attempt ${this.retryCount + 1})`);
            
            // 最初はミュートで再生開始
            this.video.muted = true;
            
            const playPromise = this.video.play();
            
            if (playPromise !== undefined) {
                await playPromise;
                this.playing = true;
                this.playAttempted = true;
                console.log(`Successfully playing video: ${this.video.id}`);
                
                // 再生開始後、少し遅延して音声を有効化
                if (this.audioEnabled) {
                    setTimeout(() => {
                        this.enableAudio();
                    }, 500);
                }
            }

        } catch (error) {
            console.warn(`Video play failed for ${this.video.id} (attempt ${this.retryCount + 1}):`, error.message);
            
            // リトライ処理
            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                setTimeout(() => this.play(), 500 * this.retryCount);
                return;
            }
            
            // 自動再生失敗時の対策
            if (error.name === 'NotAllowedError') {
                console.log("Autoplay blocked - user interaction required");
                this.requestUserInteraction();
            }
        }
    }

    /**
     * 音声を有効化
     */
    enableAudio() {
        if (!this.video || !this.audioEnabled) return;
        
        try {
            // ユーザージェスチャーが必要な場合の処理
            const enableAudioGesture = () => {
                this.video.muted = false;
                this.video.volume = this.defaultVolume;
                console.log(`Audio enabled for ${this.video.id}, volume: ${this.video.volume}`);
                
                // 一回だけ実行するためイベントリスナーを削除
                document.removeEventListener('click', enableAudioGesture);
                document.removeEventListener('touchstart', enableAudioGesture);
            };
            
            // 直接音声有効化を試行
            this.video.muted = false;
            
            // 失敗した場合はユーザージェスチャーを待つ
            if (this.video.muted) {
                console.log(`Audio requires user gesture for ${this.video.id}`);
                document.addEventListener('click', enableAudioGesture, { once: true });
                document.addEventListener('touchstart', enableAudioGesture, { once: true });
            } else {
                console.log(`Audio immediately enabled for ${this.video.id}`);
            }
            
        } catch (error) {
            console.warn(`Failed to enable audio for ${this.video.id}:`, error);
        }
    }

    /**
     * 音声を無効化
     */
    disableAudio() {
        if (!this.video) return;
        
        this.video.muted = true;
        console.log(`Audio disabled for ${this.video.id}`);
    }

    /**
     * 音声の有効/無効を切り替え
     */
    toggleAudio() {
        if (!this.video) return;
        
        if (this.video.muted) {
            this.enableAudio();
        } else {
            this.disableAudio();
        }
        
        return !this.video.muted;
    }

    /**
     * 動画準備完了まで待機
     */
    async waitForVideoReady() {
        return new Promise((resolve) => {
            const checkReady = () => {
                if (this.video.readyState >= 2) {
                    resolve();
                } else {
                    setTimeout(checkReady, 100);
                }
            };
            
            if (this.video.readyState >= 2) {
                resolve();
            } else {
                this.video.addEventListener('canplay', resolve, { once: true });
                checkReady();
            }
        });
    }

    /**
     * 動画一時停止
     */
    pause() {
        if (!this.video || !this.playing) {
            return;
        }

        try {
            this.video.pause();
            this.playing = false;
            console.log(`Paused video: ${this.video.id}`);
        } catch (error) {
            console.warn(`Video pause failed for ${this.video.id}:`, error);
        }
    }

    /**
     * 動画を先頭に戻す
     */
    reset() {
        if (!this.video) return;
        
        try {
            this.video.currentTime = 0;
            console.log(`Reset video: ${this.video.id}`);
        } catch (error) {
            console.warn(`Video reset failed for ${this.video.id}:`, error);
        }
    }

    /**
     * ユーザーインタラクションが必要な場合の処理
     */
    requestUserInteraction() {
        // 動画要素をクリック可能にする
        this.video.style.pointerEvents = 'auto';
        this.video.style.zIndex = '1000';
        this.video.style.cursor = 'pointer';
        
        // ワンタイムクリックイベントを追加
        const handleClick = async () => {
            try {
                await this.video.play();
                this.playing = true;
                this.video.style.pointerEvents = '';
                this.video.style.zIndex = '';
                this.video.style.cursor = '';
                
                // ユーザー操作後に音声を有効化
                if (this.audioEnabled) {
                    this.enableAudio();
                }
                
                console.log(`User interaction enabled playback for: ${this.video.id}`);
            } catch (error) {
                console.error(`User interaction play failed: ${error}`);
            }
            this.video.removeEventListener('click', handleClick);
        };
        
        this.video.addEventListener('click', handleClick, { once: true });
        console.log(`Click to play enabled for: ${this.video.id}`);
    }

    /**
     * イベントリスナー追加
     */
    on(event, callback) {
        if (!this.video) return;
        this.video.addEventListener(event, callback);
    }

    /**
     * 動画の準備状態確認
     */
    isReady() {
        return this.video && this.video.readyState >= 2;
    }

    /**
     * 動画の再生状態確認
     */
    isPlaying() {
        return this.playing && !this.video.paused;
    }

    /**
     * 音声有効状態確認
     */
    isAudioEnabled() {
        return this.video && !this.video.muted && this.audioEnabled;
    }

    /**
     * 動画の現在時刻取得
     */
    getCurrentTime() {
        return this.video ? this.video.currentTime : 0;
    }

    /**
     * 動画の長さ取得
     */
    getDuration() {
        return this.video ? this.video.duration : 0;
    }

    /**
     * 音量設定
     */
    setVolume(volume) {
        if (!this.video) return;
        
        volume = Math.max(0, Math.min(1, volume));
        this.video.volume = volume;
        this.defaultVolume = volume;
        
        console.log(`Volume set for ${this.video.id}: ${volume}`);
    }

    /**
     * 音量取得
     */
    getVolume() {
        return this.video ? this.video.volume : 0;
    }

    /**
     * 音声設定の有効/無効
     */
    setAudioEnabled(enabled) {
        this.audioEnabled = enabled;
        
        if (enabled && this.playing) {
            this.enableAudio();
        } else if (!enabled) {
            this.disableAudio();
        }
        
        console.log(`Audio ${enabled ? 'enabled' : 'disabled'} for ${this.video.id}`);
    }

    /**
     * リソース解放
     */
    destroy() {
        if (this.video) {
            this.pause();
            this.reset();
            this.video.style.pointerEvents = '';
            this.video.style.zIndex = '';
            this.video.style.cursor = '';
        }
        console.log(`VideoPlayer destroyed: ${this.video ? this.video.id : 'unknown'}`);
    }
}