window.AMapHeatmap = {
    map: null,
    heatmap: null,
    markers: [],
    
    init: function(containerId, centerLat, centerLng, ak) {
        const self = this;
        
        const script = document.createElement('script');
        script.src = `https://webapi.amap.com/maps?v=2.0&key=${ak}&plugin=AMap.Heatmap`;
        script.async = true;
        
        script.onload = function() {
            self.map = new AMap.Map(containerId, {
                zoom: 11,
                center: [centerLng, centerLat],
                mapStyle: 'amap://styles/light'
            });
            
            AMap.plugin(['AMap.Heatmap'], function() {
                self.heatmap = new AMap.Heatmap(self.map, {
                    radius: window.heatmapConfig.radius || 40,
                    opacity: [0, window.heatmapConfig.opacity || 0.7],
                    gradient: {
                        0.4: 'blue',
                        0.6: 'cyan',
                        0.8: 'lime',
                        1.0: 'red'
                    }
                });
            });
            
            if (window.dashHeatmapData) {
                self.updateHeatmap(window.dashHeatmapData);
            }
        };
        
        script.onerror = function() {
            console.error('高德地图加载失败，请检查API密钥配置');
            document.getElementById(containerId).innerHTML = 
                '<div style="padding:20px;text-align:center;color:red;">高德地图加载失败，请检查API密钥配置</div>';
        };
        
        document.head.appendChild(script);
    },
    
    updateHeatmap: function(data) {
        const self = this;
        
        if (!self.map || !self.heatmap) {
            window.dashHeatmapData = data;
            return;
        }
        
        self.markers.forEach(marker => marker.setMap(null));
        self.markers = [];
        
        if (!data || data.length === 0) {
            self.heatmap.setDataSet({ data: [] });
            return;
        }
        
        const heatData = data.map(function(item) {
            return {
                lng: item.lng,
                lat: item.lat,
                count: item.count || item.value || 1
            };
        });
        
        self.heatmap.setDataSet({
            data: heatData,
            max: Math.max(...heatData.map(d => d.count))
        });
        
        data.forEach(function(item) {
            const marker = new AMap.Marker({
                position: [item.lng, item.lat],
                content: `<div style="background:rgba(255,255,255,0.9);padding:5px 10px;border-radius:4px;border:1px solid #ccc;font-size:12px;white-space:nowrap;">
                    ${item.name || ''}<br/>
                    <strong>${(item.value || 0).toLocaleString()} 元/㎡</strong>
                </div>`,
                offset: new AMap.Pixel(-60, -30)
            });
            marker.setMap(self.map);
            self.markers.push(marker);
        });
        
        if (data.length > 0) {
            const lats = data.map(d => d.lat);
            const lngs = data.map(d => d.lng);
            self.map.setFitView();
        }
    },
    
    destroy: function() {
        if (this.map) {
            this.map.destroy();
            this.map = null;
        }
        this.heatmap = null;
        this.markers = [];
    }
};
