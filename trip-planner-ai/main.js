const TripPlannerApp = {
    init() {
        this.bindEvents();
    },

    bindEvents() {
        const planBtn = document.getElementById('planBtn');
        planBtn.addEventListener('click', () => this.handlePlanClick());
    },

    async handlePlanClick() {
        const city = document.getElementById('city').value;
        const days = parseInt(document.getElementById('days').value);
        const budget = parseInt(document.getElementById('budget').value);
        const interests = Array.from(document.querySelectorAll('.interest:checked'))
            .map(cb => cb.value);

        if (interests.length === 0) {
            alert('请至少选择一个兴趣偏好');
            return;
        }

        this.showLoading();

        try {
            const result = await this.planTrip(city, days, interests, budget);
            this.renderResult(result);
        } catch (error) {
            this.showError(error.message);
        }
    },

    async planTrip(city, days, interests, budget) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                try {
                    const preferences = PreferenceParser.parse({
                        city,
                        days,
                        interests,
                        budget
                    });

                    const validation = PreferenceParser.validate(preferences);
                    if (!validation.valid) {
                        reject(new Error(validation.errors.join('\n')));
                        return;
                    }

                    const selectedPois = PoiSearcher.search(city, preferences);
                    
                    if (selectedPois.length === 0) {
                        reject(new Error('未找到符合条件的景点，请尝试调整偏好设置'));
                        return;
                    }

                    const optimizedRoute = RouteOptimizer.optimize(
                        selectedPois, 
                        preferences.days,
                        preferences
                    );

                    resolve({
                        preferences,
                        selectedPois,
                        optimizedRoute
                    });
                } catch (error) {
                    reject(error);
                }
            }, 500);
        });
    },

    showLoading() {
        const resultSection = document.getElementById('resultSection');
        const infoSection = document.getElementById('infoSection');
        const routeResult = document.getElementById('routeResult');
        
        infoSection.style.display = 'none';
        resultSection.style.display = 'block';
        routeResult.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>正在使用遗传算法优化您的行程...</p>
                <p style="font-size: 0.9rem; color: #888; margin-top: 10px;">
                    算法正在考虑：距离最短、区域聚类、时间窗硬约束
                </p>
            </div>
        `;
    },

    showError(message) {
        const routeResult = document.getElementById('routeResult');
        routeResult.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #e74c3c;">
                <p>❌ ${message || '未知错误'}</p>
            </div>
        `;
    },

    renderResult(result) {
        if (!result) {
            this.showError('未获取到行程数据');
            return;
        }

        const { preferences, selectedPois, optimizedRoute } = result;
        
        if (!optimizedRoute || !optimizedRoute.days) {
            this.showError('行程优化失败');
            return;
        }

        const routeResult = document.getElementById('routeResult');
        const infoSection = document.getElementById('infoSection');
        
        infoSection.style.display = 'none';
        
        let html = this.renderSummary(preferences, selectedPois, optimizedRoute);
        html += this.renderOptimizationInfo(optimizedRoute, preferences);
        html += this.renderDays(optimizedRoute.days);
        
        if (optimizedRoute.droppedPOIs && optimizedRoute.droppedPOIs.length > 0) {
            html += this.renderDroppedPOIs(optimizedRoute.droppedPOIs);
        }
        
        routeResult.innerHTML = html;
    },

    renderSummary(preferences, selectedPois, optimizedRoute) {
        if (!preferences || !selectedPois || !optimizedRoute) {
            return '<div class="summary-card"><h3>📊 行程概览</h3><p>数据加载中...</p></div>';
        }

        const totalCost = selectedPois.reduce((sum, poi) => sum + (poi.cost || 0), 0);
        const totalDuration = selectedPois.reduce((sum, poi) => sum + (poi.duration || 0), 0);
        const maxDailyHours = RouteOptimizer.config.dailyWorkingHours;
        const availableHours = (preferences.days || 0) * maxDailyHours;
        
        const areasVisited = new Set();
        if (optimizedRoute.days) {
            optimizedRoute.days.forEach(day => {
                if (day.pois) {
                    day.pois.forEach(poi => areasVisited.add(poi.area));
                }
            });
        }

        const isFeasible = optimizedRoute.isFeasible !== false;
        const scheduledPOICount = optimizedRoute.days ? 
            optimizedRoute.days.reduce((sum, d) => sum + (d.pois ? d.pois.length : 0), 0) : 0;
        const droppedCount = optimizedRoute.droppedPOIs ? optimizedRoute.droppedPOIs.length : 0;
        const totalDistance = optimizedRoute.totalDistance || 0;
        
        const bgColor = isFeasible ? 'rgba(46, 204, 113, 0.2)' : 'rgba(231, 76, 60, 0.2)';
        const statusText = isFeasible ? 
            '✅ 此行程符合时间约束（早8点-晚6点）' : 
            '⚠️ 提示：景点较多，建议增加游玩天数或减少景点';
        
        return `
            <div class="summary-card">
                <h3>📊 行程概览</h3>
                <div style="
                    margin-bottom: 15px;
                    padding: 10px 15px;
                    border-radius: 8px;
                    background: ${bgColor};
                    font-size: 0.95rem;
                ">
                    ${statusText}
                </div>
                <div class="summary-stats">
                    <div class="summary-stat">
                        <div class="summary-stat-value">${preferences.days || 0}</div>
                        <div class="summary-stat-label">游玩天数</div>
                    </div>
                    <div class="summary-stat">
                        <div class="summary-stat-value">${scheduledPOICount}</div>
                        <div class="summary-stat-label">已安排景点</div>
                    </div>
                    <div class="summary-stat">
                        <div class="summary-stat-value">${totalDistance.toFixed(1)}</div>
                        <div class="summary-stat-label">总路程(km)</div>
                    </div>
                    <div class="summary-stat">
                        <div class="summary-stat-value">¥${totalCost}</div>
                        <div class="summary-stat-label">门票费用</div>
                    </div>
                    <div class="summary-stat">
                        <div class="summary-stat-value">${totalDuration.toFixed(1)}</div>
                        <div class="summary-stat-label">游玩时间(h)</div>
                    </div>
                    <div class="summary-stat">
                        <div class="summary-stat-value">${availableHours}h</div>
                        <div class="summary-stat-label">可用时间</div>
                    </div>
                </div>
            </div>
        `;
    },

    renderOptimizationInfo(optimizedRoute, preferences) {
        if (!optimizedRoute || !optimizedRoute.days) {
            return '';
        }

        const areaTransitions = this.calculateAreaTransitions(optimizedRoute.days);
        const totalHours = optimizedRoute.days.reduce((sum, day) => sum + (day.totalHours || 0), 0);
        const maxDailyHours = RouteOptimizer.config.dailyWorkingHours;
        const travelTimePerKm = RouteOptimizer.config.travelTimePerKm;
        const mealBreakHours = RouteOptimizer.config.mealBreakHours;
        const softTimeThreshold = RouteOptimizer.config.softTimeThreshold;
        const travelTimeMin = (travelTimePerKm * 60).toFixed(0);
        
        return `
            <div class="optimization-info" style="
                background: #f8f9fa;
                border-radius: 12px;
                padding: 20px;
                margin-bottom: 25px;
                border-left: 4px solid #667eea;
            ">
                <h4 style="margin-bottom: 12px; color: #333;">🎯 时间窗硬约束说明</h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                    <div style="padding: 12px; background: white; border-radius: 8px;">
                        <strong>⏰ 硬时间窗</strong>
                        <p style="margin: 4px 0 0 0; font-size: 0.9rem; color: #666;">
                            每天 08:00-18:00（${maxDailyHours}小时，硬截止）</p>
                    </div>
                    <div style="padding: 12px; background: white; border-radius: 8px;">
                        <strong>⚡ 软时间阈值</strong>
                        <p style="margin: 4px 0 0 0; font-size: 0.9rem; color: #666;">
                            超过 ${softTimeThreshold} 小时后边际递减惩罚</p>
                    </div>
                    <div style="padding: 12px; background: white; border-radius: 8px;">
                        <strong>🚗 通行时间</strong>
                        <p style="margin: 4px 0 0 0; font-size: 0.9rem; color: #666;">
                            按驾车 ${travelTimeMin}分钟/km 估算</p>
                    </div>
                    <div style="padding: 12px; background: white; border-radius: 8px;">
                        <strong>🍽️ 用餐休息</strong>
                        <p style="margin: 4px 0 0 0; font-size: 0.9rem; color: #666;">
                            每天预留 ${mealBreakHours} 小时</p>
                    </div>
                </div>
                <div style="
                    margin-top: 15px;
                    padding: 12px;
                    background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%);
                    border-radius: 8px;
                    font-size: 0.9rem;
                    border-left: 3px solid #e53935;
                ">
                    <strong>⛔ 硬熔断机制：</strong>
                    <ul style="margin: 8px 0 0 20px; padding: 0;">
                        <li>单日总时间 > 10 小时 → 适应度 = -Infinity（负无穷）</li>
                        <li>此类路线在进化中被直接淘汰，绝无可能成为最终解</li>
                        <li>超过 8 小时后，每增加 1 小时边际递减惩罚大幅增加</li>
                    </ul>
                </div>
                <div style="
                    margin-top: 15px;
                    padding: 12px;
                    background: linear-gradient(135deg, #fff3cd 0%, #ffeeba 100%);
                    border-radius: 8px;
                    font-size: 0.9rem;
                ">
                    <strong>⭐ 景点优先级：</strong>
                    <ul style="margin: 8px 0 0 20px; padding: 0;">
                        <li>评分 × 20 + 标签匹配 × 30 + 用户偏好打分</li>
                        <li>远郊区景点（如长城、都江堰）优先安排，避免跨区奔波</li>
                        <li>时间不够时，按优先级低的景点会被放入备选</li>
                    </ul>
                </div>
            </div>
        `;
    },

    calculateAreaTransitions(days) {
        if (!days || days.length === 0) return 0;
        
        let transitions = 0;
        days.forEach(day => {
            if (day.pois && day.pois.length > 1) {
                for (let i = 1; i < day.pois.length; i++) {
                    const prevArea = day.pois[i - 1] ? day.pois[i - 1].area : null;
                    const currArea = day.pois[i] ? day.pois[i].area : null;
                    if (prevArea && currArea && prevArea !== currArea) {
                        transitions++;
                    }
                }
            }
        });
        return transitions;
    },

    renderDays(days) {
        if (!days || days.length === 0) {
            return '<div class="day-card"><h3>📅 暂无行程安排</h3></div>';
        }

        let html = '';
        
        days.forEach(day => {
            if (!day || !day.pois) return;
            
            const dayAreas = this.getDayAreas(day.pois);
            const hoursInfo = day.totalHours ? ` · 约 ${day.totalHours.toFixed(1)} 小时` : '';
            const isDayFeasible = day.isFeasible !== false;
            const maxDailyHours = RouteOptimizer.config.dailyWorkingHours;
            const dayDistance = day.distance || 0;
            
            const bgColor = isDayFeasible ? '#e8f5e9' : '#ffebee';
            const textColor = isDayFeasible ? '#2e7d32' : '#c62828';
            const icon = isDayFeasible ? '✅' : '⚠️';
            
            html += `
                <div class="day-card">
                    <div class="day-header">
                        <h3>📅 第 ${day.day || '?'} 天</h3>
                        <span class="day-distance" style="
                            padding: 4px 12px;
                            border-radius: 12px;
                            background: ${bgColor};
                            color: ${textColor};
                        ">
                            ${icon} 路程约 ${dayDistance.toFixed(1)} km${hoursInfo} / ${maxDailyHours}h
                        </span>
                    </div>
                    <div style="
                        margin-bottom: 15px;
                        padding: 8px 12px;
                        background: linear-gradient(135deg, #e8f0fe 0%, #f3e8ff 100%);
                        border-radius: 8px;
                        font-size: 0.9rem;
                        color: #666;
                    ">
                        <strong>游览区域：</strong>${dayAreas.length > 0 ? dayAreas.join(' → ') : '暂无'}
                    </div>
                    <div class="poi-list">
                        ${this.renderPoiList(day.pois)}
                    </div>
                </div>
            `;
        });
        
        return html;
    },

    getDayAreas(pois) {
        if (!pois || pois.length === 0) return [];
        
        const areas = [];
        let lastArea = null;
        
        pois.forEach(poi => {
            const area = poi ? poi.area : null;
            if (area && area !== lastArea) {
                areas.push(area);
                lastArea = area;
            }
        });
        
        return areas;
    },

    renderPoiList(pois) {
        if (!pois || pois.length === 0) {
            return '<div style="padding: 20px; text-align: center; color: #999;">暂无景点</div>';
        }

        let html = '';
        let currentTime = 8.0;
        
        pois.forEach((poi, index) => {
            if (!poi) return;
            
            let travelTime = 0;
            let distance = 0;
            
            if (index > 0 && pois[index - 1]) {
                const prevPoi = pois[index - 1];
                distance = PoiSearcher.getHaversineDistance(prevPoi, poi);
                travelTime = distance * RouteOptimizer.config.travelTimePerKm;
                const isAreaChange = (prevPoi.area || '') !== (poi.area || '');
                const distanceLabel = isAreaChange 
                    ? `↓ 跨区移动 ${distance.toFixed(1)} km (${(travelTime * 60).toFixed(0)}分钟)`
                    : `↓ 移动 ${distance.toFixed(1)} km (${(travelTime * 60).toFixed(0)}分钟)`;
                
                html += `<div class="route-arrow">${distanceLabel}</div>`;
                
                currentTime += travelTime;
            }
            
            const startTime = this.formatTime(currentTime);
            currentTime += (poi.duration || 0);
            const endTime = this.formatTime(currentTime);
            
            const tagsHtml = (poi.tags || []).map(tag => 
                `<span class="poi-tag">${tag}</span>`
            ).join('');
            
            const poiCost = poi.cost || 0;
            const poiDuration = poi.duration || 0;
            const poiArea = poi.area || '未知区域';
            const poiRating = poi.rating || 0;
            const poiDescription = poi.description || '';
            
            html += `
                <div class="poi-item">
                    <div class="poi-index">${index + 1}</div>
                    <div class="poi-info">
                        <div class="poi-name">${poi.name || '未知景点'} <span style="
                            font-size: 0.85rem;
                            font-weight: normal;
                            color: #888;
                        ">(${startTime} - ${endTime})</span></div>
                        <div class="poi-tags">${tagsHtml}</div>
                        <div class="poi-meta">
                            ${poiCost > 0 ? `门票 ¥${poiCost}` : '免费'} · 
                            建议游玩 ${poiDuration} 小时 · 
                            ${poiArea} · 
                            ⭐ ${poiRating}
                        </div>
                        <div class="poi-meta" style="margin-top: 4px; font-style: italic;">
                            ${poiDescription}
                        </div>
                    </div>
                </div>
            `;
        });
        
        return html;
    },

    renderDroppedPOIs(droppedPOIs) {
        if (!droppedPOIs || droppedPOIs.length === 0) return '';
        
        const sortedDropped = [...droppedPOIs].sort((a, b) => {
            if (!a || !b) return 0;
            const diff = (b.rating || 0) - (a.rating || 0);
            if (Math.abs(diff) > 0.1) return diff;
            return (b.duration || 0) - (a.duration || 0);
        });

        const droppedHTML = sortedDropped.map(poi => {
            if (!poi) return '';
            const tags = (poi.tags || []).join('、');
            return `
                <div style="
                    background: white;
                    padding: 12px;
                    border-radius: 8px;
                    border: 1px dashed #ffcc80;
                ">
                    <div style="font-weight: 600; color: #333;">${poi.name || '未知景点'}</div>
                    <div style="font-size: 0.85rem; color: #666; margin-top: 4px;">
                        ${poi.area || '未知区域'} · ⭐ ${poi.rating || 0} · ${poi.duration || 0}h · 
                        ${tags}
                    </div>
                    <div style="font-size: 0.8rem; color: #999; margin-top: 4px;">
                        ${poi.description || ''}
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div style="
                background: #fff3e0;
                border-radius: 12px;
                padding: 20px;
                margin-top: 25px;
                border-left: 4px solid #ff9800;
            ">
                <h4 style="margin-bottom: 15px; color: #e65100;">🗑️ 未安排景点（时间限制）</h4>
                <p style="
                    margin-bottom: 12px;
                    font-size: 0.9rem;
                    color: #666;
                ">
                    由于时间限制（每天 10 小时硬约束），以下景点未被安排：
                </p>
                <div style="
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 10px;
                ">
                    ${droppedHTML}
                </div>
                <p style="
                    margin-top: 15px;
                    padding: 10px;
                    background: #fff8e1;
                    border-radius: 6px;
                    font-size: 0.85rem;
                    color: #f57c00;
                ">
                    💡 建议：增加游玩天数或调整兴趣偏好，可以看到更多景点
                </p>
            </div>
        `;
    },

    formatTime(hours) {
        if (!hours && hours !== 0) return '--:--';
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    TripPlannerApp.init();
});
