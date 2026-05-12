class ImagePreprocessor {
    constructor(options = {}) {
        this.targetSize = options.targetSize || 224;
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
    }

    preprocess(img) {
        this.canvas.width = this.targetSize;
        this.canvas.height = this.targetSize;
        
        const scale = Math.max(this.targetSize / img.width, this.targetSize / img.height);
        const scaledWidth = img.width * scale;
        const scaledHeight = img.height * scale;
        const offsetX = (this.targetSize - scaledWidth) / 2;
        const offsetY = (this.targetSize - scaledHeight) / 2;
        
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.targetSize, this.targetSize);
        
        this.ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
        
        return this.normalize();
    }

    normalize() {
        const imageData = this.ctx.getImageData(0, 0, this.targetSize, this.targetSize);
        const data = imageData.data;
        
        const tensorData = new Float32Array(1 * this.targetSize * this.targetSize * 3);
        
        let idx = 0;
        for (let i = 0; i < data.length; i += 4) {
            tensorData[idx++] = (data[i] / 255.0) * 2.0 - 1.0;
            tensorData[idx++] = (data[i + 1] / 255.0) * 2.0 - 1.0;
            tensorData[idx++] = (data[i + 2] / 255.0) * 2.0 - 1.0;
        }
        
        return tf.tensor4d(tensorData, [1, this.targetSize, this.targetSize, 3]);
    }

    getCanvas() {
        return this.canvas;
    }
}

export { ImagePreprocessor };
