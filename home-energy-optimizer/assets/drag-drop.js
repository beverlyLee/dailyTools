// 拖拽上传功能增强脚本
// 监听拖拽事件，提供更好的视觉反馈

document.addEventListener('DOMContentLoaded', function() {
    // 等待Dash组件加载完成
    setTimeout(initDragDropFeatures, 500);
});

function initDragDropFeatures() {
    const uploadArea = document.getElementById('upload-data');
    
    if (!uploadArea) {
        // 如果还没加载完成，再试一次
        setTimeout(initDragDropFeatures, 500);
        return;
    }

    console.log('✅ 拖拽上传功能已初始化');

    // 拖拽进入时添加样式
    uploadArea.addEventListener('dragenter', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.add('drag-active');
    });

    // 拖拽离开时移除样式
    uploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        e.stopPropagation();
        // 检查鼠标是否真的离开了元素
        const rect = this.getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;
        if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
            this.classList.remove('drag-active');
        }
    });

    // 拖拽悬停时保持样式
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.add('drag-active');
    });

    // 放置文件时移除样式
    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.remove('drag-active');
        
        // 添加成功动画反馈
        this.classList.add('upload-success');
        setTimeout(() => {
            this.classList.remove('upload-success');
        }, 1000);
    });

    // 整个文档的拖拽事件处理，防止文件在浏览器中打开
    document.addEventListener('dragenter', function(e) {
        if (e.target.id === 'upload-data') {
            e.preventDefault();
        }
    });

    document.addEventListener('dragover', function(e) {
        if (e.target.id === 'upload-data') {
            e.preventDefault();
        }
    });

    document.addEventListener('drop', function(e) {
        if (e.target.id === 'upload-data') {
            e.preventDefault();
        }
    });
}

// 监听Dash回调完成事件，确保动态内容加载后仍然可用
document.addEventListener('DOMSubtreeModified', function() {
    const uploadArea = document.getElementById('upload-data');
    if (uploadArea && !uploadArea.dataset.dragInitialized) {
        uploadArea.dataset.dragInitialized = 'true';
        initDragDropFeatures();
    }
});
