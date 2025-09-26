/**
 * ローディング画面管理クラス
 */
class LoadingManager {
    constructor(selector) {
        this.el = document.querySelector(selector);
        this.pctEl = this.el?.querySelector("#loading-percentage");
        this.currentProgress = 0;
        
        if (!this.el) {
            console.error(`Loading element not found: ${selector}`);
            return;
        }

        console.log("LoadingManager initialized");
    }

    /**
     * ローディング画面を表示
     */
    show() {
        if (!this.el) return;
        this.el.style.display = "flex";
        console.log("Loading screen shown");
    }

    /**
     * ローディング画面を非表示（フェードアウト効果付き）
     */
    hide() {
        if (!this.el) return;
        
        // フェードアウト効果
        this.el.style.transition = "opacity 0.5s ease-out";
        this.el.style.opacity = "0";
        
        setTimeout(() => {
            this.el.style.display = "none";
            this.el.style.opacity = "1"; // 次回表示用にリセット
            this.el.style.transition = "";
            console.log("Loading screen hidden");
        }, 500);
    }

    /**
     * 読み込み進捗率を更新
     */
        updateProgress(percentage) {
        if (!this.pctEl) return;
        
        // 進捗率を0-100の範囲で制限
        percentage = Math.max(0, Math.min(100, percentage));
        
        // スムーズなプログレスバー更新
        const progressFill = this.el.querySelector(".progress-fill");
        if (progressFill) {
            progressFill.style.transition = "width 0.3s ease-out";
            progressFill.style.width = `${percentage}%`;
        }
        
        // 数値の変更もアニメーション化
        this.animatePercentage(this.currentProgress, percentage);
        this.currentProgress = percentage;
        
        console.log(`Loading progress: ${percentage}%`);
    }

    /**
     * パーセンテージ表示のアニメーション
     */
    animatePercentage(from, to) {
        const duration = 300;
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const current = Math.floor(from + (to - from) * progress);
            
            this.pctEl.innerText = `Loading: ${current}%`;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }

    /**
     * ローディングステータステキストを更新
     */
    updateStatus(statusText) {
        const statusEl = this.el.querySelector(".loading-status");
        if (statusEl) {
            statusEl.innerText = statusText;
        }
    }

    /**
     * ローディングテキストを変更
     */
    updateText(text) {
        if (!this.pctEl) return;
        this.pctEl.innerText = text;
        console.log(`Loading text updated: ${text}`);
    }

    /**
     * 現在の進捗率を取得
     */
    getCurrentProgress() {
        return this.currentProgress;
    }

    /**
     * ローディング画面が表示中かどうか
     */
    isVisible() {
        return this.el && this.el.style.display !== "none";
    }
}

