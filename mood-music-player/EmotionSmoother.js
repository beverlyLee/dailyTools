export class EmotionSmoother {
    constructor(options = {}) {
        this.windowSize = options.windowSize || 30;
        this.stableThreshold = options.stableThreshold || 0.6;
        this.switchDelay = options.switchDelay || 5000;

        this.history = [];
        this.currentStableEmotion = null;
        this.currentStableStartTime = null;
        this.lastSwitchTime = 0;

        this.onStableEmotion = null;
        this.onEmotionSmooth = null;
    }

    addFrame(emotions) {
        const now = Date.now();
        const frameData = {
            time: now,
            emotions: this.normalizeEmotions(emotions),
            dominant: this.getDominantEmotion(emotions)
        };

        this.history.push(frameData);

        while (this.history.length > this.windowSize) {
            this.history.shift();
        }

        const smoothed = this.calculateWeightedAverage();

        if (this.onEmotionSmooth) {
            this.onEmotionSmooth(smoothed);
        }

        this.checkStableEmotion(smoothed, now);

        return smoothed;
    }

    normalizeEmotions(emotions) {
        const result = {};
        const emotionKeys = ['happy', 'sad', 'angry', 'neutral', 'surprised', 'fearful', 'disgusted'];
        
        emotionKeys.forEach(key => {
            result[key] = emotions[key] || 0;
        });

        const total = Object.values(result).reduce((sum, val) => sum + val, 0);
        
        if (total > 0) {
            Object.keys(result).forEach(key => {
                result[key] = result[key] / total;
            });
        }

        return result;
    }

    getDominantEmotion(emotions) {
        let maxKey = 'neutral';
        let maxVal = 0;

        Object.entries(emotions).forEach(([key, value]) => {
            if (value > maxVal) {
                maxVal = value;
                maxKey = key;
            }
        });

        return maxKey;
    }

    calculateWeightedAverage() {
        const now = Date.now();
        const result = {
            happy: 0, sad: 0, angry: 0, neutral: 0,
            surprised: 0, fearful: 0, disgusted: 0
        };

        if (this.history.length === 0) {
            return result;
        }

        let totalWeight = 0;

        this.history.forEach((frame, index) => {
            const age = (now - frame.time) / 1000;
            const recencyWeight = Math.exp(-age / 10);
            const positionWeight = (index + 1) / this.history.length;
            const weight = recencyWeight * positionWeight;

            Object.keys(result).forEach(key => {
                result[key] += frame.emotions[key] * weight;
            });

            totalWeight += weight;
        });

        if (totalWeight > 0) {
            Object.keys(result).forEach(key => {
                result[key] = result[key] / totalWeight;
            });
        }

        return result;
    }

    checkStableEmotion(smoothed, now) {
        const dominant = this.getDominantEmotion(smoothed);
        const confidence = smoothed[dominant];

        if (confidence >= this.stableThreshold) {
            if (this.currentStableEmotion !== dominant) {
                this.currentStableEmotion = dominant;
                this.currentStableStartTime = now;
            } else {
                const duration = now - this.currentStableStartTime;

                if (duration >= this.switchDelay) {
                    if (now - this.lastSwitchTime >= this.switchDelay) {
                        this.lastSwitchTime = now;

                        if (this.onStableEmotion) {
                            this.onStableEmotion(dominant, duration / 1000);
                        }
                    }
                }
            }
        } else {
            this.currentStableEmotion = null;
            this.currentStableStartTime = null;
        }
    }

    getCurrentStableDuration() {
        if (!this.currentStableStartTime || !this.currentStableEmotion) {
            return 0;
        }
        return (Date.now() - this.currentStableStartTime) / 1000;
    }

    reset() {
        this.history = [];
        this.currentStableEmotion = null;
        this.currentStableStartTime = null;
        this.lastSwitchTime = 0;
    }
}
