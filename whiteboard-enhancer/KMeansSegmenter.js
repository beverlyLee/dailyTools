export class KMeansSegmenter {
    constructor(iterations = 10, k = 3) {
        this.iterations = iterations;
        this.k = k;
    }

    setIterations(iterations) {
        this.iterations = iterations;
    }

    setK(k) {
        this.k = k;
    }

    segment(imageData) {
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;

        const histogram = this.buildBrightnessHistogram(data);
        const brightnessThreshold = this.calculateThresholdFromHistogram(histogram);

        const localStats = this.calculateLocalStats(data, width, height);

        const edgeMap = this.detectEdges(data, width, height);

        const samples = this.downsample(data, width, height);
        const centroids = this.kmeansPlusPlusInit(samples);

        for (let i = 0; i < this.iterations; i++) {
            const clusters = this.assignClusters(samples, centroids);
            const newCentroids = this.updateCentroids(samples, clusters, centroids);
            
            if (this.centroidsConverged(centroids, newCentroids)) {
                centroids.length = 0;
                centroids.push(...newCentroids);
                break;
            }
            
            centroids.length = 0;
            centroids.push(...newCentroids);
        }

        const { backgroundIdxs, foregroundIdxs } = this.classifyClusters(centroids);

        const outputData = new Uint8ClampedArray(data.length);
        const mask = new Uint8Array(width * height);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const pixelIdx = y * width + x;
                const pixel = [data[idx], data[idx + 1], data[idx + 2]];
                const clusterIdx = this.findNearestCentroid(pixel, centroids);
                
                const isBackground = backgroundIdxs.includes(clusterIdx);
                const isForeground = foregroundIdxs.includes(clusterIdx);
                
                const saturation = this.getSaturation(pixel);
                const brightness = this.getBrightness(pixel);
                const colorPurity = localStats[pixelIdx * 4];
                const localAvgBrightness = localStats[pixelIdx * 4 + 1];
                const localAvgSaturation = localStats[pixelIdx * 4 + 2];
                const isEdge = edgeMap[pixelIdx] > 30;

                const isPureColoredText = this.isPureColoredText(pixel, colorPurity, saturation);
                
                const relativeBrightness = brightness - localAvgBrightness;
                const relativeSaturation = saturation - localAvgSaturation;
                
                const isDarkRelativeToLocal = relativeBrightness < -20;
                const isHighSaturationRelative = relativeSaturation > 15;

                let isText = false;
                
                if (isForeground) {
                    if (isPureColoredText) {
                        isText = true;
                    } else if (isDarkRelativeToLocal && isHighSaturationRelative) {
                        isText = true;
                    } else if (brightness < brightnessThreshold * 0.85 && saturation > 25) {
                        isText = true;
                    } else if (isEdge && saturation > 35) {
                        isText = true;
                    } else {
                        isText = false;
                    }
                } else if (isBackground) {
                    if (isPureColoredText) {
                        isText = true;
                    } else if (isDarkRelativeToLocal && isHighSaturationRelative && isEdge) {
                        isText = true;
                    } else {
                        isText = false;
                    }
                } else {
                    if (isPureColoredText) {
                        isText = true;
                    } else if (isDarkRelativeToLocal && relativeSaturation > 20) {
                        isText = true;
                    } else if (isEdge && saturation > 40) {
                        isText = true;
                    } else {
                        isText = false;
                    }
                }

                mask[pixelIdx] = isText ? 1 : 0;
                
                outputData[idx] = data[idx];
                outputData[idx + 1] = data[idx + 1];
                outputData[idx + 2] = data[idx + 2];
                outputData[idx + 3] = data[idx + 3];
            }
        }

        let erodedMask = this.erodeMask(mask, width, height, 2);
        erodedMask = this.erodeMask(erodedMask, width, height, 1);
        
        let dilatedMask = this.dilateMask(erodedMask, width, height, 1);
        dilatedMask = this.dilateMask(dilatedMask, width, height, 1);
        
        const cleanedMask = this.removeSmallRegions(dilatedMask, width, height, 8);

        return {
            imageData: new ImageData(outputData, width, height),
            mask: cleanedMask,
            width: width,
            height: height,
            centroids: centroids,
            backgroundIdxs: backgroundIdxs,
            foregroundIdxs: foregroundIdxs
        };
    }

    calculateLocalStats(data, width, height) {
        const stats = new Float32Array(width * height * 4);
        const radius = 5;

        const tempBrightness = new Float32Array(width * height);
        const tempSaturation = new Float32Array(width * height);
        const tempPurity = new Float32Array(width * height);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                const pixel = [r, g, b];
                
                tempBrightness[y * width + x] = this.getBrightness(pixel);
                tempSaturation[y * width + x] = this.getSaturation(pixel);
                tempPurity[y * width + x] = this.calculatePixelPurity(pixel);
            }
        }

        const boxFilter = (input, output) => {
            const temp = new Float32Array(width * height);
            
            for (let y = 0; y < height; y++) {
                let sum = 0;
                let count = 0;
                for (let x = 0; x < radius * 2 + 1; x++) {
                    if (x < width) {
                        sum += input[y * width + x];
                        count++;
                    }
                }
                temp[y * width] = sum / count;
                
                for (let x = 1; x < width; x++) {
                    if (x - radius - 1 >= 0) {
                        sum -= input[y * width + x - radius - 1];
                        count--;
                    }
                    if (x + radius < width) {
                        sum += input[y * width + x + radius];
                        count++;
                    }
                    temp[y * width + x] = sum / count;
                }
            }

            for (let x = 0; x < width; x++) {
                let sum = 0;
                let count = 0;
                for (let y = 0; y < radius * 2 + 1; y++) {
                    if (y < height) {
                        sum += temp[y * width + x];
                        count++;
                    }
                }
                output[x] = sum / count;
                
                for (let y = 1; y < height; y++) {
                    if (y - radius - 1 >= 0) {
                        sum -= temp[(y - radius - 1) * width + x];
                        count--;
                    }
                    if (y + radius < height) {
                        sum += temp[(y + radius) * width + x];
                        count++;
                    }
                    output[y * width + x] = sum / count;
                }
            }
        };

        const avgBrightness = new Float32Array(width * height);
        const avgSaturation = new Float32Array(width * height);
        const avgPurity = new Float32Array(width * height);

        boxFilter(tempBrightness, avgBrightness);
        boxFilter(tempSaturation, avgSaturation);
        boxFilter(tempPurity, avgPurity);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                stats[idx * 4] = tempPurity[idx];
                stats[idx * 4 + 1] = avgBrightness[idx];
                stats[idx * 4 + 2] = avgSaturation[idx];
                stats[idx * 4 + 3] = avgPurity[idx];
            }
        }

        return stats;
    }

    calculatePixelPurity(pixel) {
        const r = pixel[0];
        const g = pixel[1];
        const b = pixel[2];
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const range = max - min;
        
        if (range < 20) {
            return 0;
        }
        
        const total = r + g + b + 0.001;
        const rRatio = r / total;
        const gRatio = g / total;
        const bRatio = b / total;
        
        const maxRatio = Math.max(rRatio, gRatio, bRatio);
        return (maxRatio - 1/3) * 3;
    }

    detectEdges(data, width, height) {
        const edges = new Float32Array(width * height);
        
        const sobelX = [
            [-1, 0, 1],
            [-2, 0, 2],
            [-1, 0, 1]
        ];
        const sobelY = [
            [-1, -2, -1],
            [0, 0, 0],
            [1, 2, 1]
        ];

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                let gxR = 0, gxG = 0, gxB = 0;
                let gyR = 0, gyG = 0, gyB = 0;
                
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const idx = ((y + dy) * width + (x + dx)) * 4;
                        const r = data[idx];
                        const g = data[idx + 1];
                        const b = data[idx + 2];
                        
                        gxR += r * sobelX[dy + 1][dx + 1];
                        gxG += g * sobelX[dy + 1][dx + 1];
                        gxB += b * sobelX[dy + 1][dx + 1];
                        
                        gyR += r * sobelY[dy + 1][dx + 1];
                        gyG += g * sobelY[dy + 1][dx + 1];
                        gyB += b * sobelY[dy + 1][dx + 1];
                    }
                }
                
                const magnitudeR = Math.sqrt(gxR * gxR + gyR * gyR);
                const magnitudeG = Math.sqrt(gxG * gxG + gyG * gyG);
                const magnitudeB = Math.sqrt(gxB * gxB + gyB * gyB);
                
                edges[y * width + x] = Math.max(magnitudeR, magnitudeG, magnitudeB);
            }
        }
        
        return edges;
    }

    buildBrightnessHistogram(data) {
        const histogram = new Array(256).fill(0);
        
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const brightness = Math.round(r * 0.299 + g * 0.587 + b * 0.114);
            histogram[brightness]++;
        }
        
        return histogram;
    }

    calculateThresholdFromHistogram(histogram) {
        const total = histogram.reduce((a, b) => a + b, 0);
        
        let sumB = 0;
        let wB = 0;
        let maximum = 0;
        let level = 0;
        
        const sum1 = histogram.reduce((sum, h, i) => sum + h * i, 0);
        
        for (let i = 0; i < 256; i++) {
            wB += histogram[i];
            if (wB === 0) continue;
            
            const wF = total - wB;
            if (wF === 0) break;
            
            sumB += i * histogram[i];
            const mB = sumB / wB;
            const mF = (sum1 - sumB) / wF;
            
            const between = wB * wF * (mB - mF) * (mB - mF);
            if (between >= maximum) {
                level = i;
                maximum = between;
            }
        }
        
        return level;
    }

    isPureColoredText(pixel, colorPurity, saturation) {
        const r = pixel[0];
        const g = pixel[1];
        const b = pixel[2];
        
        if (colorPurity > 0.5 && saturation > 50) {
            if (r > g + 35 && r > b + 35) {
                return r < 230;
            }
            
            if (b > r + 30 && b > g + 30) {
                return b < 235;
            }
            
            if (g > r + 30 && g > b + 30) {
                return g < 235;
            }
        }
        
        if (colorPurity > 0.35 && saturation > 60) {
            if (r > g + 25 && r > b + 25) {
                return r < 235;
            }
            
            if (b > r + 20 && b > g + 20) {
                return b < 240;
            }
        }
        
        return false;
    }

    erodeMask(mask, width, height, radius) {
        const result = new Uint8Array(mask.length);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                let allForeground = true;
                
                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        const ny = y + dy;
                        const nx = x + dx;
                        if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
                            if (mask[ny * width + nx] !== 1) {
                                allForeground = false;
                                break;
                            }
                        } else {
                            allForeground = false;
                            break;
                        }
                    }
                    if (!allForeground) break;
                }
                
                result[idx] = allForeground ? 1 : 0;
            }
        }
        
        return result;
    }

    dilateMask(mask, width, height, radius) {
        const result = new Uint8Array(mask.length);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                let hasForeground = false;
                
                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        const ny = y + dy;
                        const nx = x + dx;
                        if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
                            if (mask[ny * width + nx] === 1) {
                                hasForeground = true;
                                break;
                            }
                        }
                    }
                    if (hasForeground) break;
                }
                
                result[idx] = hasForeground ? 1 : 0;
            }
        }
        
        return result;
    }

    removeSmallRegions(mask, width, height, minArea) {
        const visited = new Uint8Array(mask.length);
        const result = new Uint8Array(mask.length);
        const dx = [1, 0, -1, 0];
        const dy = [0, 1, 0, -1];
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                if (mask[idx] === 1 && visited[idx] === 0) {
                    const region = [];
                    const queue = [idx];
                    visited[idx] = 1;
                    
                    while (queue.length > 0) {
                        const current = queue.pop();
                        region.push(current);
                        
                        const cx = current % width;
                        const cy = Math.floor(current / width);
                        
                        for (let d = 0; d < 4; d++) {
                            const nx = cx + dx[d];
                            const ny = cy + dy[d];
                            const nidx = ny * width + nx;
                            
                            if (nx >= 0 && nx < width && ny >= 0 && ny < height 
                                && visited[nidx] === 0 && mask[nidx] === 1) {
                                visited[nidx] = 1;
                                queue.push(nidx);
                            }
                        }
                    }
                    
                    if (region.length >= minArea) {
                        for (const p of region) {
                            result[p] = 1;
                        }
                    }
                }
            }
        }
        
        return result;
    }

    getBrightness(pixel) {
        return pixel[0] * 0.299 + pixel[1] * 0.587 + pixel[2] * 0.114;
    }

    getSaturation(pixel) {
        const max = Math.max(pixel[0], pixel[1], pixel[2]);
        const min = Math.min(pixel[0], pixel[1], pixel[2]);
        return max - min;
    }

    getCombinedFeature(pixel) {
        const brightness = this.getBrightness(pixel);
        const saturation = this.getSaturation(pixel);
        return [
            brightness * 1.5,
            saturation * 4.0,
            pixel[0] * 0.15,
            pixel[1] * 0.15,
            pixel[2] * 0.15
        ];
    }

    featureDistance(f1, f2) {
        let sum = 0;
        for (let i = 0; i < f1.length; i++) {
            const diff = f1[i] - f2[i];
            sum += diff * diff;
        }
        return sum;
    }

    downsample(data, width, height) {
        const samples = [];
        const step = Math.max(1, Math.floor(Math.sqrt(width * height / 15000)));
        
        for (let y = 0; y < height; y += step) {
            for (let x = 0; x < width; x += step) {
                const idx = (y * width + x) * 4;
                samples.push([data[idx], data[idx + 1], data[idx + 2]]);
            }
        }
        
        return samples;
    }

    kmeansPlusPlusInit(samples) {
        if (samples.length < this.k) {
            const shuffled = [...samples].sort(() => Math.random() - 0.5);
            return shuffled.slice(0, this.k).map(s => [...s]);
        }

        const centroids = [];
        const firstIdx = Math.floor(Math.random() * samples.length);
        centroids.push([...samples[firstIdx]]);

        while (centroids.length < this.k) {
            const distances = new Array(samples.length).fill(Infinity);
            
            for (let i = 0; i < samples.length; i++) {
                for (let c = 0; c < centroids.length; c++) {
                    const dist = this.colorDistance(samples[i], centroids[c]);
                    if (dist < distances[i]) {
                        distances[i] = dist;
                    }
                }
            }

            const sum = distances.reduce((a, b) => a + b, 0);
            let r = Math.random() * sum;
            
            for (let i = 0; i < samples.length; i++) {
                r -= distances[i];
                if (r <= 0) {
                    centroids.push([...samples[i]]);
                    break;
                }
            }
        }

        return centroids;
    }

    assignClusters(samples, centroids) {
        const clusters = new Array(samples.length);
        
        for (let i = 0; i < samples.length; i++) {
            clusters[i] = this.findNearestCentroid(samples[i], centroids);
        }
        
        return clusters;
    }

    findNearestCentroid(pixel, centroids) {
        let minDist = Infinity;
        let minIdx = 0;
        
        const pixelFeature = this.getCombinedFeature(pixel);
        
        for (let i = 0; i < centroids.length; i++) {
            const centroidFeature = this.getCombinedFeature(centroids[i]);
            const dist = this.featureDistance(pixelFeature, centroidFeature);
            if (dist < minDist) {
                minDist = dist;
                minIdx = i;
            }
        }
        
        return minIdx;
    }

    colorDistance(c1, c2) {
        const dr = c1[0] - c2[0];
        const dg = c1[1] - c2[1];
        const db = c1[2] - c2[2];
        return dr * dr + dg * dg + db * db;
    }

    updateCentroids(samples, clusters, centroids) {
        const newCentroids = centroids.map(() => [0, 0, 0]);
        const counts = new Array(this.k).fill(0);
        
        for (let i = 0; i < samples.length; i++) {
            const clusterIdx = clusters[i];
            newCentroids[clusterIdx][0] += samples[i][0];
            newCentroids[clusterIdx][1] += samples[i][1];
            newCentroids[clusterIdx][2] += samples[i][2];
            counts[clusterIdx]++;
        }
        
        for (let i = 0; i < this.k; i++) {
            if (counts[i] > 0) {
                newCentroids[i][0] /= counts[i];
                newCentroids[i][1] /= counts[i];
                newCentroids[i][2] /= counts[i];
            } else {
                newCentroids[i] = [...centroids[i]];
            }
        }
        
        return newCentroids;
    }

    centroidsConverged(c1, c2) {
        const threshold = 2;
        for (let i = 0; i < this.k; i++) {
            const dist = this.colorDistance(c1[i], c2[i]);
            if (dist > threshold * threshold) {
                return false;
            }
        }
        return true;
    }

    classifyClusters(centroids) {
        const brightnesses = centroids.map(c => this.getBrightness(c));
        const saturations = centroids.map(c => this.getSaturation(c));
        
        const sortedIdxs = brightnesses
            .map((b, i) => ({ b, s: saturations[i], idx: i }))
            .sort((a, b) => b.b - a.b)
            .map(x => x.idx);

        const backgroundIdxs = [];
        const foregroundIdxs = [];

        const brightnessThreshold = 150;
        const saturationThreshold = 30;
        
        for (let i = 0; i < centroids.length; i++) {
            const b = brightnesses[i];
            const s = saturations[i];
            
            if (b > brightnessThreshold && s < saturationThreshold) {
                backgroundIdxs.push(i);
            } else if (b < 110 || s > 50) {
                foregroundIdxs.push(i);
            }
        }

        if (backgroundIdxs.length === 0) {
            backgroundIdxs.push(sortedIdxs[0]);
            for (let i = 1; i < sortedIdxs.length; i++) {
                foregroundIdxs.push(sortedIdxs[i]);
            }
        }

        if (foregroundIdxs.length === 0) {
            foregroundIdxs.push(sortedIdxs[sortedIdxs.length - 1]);
        }

        return { backgroundIdxs, foregroundIdxs };
    }
}
