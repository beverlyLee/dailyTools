class BackgroundBlender {
    constructor() {
        this.backgroundImage = null;
        this.backgroundVideo = null;
        this.shadowIntensity = 0.3;
        this.shadowBlur = 15;
        this.blendMode = 'normal';
        
        this._bgCanvas = document.createElement('canvas');
        this._bgCtx = this._bgCanvas.getContext('2d');
        this._lastBgWidth = 0;
        this._lastBgHeight = 0;
        this._lastVideoTime = -1;
    }

    async setBackgroundImage(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.backgroundImage = img;
                this.backgroundVideo = null;
                this._lastVideoTime = -1;
                resolve(img);
            };
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    }

    setBackgroundImageURL(url) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            this.backgroundImage = img;
            this.backgroundVideo = null;
            this._lastVideoTime = -1;
        };
        img.src = url;
    }

    async setBackgroundVideo(file) {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.muted = true;
            video.loop = true;
            video.autoplay = true;
            video.playsInline = true;
            video.preload = 'auto';
            
            video.oncanplay = () => {
                this.backgroundVideo = video;
                this.backgroundImage = null;
                this._lastVideoTime = -1;
                video.play().catch(() => {});
                resolve(video);
            };
            video.onerror = reject;
            video.src = URL.createObjectURL(file);
        });
    }

    setBackgroundVideoElement(videoElement) {
        this.backgroundVideo = videoElement;
        this.backgroundImage = null;
        this._lastVideoTime = -1;
        if (videoElement.paused) {
            videoElement.play().catch(() => {});
        }
    }

    setShadowIntensity(value) {
        this.shadowIntensity = Math.max(0, Math.min(1, value));
    }

    setShadowBlur(value) {
        this.shadowBlur = Math.max(0, value);
    }

    clearBackground() {
        this.backgroundImage = null;
        this.backgroundVideo = null;
        this._lastVideoTime = -1;
    }

    _updateBgCanvas(width, height) {
        if (this._bgCanvas.width !== width || this._bgCanvas.height !== height) {
            this._bgCanvas.width = width;
            this._bgCanvas.height = height;
        }
        
        const ctx = this._bgCtx;
        
        if (this.backgroundVideo) {
            if (this.backgroundVideo.readyState >= 2) {
                const currentTime = this.backgroundVideo.currentTime;
                if (currentTime !== this._lastVideoTime) {
                    this._lastVideoTime = currentTime;
                    const vw = this.backgroundVideo.videoWidth;
                    const vh = this.backgroundVideo.videoHeight;
                    const scale = Math.max(width / vw, height / vh);
                    const sw = vw * scale;
                    const sh = vh * scale;
                    const sx = (width - sw) / 2;
                    const sy = (height - sh) / 2;
                    
                    ctx.fillStyle = '#000';
                    ctx.fillRect(0, 0, width, height);
                    ctx.drawImage(this.backgroundVideo, sx, sy, sw, sh);
                }
            }
        } else if (this.backgroundImage) {
            const iw = this.backgroundImage.width;
            const ih = this.backgroundImage.height;
            const scale = Math.max(width / iw, height / ih);
            const sw = iw * scale;
            const sh = ih * scale;
            const sx = (width - sw) / 2;
            const sy = (height - sh) / 2;
            
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(this.backgroundImage, sx, sy, sw, sh);
        } else {
            ctx.fillStyle = '#222';
            ctx.fillRect(0, 0, width, height);
        }
    }

    drawBackground(ctx, width, height) {
        this._updateBgCanvas(width, height);
        ctx.drawImage(this._bgCanvas, 0, 0);
    }

    blend(ctx, foregroundImageData, width, height) {
        this._updateBgCanvas(width, height);
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');
        
        tempCtx.drawImage(this._bgCanvas, 0, 0);
        
        const fgCanvas = document.createElement('canvas');
        fgCanvas.width = width;
        fgCanvas.height = height;
        const fgCtx = fgCanvas.getContext('2d');
        fgCtx.putImageData(foregroundImageData, 0, 0);
        
        if (this.shadowIntensity > 0) {
            const shadowCanvas = document.createElement('canvas');
            shadowCanvas.width = width;
            shadowCanvas.height = height;
            const shadowCtx = shadowCanvas.getContext('2d');
            
            shadowCtx.fillStyle = 'rgba(0, 0, 0, 0)';
            shadowCtx.fillRect(0, 0, width, height);
            shadowCtx.drawImage(fgCanvas, 0, 0);
            
            const shadowData = shadowCtx.getImageData(0, 0, width, height);
            const shadowPixels = shadowData.data;
            for (let i = 0; i < shadowPixels.length; i += 4) {
                const alpha = shadowPixels[i + 3];
                if (alpha > 0) {
                    shadowPixels[i] = 0;
                    shadowPixels[i + 1] = 0;
                    shadowPixels[i + 2] = 0;
                    shadowPixels[i + 3] = Math.min(255, alpha * this.shadowIntensity);
                }
            }
            shadowCtx.putImageData(shadowData, 0, 0);
            
            const blurCanvas = document.createElement('canvas');
            blurCanvas.width = width;
            blurCanvas.height = height;
            const blurCtx = blurCanvas.getContext('2d');
            blurCtx.filter = `blur(${this.shadowBlur}px)`;
            blurCtx.drawImage(shadowCanvas, 10, 20);
            
            tempCtx.drawImage(blurCanvas, 0, 0);
        }
        
        tempCtx.drawImage(fgCanvas, 0, 0);
        
        ctx.drawImage(tempCanvas, 0, 0);
    }
}
