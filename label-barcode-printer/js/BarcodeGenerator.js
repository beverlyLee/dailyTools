class BarcodeGenerator {
    constructor() {
        this.qrCodeLibLoaded = false;
        this.checkQRCodeLibrary();
    }

    checkQRCodeLibrary() {
        this.qrCodeLibLoaded = typeof qrcode === 'function';
    }

    generateCode128(code, options = {}) {
        const canvas = document.createElement('canvas');
        const width = options.width || 2;
        const height = options.height || 80;
        const displayValue = options.displayValue !== undefined ? options.displayValue : true;
        const fontSize = options.fontSize || 12;
        const margin = options.margin || 2;

        try {
            JsBarcode(canvas, code, {
                format: 'CODE128',
                width: width,
                height: height,
                displayValue: displayValue,
                fontSize: fontSize,
                margin: margin,
                lineColor: '#000000',
                background: '#ffffff'
            });
            return canvas;
        } catch (error) {
            console.error('Error generating Code128 barcode:', error);
            return null;
        }
    }

    generateQRCode(code, options = {}) {
        if (!this.qrCodeLibLoaded) {
            this.checkQRCodeLibrary();
        }

        if (!this.qrCodeLibLoaded) {
            console.error('QRCode library not available');
            return this.generateCode128(code, options);
        }

        const size = options.size || 120;

        try {
            const typeNumber = 0;
            const errorCorrectionLevel = 'M';

            const qr = qrcode(typeNumber, errorCorrectionLevel);
            qr.addData(code);
            qr.make();

            const moduleCount = qr.getModuleCount();
            const cellSize = Math.max(2, Math.floor(size / (moduleCount + 4)));
            const actualSize = moduleCount * cellSize;

            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;

            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, size, size);

            const offset = (size - actualSize) / 2;
            ctx.save();
            ctx.translate(offset, offset);

            qr.renderTo2dContext(ctx, cellSize);
            ctx.restore();

            return canvas;
        } catch (error) {
            console.error('Error generating QR code:', error);
            return this.generateCode128(code, options);
        }
    }

    generate(code, type = 'code128', options = {}) {
        if (type === 'qrcode') {
            return this.generateQRCode(code, options);
        }
        return this.generateCode128(code, options);
    }

    generateCode128Sync(code, options = {}) {
        return this.generateCode128(code, options);
    }

    async generateAll(items, type = 'code128', options = {}) {
        const results = [];
        for (const item of items) {
            const canvas = this.generate(item.code, type, options);
            results.push({
                ...item,
                barcodeCanvas: canvas
            });
        }
        return results;
    }

    canvasToImageData(canvas) {
        if (!canvas) return null;
        const ctx = canvas.getContext('2d');
        return ctx.getImageData(0, 0, canvas.width, canvas.height);
    }
}

window.BarcodeGenerator = BarcodeGenerator;
