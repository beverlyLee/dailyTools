export class RegionSelector {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.regions = [];
        this.selectedRegionId = null;
        this.isDrawing = false;
        this.dragStart = { x: 0, y: 0 };
        this.currentDrag = { x: 0, y: 0 };
        this.dragMode = null;
        this.minRegionSize = options.minRegionSize || 20;
        this.handleSize = options.handleSize || 8;
        this.onRegionsChange = options.onRegionsChange || null;
        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;

        this.bindEvents();
    }

    bindEvents() {
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('mouseleave', (e) => this.handleMouseLeave(e));
        this.canvas.addEventListener('contextmenu', (e) => this.handleContextMenu(e));
    }

    updateScale(scale, offsetX = 0, offsetY = 0) {
        this.scale = scale;
        this.offsetX = offsetX;
        this.offsetY = offsetY;
    }

    getCanvasCoords(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left - this.offsetX) / this.scale,
            y: (e.clientY - rect.top - this.offsetY) / this.scale
        };
    }

    handleMouseDown(e) {
        if (e.button !== 0) return;

        const coords = this.getCanvasCoords(e);
        const handle = this.getHandleAt(coords);
        const region = this.getRegionAt(coords);

        if (handle) {
            this.dragMode = handle.type;
            this.selectedRegionId = handle.regionId;
            this.dragStart = coords;
            this.currentDrag = { ...coords };
            this.canvas.style.cursor = this.getCursorForHandle(handle.type);
        } else if (region) {
            this.dragMode = 'move';
            this.selectedRegionId = region.id;
            this.dragStart = coords;
            this.currentDrag = { ...coords };
            this.canvas.style.cursor = 'move';
        } else {
            this.dragMode = 'create';
            this.selectedRegionId = null;
            this.isDrawing = true;
            this.dragStart = coords;
            this.currentDrag = { ...coords };
            this.canvas.style.cursor = 'crosshair';
        }

        this.render();
    }

    handleMouseMove(e) {
        const coords = this.getCanvasCoords(e);

        if (this.dragMode) {
            this.currentDrag = coords;

            if (this.dragMode === 'create') {
                this.render();
            } else {
                this.updateRegionPosition(this.selectedRegionId, coords);
                this.render();
            }
        } else {
            const handle = this.getHandleAt(coords);
            const region = this.getRegionAt(coords);

            if (handle) {
                this.canvas.style.cursor = this.getCursorForHandle(handle.type);
            } else if (region) {
                this.canvas.style.cursor = 'move';
            } else {
                this.canvas.style.cursor = 'crosshair';
            }
        }
    }

    handleMouseUp(e) {
        if (!this.dragMode) return;

        const coords = this.getCanvasCoords(e);

        if (this.dragMode === 'create') {
            const region = this.finishCreatingRegion(coords);
            if (region) {
                this.selectedRegionId = region.id;
            }
        }

        this.dragMode = null;
        this.isDrawing = false;
        this.render();
        this.notifyChange();
    }

    handleMouseLeave(e) {
        if (this.dragMode === 'create') {
            const coords = this.getCanvasCoords(e);
            const region = this.finishCreatingRegion(coords);
            if (region) {
                this.selectedRegionId = region.id;
            }
        }

        this.dragMode = null;
        this.isDrawing = false;
        this.render();
    }

    handleContextMenu(e) {
        e.preventDefault();
        const coords = this.getCanvasCoords(e);
        const region = this.getRegionAt(coords);

        if (region) {
            this.removeRegion(region.id);
            this.render();
            this.notifyChange();
        }
    }

    getHandleAt(coords) {
        for (const region of this.regions) {
            const handles = this.getRegionHandles(region);
            for (const handle of handles) {
                if (this.isPointInRect(coords, handle)) {
                    return { ...handle, regionId: region.id };
                }
            }
        }
        return null;
    }

    getRegionHandles(region) {
        const handleHalf = this.handleSize / 2;
        return [
            { type: 'nw', x: region.x - handleHalf, y: region.y - handleHalf },
            { type: 'ne', x: region.x + region.width - handleHalf, y: region.y - handleHalf },
            { type: 'sw', x: region.x - handleHalf, y: region.y + region.height - handleHalf },
            { type: 'se', x: region.x + region.width - handleHalf, y: region.y + region.height - handleHalf },
            { type: 'n', x: region.x + region.width / 2 - handleHalf, y: region.y - handleHalf },
            { type: 's', x: region.x + region.width / 2 - handleHalf, y: region.y + region.height - handleHalf },
            { type: 'w', x: region.x - handleHalf, y: region.y + region.height / 2 - handleHalf },
            { type: 'e', x: region.x + region.width - handleHalf, y: region.y + region.height / 2 - handleHalf }
        ];
    }

    getCursorForHandle(handleType) {
        const cursors = {
            nw: 'nw-resize',
            ne: 'ne-resize',
            sw: 'sw-resize',
            se: 'se-resize',
            n: 'n-resize',
            s: 's-resize',
            w: 'w-resize',
            e: 'e-resize'
        };
        return cursors[handleType] || 'default';
    }

    isPointInRect(point, rect) {
        return point.x >= rect.x &&
               point.x <= rect.x + this.handleSize &&
               point.y >= rect.y &&
               point.y <= rect.y + this.handleSize;
    }

    getRegionAt(coords) {
        for (let i = this.regions.length - 1; i >= 0; i--) {
            const region = this.regions[i];
            if (coords.x >= region.x && coords.x <= region.x + region.width &&
                coords.y >= region.y && coords.y <= region.y + region.height) {
                return region;
            }
        }
        return null;
    }

    updateRegionPosition(regionId, coords) {
        const region = this.regions.find(r => r.id === regionId);
        if (!region) return;

        const deltaX = coords.x - this.dragStart.x;
        const deltaY = coords.y - this.dragStart.y;

        if (this.dragMode === 'move') {
            region.x += deltaX;
            region.y += deltaY;
        } else {
            this.resizeRegion(region, this.dragMode, deltaX, deltaY);
        }

        this.dragStart = coords;
    }

    resizeRegion(region, handleType, deltaX, deltaY) {
        const minSize = this.minRegionSize;

        switch (handleType) {
            case 'nw':
                region.x += deltaX;
                region.y += deltaY;
                region.width -= deltaX;
                region.height -= deltaY;
                break;
            case 'ne':
                region.y += deltaY;
                region.width += deltaX;
                region.height -= deltaY;
                break;
            case 'sw':
                region.x += deltaX;
                region.width -= deltaX;
                region.height += deltaY;
                break;
            case 'se':
                region.width += deltaX;
                region.height += deltaY;
                break;
            case 'n':
                region.y += deltaY;
                region.height -= deltaY;
                break;
            case 's':
                region.height += deltaY;
                break;
            case 'w':
                region.x += deltaX;
                region.width -= deltaX;
                break;
            case 'e':
                region.width += deltaX;
                break;
        }

        if (region.width < minSize) {
            region.width = minSize;
        }
        if (region.height < minSize) {
            region.height = minSize;
        }

        region.x = Math.max(0, region.x);
        region.y = Math.max(0, region.y);
        region.width = Math.min(this.canvas.width - region.x, region.width);
        region.height = Math.min(this.canvas.height - region.y, region.height);
    }

    finishCreatingRegion(coords) {
        const startX = Math.min(this.dragStart.x, coords.x);
        const startY = Math.min(this.dragStart.y, coords.y);
        const width = Math.abs(coords.x - this.dragStart.x);
        const height = Math.abs(coords.y - this.dragStart.y);

        if (width < this.minRegionSize || height < this.minRegionSize) {
            return null;
        }

        const region = {
            id: this.getNextId(),
            type: 'custom',
            label: '手动区域',
            x: Math.max(0, startX),
            y: Math.max(0, startY),
            width: Math.min(width, this.canvas.width - startX),
            height: Math.min(height, this.canvas.height - startY),
            masked: true
        };

        this.regions.push(region);
        return region;
    }

    getNextId() {
        if (this.regions.length === 0) return 0;
        return Math.max(...this.regions.map(r => r.id)) + 1;
    }

    setRegions(regions) {
        this.regions = regions.map((r, index) => ({
            ...r,
            id: index
        }));
        this.selectedRegionId = this.regions.length > 0 ? 0 : null;
        this.render();
        this.notifyChange();
    }

    addRegion(region) {
        const newRegion = {
            ...region,
            id: this.getNextId()
        };
        this.regions.push(newRegion);
        this.selectedRegionId = newRegion.id;
        this.render();
        this.notifyChange();
        return newRegion;
    }

    removeRegion(regionId) {
        const index = this.regions.findIndex(r => r.id === regionId);
        if (index !== -1) {
            this.regions.splice(index, 1);
            if (this.selectedRegionId === regionId) {
                this.selectedRegionId = this.regions.length > 0 ? this.regions[0].id : null;
            }
        }
    }

    clearRegions() {
        this.regions = [];
        this.selectedRegionId = null;
        this.render();
        this.notifyChange();
    }

    getRegions() {
        return [...this.regions];
    }

    getMaskedRegions() {
        return this.regions.filter(r => r.masked);
    }

    toggleRegionMask(regionId) {
        const region = this.regions.find(r => r.id === regionId);
        if (region) {
            region.masked = !region.masked;
            this.render();
            this.notifyChange();
        }
    }

    render() {
        this.ctx.save();

        this.regions.forEach(region => {
            this.renderRegion(region, region.id === this.selectedRegionId);
        });

        if (this.dragMode === 'create') {
            this.renderTemporaryRegion();
        }

        this.ctx.restore();
    }

    renderRegion(region, isSelected) {
        const ctx = this.ctx;
        const color = this.getRegionColor(region.type);

        ctx.save();

        if (region.masked) {
            ctx.fillStyle = isSelected ? color + '40' : color + '20';
        } else {
            ctx.fillStyle = 'rgba(128, 128, 128, 0.1)';
        }
        ctx.fillRect(region.x, region.y, region.width, region.height);

        ctx.strokeStyle = isSelected ? color : (region.masked ? color : '#888');
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.strokeRect(region.x, region.y, region.width, region.height);

        if (region.label) {
            ctx.fillStyle = isSelected ? color : (region.masked ? color : '#888');
            ctx.font = 'bold 12px Arial';
            ctx.fillText(region.label, region.x + 5, region.y + 15);
        }

        if (isSelected) {
            this.renderHandles(region, color);
        }

        ctx.restore();
    }

    getRegionColor(type) {
        const colors = {
            idCard: '#ff6b6b',
            bankCard: '#4ecdc4',
            phone: '#45b7d1',
            custom: '#96ceb4',
            other: '#dda0dd'
        };
        return colors[type] || '#ff6b6b';
    }

    renderHandles(region, color) {
        const ctx = this.ctx;
        const handles = this.getRegionHandles(region);

        ctx.fillStyle = color;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;

        handles.forEach(handle => {
            ctx.fillRect(handle.x, handle.y, this.handleSize, this.handleSize);
            ctx.strokeRect(handle.x, handle.y, this.handleSize, this.handleSize);
        });
    }

    renderTemporaryRegion() {
        const ctx = this.ctx;
        const startX = Math.min(this.dragStart.x, this.currentDrag.x);
        const startY = Math.min(this.dragStart.y, this.currentDrag.y);
        const width = Math.abs(this.currentDrag.x - this.dragStart.x);
        const height = Math.abs(this.currentDrag.y - this.dragStart.y);

        ctx.save();
        ctx.fillStyle = 'rgba(255, 107, 107, 0.2)';
        ctx.strokeStyle = '#ff6b6b';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.fillRect(startX, startY, width, height);
        ctx.strokeRect(startX, startY, width, height);
        ctx.restore();
    }

    notifyChange() {
        if (this.onRegionsChange) {
            this.onRegionsChange(this.getRegions());
        }
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.regions = [];
        this.selectedRegionId = null;
    }
}
