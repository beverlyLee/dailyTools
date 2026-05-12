const RouteOptimizer = {
    config: {
        dailyWorkingHours: 10,
        dailyStartHour: 8,
        dailyEndHour: 18,
        travelTimePerKm: 0.15,
        mealBreakHours: 1.5,
        restTimeMinutes: 15,
        
        hardTimeCutoff: true,
        softTimeThreshold: 8,
        timeViolationPenalty: 1000,
        infeasibleSolutionPenalty: 999999,
        
        crossAreaPenalty: 50,
        farDistanceThreshold: 15,
        farDistancePenalty: 30,
        
        ratingWeight: 20,
        minDailyPois: 2,
        maxDailyPois: 5,
        minPOIDuration: 0.5
    },

    optimize(pois, days, preferences) {
        if (pois.length === 0) {
            return { days: [], totalDistance: 0, isFeasible: true, totalTime: 0, droppedPOIs: [] };
        }

        if (pois.length <= days) {
            return this.simpleAssign(pois, days);
        }

        const sortedPOIs = [...pois].sort((a, b) => {
            const scoreA = this.calculatePOIPriority(a, preferences);
            const scoreB = this.calculatePOIPriority(b, preferences);
            return scoreB - scoreA;
        });

        const maxDailyHours = this.config.dailyWorkingHours;
        const totalAvailableHours = days * maxDailyHours;
        
        const areaClusters = this.clusterByArea(sortedPOIs);
        const result = this.planDayByDayWithHardConstraints(
            sortedPOIs,
            days,
            maxDailyHours,
            preferences,
            areaClusters
        );

        return result;
    },

    calculatePOIPriority(poi, preferences) {
        let priority = 0;
        
        priority += poi.rating * this.config.ratingWeight;
        
        const expandedInterests = PreferenceParser.expandInterests(preferences.interests);
        const tagMatches = poi.tags.filter(tag => expandedInterests.includes(tag)).length;
        priority += tagMatches * 30;
        
        if (poi.duration <= this.config.softTimeThreshold) {
            priority += 5;
        }
        
        if (poi.duration > 6) {
            priority -= 20;
        }
        
        priority += poi.score || 0;
        
        const farAreas = ["延庆区", "怀柔区", "淳安县", "都江堰市", "乐山市"];
        const isFar = farAreas.includes(poi.area);
        if (isFar) {
            priority += 50;
        }
        
        return priority;
    },

    simpleAssign(pois, days) {
        const result = [];
        const poisPerDay = Math.ceil(pois.length / days);
        let totalTime = 0;
        let totalDistance = 0;
        
        for (let i = 0; i < days; i++) {
            const start = i * poisPerDay;
            const end = Math.min(start + poisPerDay, pois.length);
            
            if (start < pois.length) {
                const dayPOIs = pois.slice(start, end);
                let dayDistance = 0;
                let dayTime = dayPOIs.reduce((sum, p) => sum + p.duration, 0);
                
                for (let j = 1; j < dayPOIs.length; j++) {
                    const dist = PoiSearcher.getHaversineDistance(dayPOIs[j - 1], dayPOIs[j]);
                    dayDistance += dist;
                    dayTime += dist * this.config.travelTimePerKm;
                }
                
                totalTime += dayTime + this.config.mealBreakHours;
                totalDistance += dayDistance;
                
                const isDayFeasible = dayTime <= this.config.dailyWorkingHours - this.config.mealBreakHours;
                
                result.push({
                    day: i + 1,
                    pois: dayPOIs,
                    distance: dayDistance,
                    totalHours: dayTime + this.config.mealBreakHours,
                    isFeasible: isDayFeasible
                });
            }
        }
        
        const isGloballyFeasible = totalTime <= days * this.config.dailyWorkingHours;
        
        return { 
            days: result, 
            totalDistance,
            isFeasible: isGloballyFeasible,
            totalTime: totalTime,
            droppedPOIs: []
        };
    },

    clusterByArea(pois) {
        const clusters = new Map();
        const areaGroups = {
            "中心区域": "市中心",
            "东城区": "市中心",
            "西城区": "市中心",
            "海淀区": "西北区",
            "朝阳区": "东北区",
            "延庆区": "远郊区",
            "怀柔区": "远郊区",
            "青浦区": "郊区",
            "浦东新区": "浦东区",
            "黄浦区": "市中心",
            "徐汇区": "市中心",
            "静安区": "市中心",
            "西湖区": "市中心",
            "上城区": "市中心",
            "淳安县": "远郊区",
            "萧山区": "郊区",
            "成华区": "市中心",
            "武侯区": "市中心",
            "青羊区": "市中心",
            "锦江区": "市中心",
            "都江堰市": "远郊区",
            "乐山市": "远郊区"
        };

        pois.forEach((poi, index) => {
            const group = areaGroups[poi.area] || poi.area;
            if (!clusters.has(group)) {
                clusters.set(group, []);
            }
            clusters.get(group).push({
                poi,
                index,
                area: poi.area,
                group: group
            });
        });

        return clusters;
    },

    planDayByDayWithHardConstraints(sortedPOIs, days, maxDailyHours, preferences, areaClusters) {
        const dayAssignments = [];
        const assignedIndices = new Set();
        const droppedPOIs = [];
        let totalDistance = 0;
        let totalTime = 0;

        const farAreas = ["远郊区", "延庆区", "怀柔区", "淳安县", "都江堰市", "乐山市"];
        const farPOIs = sortedPOIs.filter(p => farAreas.some(fa => 
            p.area === fa || p.area.includes("远郊")
        ));
        const normalPOIs = sortedPOIs.filter(p => !farAreas.some(fa => 
            p.area === fa || p.area.includes("远郊")
        ));

        let currentDay = 0;
        
        while (farPOIs.length > 0 && currentDay < days) {
            const farPOI = farPOIs.shift();
            const dayResult = this.planSingleDayWithGreedy(
                [farPOI],
                sortedPOIs,
                assignedIndices,
                maxDailyHours,
                preferences,
                true
            );
            
            if (dayResult.pois.length > 0) {
                dayAssignments.push({
                    day: dayAssignments.length + 1,
                    pois: dayResult.pois,
                    distance: dayResult.distance,
                    totalHours: dayResult.totalHours,
                    isFeasible: dayResult.isFeasible
                });
                totalDistance += dayResult.distance;
                totalTime += dayResult.totalHours;
            }
            currentDay++;
        }

        const remainingNormalPOIs = normalPOIs.filter(p => !assignedIndices.has(p.id));
        const remainingDays = days - currentDay;

        if (remainingNormalPOIs.length > 0 && remainingDays > 0) {
            const areaSortedPOIs = this.sortPOIsByArea(remainingNormalPOIs);
            
            let dailyPOIList = [];
            areaSortedPOIs.forEach(poi => {
                if (!assignedIndices.has(poi.id)) {
                    dailyPOIList.push(poi);
                }
            });

            const poisPerDay = Math.ceil(dailyPOIList.length / remainingDays);
            
            for (let d = 0; d < remainingDays && dailyPOIList.length > 0; d++) {
                const todaysPOIs = dailyPOIList.slice(0, poisPerDay);
                dailyPOIList = dailyPOIList.slice(poisPerDay);
                
                const dayResult = this.planSingleDayWithGreedy(
                    todaysPOIs,
                    sortedPOIs,
                    assignedIndices,
                    maxDailyHours,
                    preferences,
                    false
                );
                
                dayAssignments.push({
                    day: dayAssignments.length + 1,
                    pois: dayResult.pois,
                    distance: dayResult.distance,
                    totalHours: dayResult.totalHours,
                    isFeasible: dayResult.isFeasible
                });
                totalDistance += dayResult.distance;
                totalTime += dayResult.totalHours;
                
                dayResult.pois.forEach(p => assignedIndices.add(p.id));
                
                if (dayResult.droppedPOIs && dayResult.droppedPOIs.length > 0) {
                    droppedPOIs.push(...dayResult.droppedPOIs);
                }
            }
            
            dailyPOIList.forEach(poi => {
                if (!assignedIndices.has(poi.id)) {
                    droppedPOIs.push(poi);
                }
            });
        }

        const allDaysFeasible = dayAssignments.every(d => d.isFeasible);

        return {
            days: dayAssignments,
            totalDistance,
            totalTime,
            isFeasible: allDaysFeasible,
            droppedPOIs
        };
    },

    sortPOIsByArea(pois) {
        const areaOrder = ["市中心", "中心区域", "东城区", "西城区", "黄浦区", "徐汇区", 
                         "静安区", "西湖区", "上城区", "成华区", "武侯区", "青羊区", 
                         "锦江区", "海淀区", "朝阳区", "浦东区", "西北区", "东北区", 
                         "郊区", "萧山区", "远郊区"];
        
        return [...pois].sort((a, b) => {
            const idxA = areaOrder.indexOf(a.area);
            const idxB = areaOrder.indexOf(b.area);
            
            if (idxA === -1 && idxB === -1) return 0;
            if (idxA === -1) return 1;
            if (idxB === -1) return -1;
            
            if (idxA !== idxB) return idxA - idxB;
            
            return this.calculatePOIPriority(b, { interests: [] }) - 
                   this.calculatePOIPriority(a, { interests: [] });
        });
    },

    planSingleDayWithGreedy(seedPOIs, allPOIs, assignedIndices, maxDailyHours, preferences, isFarDay) {
        const result = {
            pois: [],
            distance: 0,
            totalHours: 0,
            isFeasible: true,
            droppedPOIs: []
        };

        const maxHoursWithoutMeal = maxDailyHours - this.config.mealBreakHours;
        let currentHours = 0;
        let lastPOI = null;

        const candidates = [];
        
        seedPOIs.forEach(poi => {
            if (!assignedIndices.has(poi.id)) {
                candidates.push(poi);
            }
        });

        allPOIs.forEach(poi => {
            if (!assignedIndices.has(poi.id) && 
                !candidates.some(c => c.id === poi.id)) {
                if (isFarDay) {
                    const farAreas = ["延庆区", "怀柔区", "远郊区", "淳安县", "都江堰市", "乐山市"];
                    if (farAreas.some(fa => poi.area === fa || poi.area.includes("远郊"))) {
                        candidates.push(poi);
                    }
                }
            }
        });

        const sortedCandidates = [...candidates].sort((a, b) => {
            return this.calculatePOIPriority(b, preferences) - 
                   this.calculatePOIPriority(a, preferences);
        });

        for (const poi of sortedCandidates) {
            if (assignedIndices.has(poi.id)) continue;
            if (result.pois.length >= this.config.maxDailyPois) break;

            let travelTime = 0;
            let travelDistance = 0;

            if (lastPOI !== null) {
                travelDistance = PoiSearcher.getHaversineDistance(lastPOI, poi);
                travelTime = travelDistance * this.config.travelTimePerKm;
            }

            const newTotalHours = currentHours + travelTime + poi.duration;

            if (newTotalHours <= maxHoursWithoutMeal) {
                result.pois.push(poi);
                result.distance += travelDistance;
                currentHours = newTotalHours;
                lastPOI = poi;
                assignedIndices.add(poi.id);
            } else if (result.pois.length < this.config.minDailyPois) {
                if (newTotalHours <= maxHoursWithoutMeal * 1.5) {
                    result.pois.push(poi);
                    result.distance += travelDistance;
                    currentHours = newTotalHours;
                    lastPOI = poi;
                    assignedIndices.add(poi.id);
                    result.isFeasible = false;
                } else {
                    result.droppedPOIs.push(poi);
                }
            } else {
                result.droppedPOIs.push(poi);
            }
        }

        result.totalHours = currentHours + this.config.mealBreakHours;
        result.isFeasible = currentHours <= maxHoursWithoutMeal && 
                           result.pois.length >= this.config.minDailyPois;

        return result;
    },

    solveTSPWithHardTimeConstraints(pois, maxHours, preferences) {
        const n = pois.length;
        if (n <= 1) return { route: [0], isFeasible: true, totalHours: pois[0]?.duration || 0 };

        const distanceMatrix = PoiSearcher.createDistanceMatrixSync(pois);
        const travelTimeMatrix = this.createTravelTimeMatrix(distanceMatrix);
        
        const config = {
            populationSize: 50,
            generations: 200,
            mutationRate: 0.02,
            crossoverRate: 0.7,
            elitismCount: 3
        };

        let population = this.initPopulation(n, pois);
        let bestFitness = Infinity;
        let bestRoute = null;
        let bestIsFeasible = false;
        let bestTotalHours = Infinity;

        for (let gen = 0; gen < config.generations; gen++) {
            const fitnessResults = population.map(route => 
                this.calculateFitnessWithHardTime(route, pois, travelTimeMatrix, distanceMatrix, maxHours)
            );

            const fitnesses = fitnessResults.map(r => r.fitness);
            const currentBestIdx = fitnesses.indexOf(Math.min(...fitnesses));
            const currentBest = fitnessResults[currentBestIdx];

            if (currentBest.fitness < bestFitness) {
                bestFitness = currentBest.fitness;
                bestRoute = [...population[currentBestIdx]];
                bestIsFeasible = currentBest.isFeasible;
                bestTotalHours = currentBest.totalHours;
            }

            if (bestIsFeasible && gen > 50) {
                const improvedCount = fitnessResults.filter(r => r.isFeasible).length;
                if (improvedCount >= config.populationSize * 0.3) {
                    break;
                }
            }

            const newPopulation = [];
            
            for (let i = 0; i < config.elitismCount && i < population.length; i++) {
                const sortedPop = population.map((r, idx) => ({ 
                    route: r, 
                    fitness: fitnesses[idx],
                    isFeasible: fitnessResults[idx].isFeasible
                }))
                    .sort((a, b) => {
                        if (a.isFeasible !== b.isFeasible) {
                            return a.isFeasible ? -1 : 1;
                        }
                        return a.fitness - b.fitness;
                    });
                newPopulation.push([...sortedPop[i].route]);
            }

            while (newPopulation.length < config.populationSize) {
                const parent1 = this.selectWithFeasibility(population, fitnessResults);
                const parent2 = this.selectWithFeasibility(population, fitnessResults);

                let child;
                if (Math.random() < config.crossoverRate) {
                    child = this.orderCrossover(parent1, parent2);
                } else {
                    child = [...parent1];
                }

                if (Math.random() < config.mutationRate) {
                    this.mutateSwap(child);
                }

                newPopulation.push(child);
            }

            population = newPopulation;
        }

        return {
            route: bestRoute || population[0],
            isFeasible: bestIsFeasible,
            totalHours: bestTotalHours
        };
    },

    initPopulation(n, pois) {
        const population = [];
        
        const areaSortedRoute = Array.from({ length: n }, (_, i) => i)
            .sort((a, b) => {
                if (pois[a].area !== pois[b].area) {
                    return pois[a].area.localeCompare(pois[b].area);
                }
                return pois[b].rating - pois[a].rating;
            });
        population.push([...areaSortedRoute]);

        for (let i = 0; i < 49; i++) {
            const route = [...areaSortedRoute];
            for (let j = 0; j < Math.floor(n / 3); j++) {
                const idx1 = Math.floor(Math.random() * n);
                const idx2 = Math.floor(Math.random() * n);
                if (pois[route[idx1]].area === pois[route[idx2]].area) {
                    [route[idx1], route[idx2]] = [route[idx2], route[idx1]];
                }
            }
            population.push(route);
        }

        return population;
    },

    calculateFitnessWithHardTime(route, pois, travelTimeMatrix, distanceMatrix, maxHours) {
        let totalDistance = 0;
        let totalTravelTime = 0;
        let totalPoiTime = 0;

        for (let i = 0; i < route.length; i++) {
            const idx = route[i];
            totalPoiTime += pois[idx].duration;

            if (i > 0) {
                const prevIdx = route[i - 1];
                totalDistance += distanceMatrix[prevIdx][idx];
                totalTravelTime += travelTimeMatrix[prevIdx][idx];
            }
        }

        const totalTime = totalPoiTime + totalTravelTime + this.config.mealBreakHours;
        
        let isFeasible = totalTime <= maxHours;
        
        let timePenalty = 0;
        
        if (!isFeasible) {
            return {
                fitness: -Infinity,
                isFeasible: false,
                totalTime,
                totalDistance
            };
        }

        const effectiveWorkHours = maxHours - this.config.mealBreakHours;
        const actualWorkHours = totalPoiTime + totalTravelTime;
        
        if (actualWorkHours > this.config.softTimeThreshold) {
            const overtime = actualWorkHours - this.config.softTimeThreshold;
            timePenalty += Math.pow(overtime, 1.5) * 100;
        }

        let areaPenalty = 0;
        for (let i = 1; i < route.length; i++) {
            const penalty = this.getAreaPenalty(pois[route[i - 1]], pois[route[i]]);
            areaPenalty += penalty;
        }

        let distancePenalty = 0;
        for (let i = 1; i < route.length; i++) {
            const dist = distanceMatrix[route[i - 1]][route[i]];
            if (dist > this.config.farDistanceThreshold) {
                distancePenalty += (dist - this.config.farDistanceThreshold) * 
                                   this.config.farDistancePenalty / 5;
            }
        }

        const fitness = totalDistance + areaPenalty + distancePenalty + timePenalty;

        return {
            fitness,
            isFeasible,
            totalTime,
            totalDistance
        };
    },

    getAreaPenalty(poi1, poi2) {
        if (poi1.area === poi2.area) return 0;

        const farAreas = ["延庆区", "怀柔区", "远郊区", "淳安县", "都江堰市", "乐山市"];
        const isPoi1Far = farAreas.some(area => 
            poi1.area === area || poi1.area.includes("远郊")
        );
        const isPoi2Far = farAreas.some(area => 
            poi2.area === area || poi2.area.includes("远郊")
        );

        if (isPoi1Far !== isPoi2Far) {
            return this.config.crossAreaPenalty * 2;
        }

        return this.config.crossAreaPenalty;
    },

    createTravelTimeMatrix(distanceMatrix) {
        const n = distanceMatrix.length;
        const travelTimeMatrix = [];
        
        for (let i = 0; i < n; i++) {
            travelTimeMatrix[i] = [];
            for (let j = 0; j < n; j++) {
                travelTimeMatrix[i][j] = distanceMatrix[i][j] * this.config.travelTimePerKm;
            }
        }
        
        return travelTimeMatrix;
    },

    selectWithFeasibility(population, fitnessResults) {
        const tournamentSize = 5;
        const candidates = [];

        for (let i = 0; i < tournamentSize; i++) {
            const idx = Math.floor(Math.random() * population.length);
            candidates.push({
                idx,
                route: population[idx],
                fitness: fitnessResults[idx].fitness,
                isFeasible: fitnessResults[idx].isFeasible
            });
        }

        candidates.sort((a, b) => {
            if (a.isFeasible !== b.isFeasible) {
                return a.isFeasible ? -1 : 1;
            }
            if (a.fitness === -Infinity && b.fitness === -Infinity) return 0;
            if (a.fitness === -Infinity) return 1;
            if (b.fitness === -Infinity) return -1;
            return a.fitness - b.fitness;
        });

        return [...candidates[0].route];
    },

    orderCrossover(parent1, parent2) {
        const n = parent1.length;
        const start = Math.floor(Math.random() * n);
        const end = Math.floor(Math.random() * (n - start)) + start;

        const child = new Array(n).fill(-1);
        
        for (let i = start; i <= end; i++) {
            child[i] = parent1[i];
        }

        let childPos = 0;
        for (let i = 0; i < n; i++) {
            if (!child.includes(parent2[i])) {
                while (child[childPos] !== -1) {
                    childPos++;
                    if (childPos >= n) childPos = 0;
                }
                child[childPos] = parent2[i];
            }
        }

        return child;
    },

    mutateSwap(route) {
        const n = route.length;
        const i = Math.floor(Math.random() * n);
        const j = Math.floor(Math.random() * n);
        [route[i], route[j]] = [route[j], route[i]];
    },

    calculateTimeViolation(route, pois, travelTimeMatrix, maxHours) {
        let totalTime = this.config.mealBreakHours;

        for (let i = 0; i < route.length; i++) {
            totalTime += pois[route[i]].duration;
            if (i > 0) {
                totalTime += travelTimeMatrix[route[i - 1]][route[i]];
            }
        }

        return Math.max(0, totalTime - maxHours);
    }
};
