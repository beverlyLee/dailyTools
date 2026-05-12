class LabelLayoutManager {
    constructor() {
        this.DPI = 96;
        this.MM_TO_PX = this.DPI / 25.4;
    }

    mmToPx(mm) {
        return Math.round(mm * this.MM_TO_PX);
    }

    pxToMm(px) {
        return px / this.MM_TO_PX;
    }

    calculateLabelCanvas(items, options = {}) {
        const paperWidthMm = options.paperWidth || 58;
        const labelHeightMm = options.labelHeight || 40;
        const fontSize = options.fontSize || 14;
        const barcodeType = options.barcodeType || 'code128';

        const paperWidthPx = this.mmToPx(paperWidthMm);
        const labelHeightPx = this.mmToPx(labelHeightMm);
        const totalHeightPx = labelHeightPx * items.length;

        const canvas = document.createElement('canvas');
        canvas.width = paperWidthPx;
        canvas.height = totalHeightPx;

        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, paperWidthPx, totalHeightPx);

        const padding = Math.round(paperWidthPx * 0.05);

        items.forEach((item, index) => {
            const yOffset = index * labelHeightPx;
            this.drawLabel(ctx, item, yOffset, paperWidthPx, labelHeightPx, padding, fontSize, barcodeType);
            
            if (index < items.length - 1) {
                ctx.strokeStyle = '#999999';
                ctx.setLineDash([5, 3]);
                ctx.beginPath();
                ctx.moveTo(0, yOffset + labelHeightPx);
                ctx.lineTo(paperWidthPx, yOffset + labelHeightPx);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        });

        return {
            canvas: canvas,
            paperWidthMm: paperWidthMm,
            paperWidthPx: paperWidthPx,
            totalHeightPx: totalHeightPx,
            totalHeightMm: this.pxToMm(totalHeightPx),
            labelCount: items.length
        };
    }

    drawLabel(ctx, item, yOffset, paperWidth, labelHeight, padding, fontSize, barcodeType) {
        ctx.fillStyle = '#000000';
        ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;

        const nameX = padding;
        const nameY = yOffset + padding + fontSize;
        const maxTextWidth = paperWidth - padding * 2;

        this.wrapText(ctx, item.name, nameX, nameY, maxTextWidth, Math.round(fontSize * 1.3), 2);

        if (item.barcodeCanvas) {
            const barcodeWidth = item.barcodeCanvas.width;
            const barcodeHeight = item.barcodeCanvas.height;
            
            let scaleX = (paperWidth - padding * 2) / barcodeWidth;
            let scaleY = 1;
            const maxBarcodeHeight = labelHeight - padding * 2 - fontSize * 3;
            
            if (barcodeHeight * scaleX > maxBarcodeHeight) {
                scaleX = maxBarcodeHeight / barcodeHeight;
                scaleY = scaleX;
            }

            const finalWidth = barcodeWidth * scaleX;
            const finalHeight = barcodeHeight * scaleY;
            
            const x = (paperWidth - finalWidth) / 2;
            const y = yOffset + labelHeight - finalHeight - padding;

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(item.barcodeCanvas, x, y, finalWidth, finalHeight);
        }
    }

    wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
        const words = text.split('');
        let line = '';
        let lines = [];

        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n];
            const metrics = ctx.measureText(testLine);
            const testWidth = metrics.width;

            if (testWidth > maxWidth && n > 0) {
                lines.push(line);
                line = words[n];
            } else {
                line = testLine;
            }
        }
        lines.push(line);

        lines = lines.slice(0, maxLines);
        lines.forEach((lineText, index) => {
            ctx.fillText(lineText, x, y + index * lineHeight);
        });
    }

    createPreviewCanvas(canvas, maxPreviewWidth = 800) {
        const previewCanvas = document.createElement('canvas');
        const scale = Math.min(1, maxPreviewWidth / canvas.width);
        
        previewCanvas.width = Math.round(canvas.width * scale);
        previewCanvas.height = Math.round(canvas.height * scale);
        
        const ctx = previewCanvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(canvas, 0, 0, previewCanvas.width, previewCanvas.height);
        
        return previewCanvas;
    }

    exportToImage(canvas, format = 'png') {
        const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
        return canvas.toDataURL(mimeType, 1.0);
    }

    downloadImage(canvas, filename = 'labels.png') {
        const dataUrl = this.exportToImage(canvas);
        const link = document.createElement('a');
        link.download = filename;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    print(canvas) {
        const imageDataUrl = this.exportToImage(canvas);
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        
        if (!printWindow || printWindow.closed || typeof printWindow.closed === 'undefined') {
            alert('打印窗口被浏览器拦截，请允许弹窗后重试');
            return;
        }

        const printDocument = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>标签打印</title>
                <style>
                    @page {
                        margin: 0;
                        padding: 0;
                    }
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    body {
                        margin: 0;
                        padding: 10px;
                        display: flex;
                        justify-content: center;
                        align-items: flex-start;
                        background: white;
                    }
                    #labelImage {
                        max-width: 100%;
                        height: auto;
                        display: block;
                    }
                    @media print {
                        body {
                            padding: 0;
                        }
                    }
                </style>
            </head>
            <body>
                <img id="labelImage" src="${imageDataUrl}" onload="triggerPrint()">
                <script>
                    function triggerPrint() {
                        setTimeout(function() {
                            window.focus();
                            window.print();
                        }, 500);
                    }
                    setTimeout(function() {
                        if (!document.getElementById('labelImage').complete) {
                            window.focus();
                            window.print();
                        }
                    }, 2000);
                <\/script>
            </body>
            </html>
        `;

        printWindow.document.open();
        printWindow.document.write(printDocument);
        printWindow.document.close();
    }
}

window.LabelLayoutManager = LabelLayoutManager;
