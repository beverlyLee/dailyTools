const PoiSearcher = {
    config: {
        useMapAPI: false,
        amapKey: '',
        baiduKey: '',
        distanceType: 'driving'
    },

    search(cityName, preferences) {
        const pois = PoiData.getPois(cityName);
        const expandedInterests = PreferenceParser.expandInterests(preferences.interests);
        
        const scoredPois = pois.map(poi => ({
            ...poi,
            score: this.calculateScore(poi, expandedInterests, preferences)
        }));

        scoredPois.sort((a, b) => b.score - a.score);

        const totalPoisNeeded = preferences.days * preferences.maxPoisPerDay;
        const selectedPois = scoredPois.slice(0, Math.min(totalPoisNeeded, scoredPois.length));

        return selectedPois;
    },

    calculateScore(poi, expandedInterests, preferences) {
        let score = 0;
        
        const tagMatchCount = poi.tags.filter(tag => expandedInterests.includes(tag)).length;
        if (tagMatchCount > 0) {
            score += tagMatchCount * 30;
        } else {
            score -= 50;
        }

        score += poi.rating * 10;

        if (poi.cost <= preferences.dailyBudget) {
            score += 10;
        } else if (poi.cost > preferences.budget) {
            score -= 30;
        }

        if (poi.duration <= 4) {
            score += 5;
        } else if (poi.duration > 6) {
            score -= 10;
        }

        score += (Math.random() - 0.5) * 5;

        return score;
    },

    getHaversineDistance(poi1, poi2) {
        const R = 6371;
        const dLat = this.toRad(poi2.lat - poi1.lat);
        const dLng = this.toRad(poi2.lng - poi1.lng);
        
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(this.toRad(poi1.lat)) * Math.cos(this.toRad(poi2.lat)) *
                  Math.sin(dLng / 2) * Math.sin(dLng / 2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        
        return R * c;
    },

    async getMapAPIDistance(poi1, poi2) {
        if (!this.config.useMapAPI || (!this.config.amapKey && !this.config.baiduKey)) {
            return null;
        }

        if (this.config.amapKey) {
            return this.getAmapDistance(poi1, poi2);
        }

        if (this.config.baiduKey) {
            return this.getBaiduDistance(poi1, poi2);
        }

        return null;
    },

    async getAmapDistance(poi1, poi2) {
        try {
            const url = `https://restapi.amap.com/v3/direction/${this.config.distanceType}?origin=${poi1.lng},${poi1.lat}&destination=${poi2.lng},${poi2.lat}&key=${this.config.amapKey}`;
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.status === '1' && data.route && data.route.paths && data.route.paths[0]) {
                return data.route.paths[0].distance / 1000;
            }
            return null;
        } catch (e) {
            console.warn('高德地图API调用失败，使用Haversine公式作为降级方案', e);
            return null;
        }
    },

    async getBaiduDistance(poi1, poi2) {
        try {
            const url = `https://api.map.baidu.com/direction/v2/${this.config.distanceType}?origin=${poi1.lat},${poi1.lng}&destination=${poi2.lat},${poi2.lng}&ak=${this.config.baiduKey}`;
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.status === 0 && data.result && data.result.routes && data.result.routes[0]) {
                return data.result.routes[0].distance / 1000;
            }
            return null;
        } catch (e) {
            console.warn('百度地图API调用失败，使用Haversine公式作为降级方案', e);
            return null;
        }
    },

    async getDistance(poi1, poi2) {
        let mapDistance = null;
        
        if (this.config.useMapAPI) {
            mapDistance = await this.getMapAPIDistance(poi1, poi2);
        }

        if (mapDistance !== null) {
            return mapDistance;
        }

        const haversineDistance = this.getHaversineDistance(poi1, poi2);
        const drivingMultiplier = this.config.distanceType === 'driving' ? 1.3 : 1.0;
        
        return haversineDistance * drivingMultiplier;
    },

    async createDistanceMatrix(pois) {
        const n = pois.length;
        const matrix = [];
        
        for (let i = 0; i < n; i++) {
            matrix[i] = [];
            for (let j = 0; j < n; j++) {
                if (i === j) {
                    matrix[i][j] = 0;
                } else {
                    matrix[i][j] = await this.getDistance(pois[i], pois[j]);
                }
            }
        }
        
        return matrix;
    },

    createDistanceMatrixSync(pois) {
        const n = pois.length;
        const matrix = [];
        const drivingMultiplier = this.config.distanceType === 'driving' ? 1.3 : 1.0;
        
        for (let i = 0; i < n; i++) {
            matrix[i] = [];
            for (let j = 0; j < n; j++) {
                if (i === j) {
                    matrix[i][j] = 0;
                } else {
                    const haversineDistance = this.getHaversineDistance(pois[i], pois[j]);
                    matrix[i][j] = haversineDistance * drivingMultiplier;
                }
            }
        }
        
        return matrix;
    },

    getAreas(pois) {
        const areas = new Map();
        
        pois.forEach((poi, index) => {
            if (!areas.has(poi.area)) {
                areas.set(poi.area, []);
            }
            areas.get(poi.area).push(index);
        });
        
        return areas;
    },

    toRad(deg) {
        return deg * (Math.PI / 180);
    }
};
