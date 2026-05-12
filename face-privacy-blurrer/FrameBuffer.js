export class FrameBuffer {
    constructor(options = {}) {
        this.options = {
            maxFrames: options.maxFrames || 5,
            smoothingFactor: options.smoothingFactor || 0.3,
            iouThreshold: options.iouThreshold || 0.3,
            trackTimeout: options.trackTimeout || 500
        };
        
        this.frameHistory = [];
        this.trackedFaces = new Map();
        this.lastFrameTime = 0;
        this.trackIdCounter = 0;
    }

    process(detections) {
        console.log('[FrameBuffer] 收到检测结果:', detections.length, '个');
        
        if (detections.length > 0) {
            const det = detections[0];
            console.log('[FrameBuffer] 第一个检测的坐标:', 'x=', det.x, 'y=', det.y, 'width=', det.width, 'height=', det.height);
        }
        
        return detections;
    }

    reset() {
        console.log('[FrameBuffer] 重置');
        this.frameHistory = [];
        this.trackedFaces.clear();
        this.lastFrameTime = 0;
        this.trackIdCounter = 0;
    }
}
