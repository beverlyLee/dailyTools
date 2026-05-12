class ObjectDetector {
    constructor(options = {}) {
        this.modelUrl = options.modelUrl || 'https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0.25_224/model.json';
        this.version = options.version || 1;
        this.alpha = options.alpha || 0.25;
        this.model = null;
        this.isLoaded = false;
    }

    async load() {
        if (this.isLoaded && this.model) {
            return this.model;
        }

        console.log('正在加载 MobileNet 模型...');
        
        try {
            this.model = await tf.loadLayersModel(this.modelUrl);
            this.isLoaded = true;
            console.log('MobileNet 模型加载成功！');
            return this.model;
        } catch (error) {
            console.error('模型加载失败:', error);
            throw new Error('模型加载失败: ' + error.message);
        }
    }

    async detect(tensor, topN = 5) {
        if (!this.isLoaded) {
            await this.load();
        }

        console.log('\n========== ObjectDetector.detect ==========');
        console.log('开始模型推理...');
        console.log('输入 tensor 形状:', tensor.shape);
        console.log('输入 tensor 数据类型:', tensor.dtype);
        
        try {
            const predictions = tf.tidy(() => {
                const result = this.model.predict(tensor);
                console.log('模型输出形状:', result.shape);
                
                const values = result.dataSync();
                console.log('原始输出数组长度:', values.length);
                
                const allPredictions = Array.from(values)
                    .map((probability, index) => ({ index, probability }));
                
                console.log('原始输出数组样本（前10个）:');
                allPredictions.slice(0, 10).forEach((pred, i) => {
                    console.log(`  [${pred.index}] ${(pred.probability * 100).toFixed(4)}%`);
                });
                
                const maxProb = Math.max(...values);
                const minProb = Math.min(...values);
                console.log('最大概率:', (maxProb * 100).toFixed(4) + '%');
                console.log('最小概率:', (minProb * 100).toFixed(4) + '%');
                
                const sorted = allPredictions
                    .sort((a, b) => b.probability - a.probability)
                    .slice(0, topN);
                
                return sorted;
            });

            console.log('模型推理完成，得到', predictions.length, '个 Top-', topN, '预测结果');
            console.log('============================================\n');
            
            return predictions;
        } catch (error) {
            console.error('模型推理失败:', error);
            throw new Error('模型推理失败: ' + error.message);
        }
    }

    async detectImage(imageElement, topN = 5) {
        if (!this.isLoaded) {
            await this.load();
        }

        const tensor = tf.tidy(() => {
            const img = tf.browser.fromPixels(imageElement);
            const resized = tf.image.resizeBilinear(img, [224, 224]);
            const normalized = resized.toFloat().div(127.5).sub(1);
            return normalized.expandDims(0);
        });

        try {
            const predictions = await this.detect(tensor, topN);
            tensor.dispose();
            return predictions;
        } catch (error) {
            tensor.dispose();
            throw error;
        }
    }

    dispose() {
        if (this.model) {
            this.model.dispose();
            this.model = null;
            this.isLoaded = false;
            console.log('模型已释放');
        }
    }

    getModelInfo() {
        return {
            version: this.version,
            alpha: this.alpha,
            isLoaded: this.isLoaded,
            modelUrl: this.modelUrl
        };
    }
}

export { ObjectDetector };
