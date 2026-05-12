class GeometryFilter {
    constructor(options = {}) {
        this.minAspectRatio = options.minAspectRatio || 0.01;
        this.maxAspectRatio = options.maxAspectRatio || 100;
        this.minHeight = options.minHeight || 4;
        this.maxHeight = options.maxHeight || 800;
        this.minWidth = options.minWidth || 4;
        this.maxWidth = options.maxWidth || 8000;
        this.minFillRatio = options.minFillRatio || 0.001;
        this.maxFillRatio = options.maxFillRatio || 1.0;
        
        this.enableIconFiltering = options.enableIconFiltering === true;
        
        console.log('GeometryFilter 初始化完成');
    }

    filter(regions) {
        console.log('几何筛选前区域数:', regions.length);
        
        if (regions.length === 0) return [];
        
        const filtered = regions.filter(region => this.isValidTextRegion(region));
        console.log('几何筛选后区域数:', filtered.length);
        
        if (filtered.length === 0 && regions.length > 0) {
            console.warn('几何筛选过滤掉了所有区域！');
            return regions;
        }
        
        return filtered;
    }

    isValidTextRegion(region) {
        if (!this.checkDimensions(region)) {
            return false;
        }
        
        if (!this.checkAspectRatio(region)) {
            return false;
        }
        
        if (!this.checkFillRatio(region)) {
            return false;
        }
        
        if (this.enableIconFiltering && this.isProbablyIcon(region)) {
            return false;
        }
        
        return true;
    }

    checkDimensions(region) {
        const { width, height } = region;
        
        if (width < this.minWidth) return false;
        if (width > this.maxWidth) return false;
        if (height < this.minHeight) return false;
        if (height > this.maxHeight) return false;
        
        return true;
    }

    checkAspectRatio(region) {
        const { width, height } = region;
        
        const aspectRatio = width / height;
        
        if (aspectRatio < this.minAspectRatio) return false;
        if (aspectRatio > this.maxAspectRatio) return false;
        
        return true;
    }

    checkFillRatio(region) {
        const { width, height, area } = region;
        
        if (!area || area === 0) {
            return true;
        }
        
        const boundingArea = width * height;
        const fillRatio = area / boundingArea;
        
        if (fillRatio < this.minFillRatio) return false;
        if (fillRatio > this.maxFillRatio) return false;
        
        return true;
    }

    isProbablyIcon(region) {
        const { width, height, area } = region;
        
        if (!area || area === 0) {
            return false;
        }
        
        const aspectRatio = width / height;
        const fillRatio = area / (width * height);
        
        if (width < 20 || height < 20) {
            return false;
        }
        
        if (width > 100 || height > 100) {
            return false;
        }
        
        const isSquare = aspectRatio > 0.6 && aspectRatio < 1.7;
        const isFilled = fillRatio > 0.8;
        
        if (isSquare && isFilled) {
            console.log('过滤图标:', width, 'x', height, '填充率:', fillRatio.toFixed(2));
            return true;
        }
        
        return false;
    }

    setOptions(options) {
        if (options.minAspectRatio !== undefined) {
            this.minAspectRatio = options.minAspectRatio;
        }
        if (options.maxAspectRatio !== undefined) {
            this.maxAspectRatio = options.maxAspectRatio;
        }
        if (options.minHeight !== undefined) {
            this.minHeight = options.minHeight;
        }
        if (options.maxHeight !== undefined) {
            this.maxHeight = options.maxHeight;
        }
        if (options.minWidth !== undefined) {
            this.minWidth = options.minWidth;
        }
        if (options.maxWidth !== undefined) {
            this.maxWidth = options.maxWidth;
        }
        if (options.minFillRatio !== undefined) {
            this.minFillRatio = options.minFillRatio;
        }
        if (options.maxFillRatio !== undefined) {
            this.maxFillRatio = options.maxFillRatio;
        }
        if (options.enableIconFiltering !== undefined) {
            this.enableIconFiltering = options.enableIconFiltering;
        }
    }
}

export { GeometryFilter };
