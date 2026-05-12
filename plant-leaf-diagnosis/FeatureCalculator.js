export class FeatureCalculator {
    constructor(options = {}) {
        this.healthyThreshold = options.healthyThreshold || 0.02;
        this.mildThreshold = options.mildThreshold || 0.10;
    }

    calculate(segmentationResult, extractionResult) {
        console.log('=== 开始特征计算（修复版）===');
        
        const { leafArea, leafPixels } = segmentationResult;
        const { 
            totalSpotArea, spots, 
            yellow: yellowArea, 
            brown: brownArea,
            red: redArea,
            white: whiteArea,
            gray: grayArea
        } = extractionResult;
        
        const coverageRate = leafArea > 0 ? totalSpotArea / leafArea : 0;
        const yellowRatio = totalSpotArea > 0 ? yellowArea / totalSpotArea : 0;
        const brownRatio = totalSpotArea > 0 ? brownArea / totalSpotArea : 0;
        const redRatio = totalSpotArea > 0 ? redArea / totalSpotArea : 0;
        const whiteRatio = totalSpotArea > 0 ? whiteArea / totalSpotArea : 0;
        const grayRatio = totalSpotArea > 0 ? grayArea / totalSpotArea : 0;
        
        const complexityFeatures = this.calculateComplexityFeatures(spots);
        
        console.log('病斑覆盖率:', (coverageRate * 100).toFixed(2) + '%');
        console.log('黄色病斑比例:', (yellowRatio * 100).toFixed(1) + '%');
        console.log('褐色病斑比例:', (brownRatio * 100).toFixed(1) + '%');
        console.log('红色病斑比例:', (redRatio * 100).toFixed(1) + '%');
        console.log('白色病斑比例:', (whiteRatio * 100).toFixed(1) + '%');
        console.log('灰色病斑比例:', (grayRatio * 100).toFixed(1) + '%');
        
        const diagnosisType = this.determinePrimaryDiagnosisType({
            yellowRatio, brownRatio, redRatio, whiteRatio, grayRatio,
            avgCircularity: complexityFeatures.avgCircularity,
            spotCount: spots.length,
            avgSpotSize: spots.length > 0 ? totalSpotArea / spots.length : 0
        });
        
        console.log('主要诊断类型:', diagnosisType);
        
        const status = this.determineStatus(coverageRate, diagnosisType);
        const diagnosis = this.generateDiagnosis(
            status, 
            coverageRate, 
            { yellowRatio, brownRatio, redRatio, whiteRatio, grayRatio },
            complexityFeatures,
            diagnosisType
        );
        
        return {
            coverageRate,
            yellowRatio,
            brownRatio,
            redRatio,
            whiteRatio,
            grayRatio,
            diagnosisType,
            spotCount: spots.length,
            avgSpotSize: spots.length > 0 ? totalSpotArea / spots.length : 0,
            ...complexityFeatures,
            status,
            diagnosis
        };
    }

    determinePrimaryDiagnosisType(params) {
        const { yellowRatio, brownRatio, redRatio, whiteRatio, grayRatio, 
                avgCircularity, spotCount, avgSpotSize } = params;
        
        if (brownRatio > 0.5) {
            if (avgCircularity > 0.5 && avgSpotSize > 100) {
                return 'fungal_spot';
            }
            if (brownRatio > 0.7) {
                return 'fungal_necrosis';
            }
            return 'bacterial_spot';
        }
        
        if (redRatio > 0.4) {
            return 'rust';
        }
        
        if (whiteRatio > 0.5) {
            return 'powdery_mildew';
        }
        
        if (grayRatio > 0.4) {
            return 'gray_mold';
        }
        
        if (yellowRatio > 0.5) {
            if (spotCount > 5 && avgSpotSize < 80) {
                return 'nutrient_deficiency';
            }
            if (yellowRatio > 0.7 && avgCircularity < 0.4) {
                return 'yellowing';
            }
            return 'nutrient_deficiency';
        }
        
        if (brownRatio > yellowRatio && brownRatio > 0.3) {
            return 'fungal_spot';
        }
        
        if (yellowRatio > brownRatio && yellowRatio > 0.3) {
            return 'nutrient_deficiency';
        }
        
        const maxRatio = Math.max(brownRatio, redRatio, whiteRatio, grayRatio);
        if (maxRatio >= yellowRatio && maxRatio > 0.2) {
            if (brownRatio === maxRatio) return 'fungal_spot';
            if (redRatio === maxRatio) return 'rust';
            if (whiteRatio === maxRatio) return 'powdery_mildew';
            if (grayRatio === maxRatio) return 'gray_mold';
        }
        
        if (yellowRatio > 0.2) {
            return 'nutrient_deficiency';
        }
        
        return 'unknown';
    }

    calculateComplexityFeatures(spots) {
        if (spots.length === 0) {
            return {
                avgCircularity: 0,
                avgPerimeterComplexity: 0,
                maxCircularity: 0,
                minCircularity: 1
            };
        }
        
        let totalCircularity = 0;
        let totalPerimeterComplexity = 0;
        let maxCirc = 0;
        let minCirc = 1;
        
        spots.forEach(spot => {
            const area = spot.size;
            const perimeter = spot.perimeter;
            
            const circularity = perimeter > 0 ? (4 * Math.PI * area) / (perimeter * perimeter) : 0;
            const expectedPerimeter = perimeter > 0 ? 2 * Math.sqrt(Math.PI * area) : 0;
            const perimeterComplexity = expectedPerimeter > 0 ? perimeter / expectedPerimeter : 1;
            
            totalCircularity += circularity;
            totalPerimeterComplexity += perimeterComplexity;
            
            maxCirc = Math.max(maxCirc, circularity);
            minCirc = Math.min(minCirc, circularity);
        });
        
        return {
            avgCircularity: totalCircularity / spots.length,
            avgPerimeterComplexity: totalPerimeterComplexity / spots.length,
            maxCircularity: maxCirc,
            minCircularity: minCirc
        };
    }

    determineStatus(coverageRate, diagnosisType) {
        if (coverageRate <= this.healthyThreshold) {
            return 'healthy';
        }
        
        const isSevereType = ['fungal_necrosis', 'rust', 'gray_mold'].includes(diagnosisType);
        
        if (isSevereType || coverageRate > this.mildThreshold) {
            return 'severe';
        }
        
        return 'mild';
    }

    generateDiagnosis(status, coverageRate, ratios, complexityFeatures, diagnosisType) {
        const { yellowRatio, brownRatio, redRatio, whiteRatio, grayRatio } = ratios;
        
        const diagnoses = {
            healthy: {
                statusText: '健康',
                statusClass: 'healthy',
                possibleCause: '叶片状态良好',
                suggestion: '继续保持良好的养护习惯，定期检查'
            },
            mild: {
                statusText: '轻度异常',
                statusClass: 'mild',
                possibleCause: this.determinePossibleCause(diagnosisType, ratios, complexityFeatures),
                suggestion: this.generateSuggestion(diagnosisType, ratios, 'mild')
            },
            severe: {
                statusText: '重度异常',
                statusClass: 'severe',
                possibleCause: this.determinePossibleCause(diagnosisType, ratios, complexityFeatures),
                suggestion: this.generateSuggestion(diagnosisType, ratios, 'severe')
            }
        };
        
        return diagnoses[status];
    }

    determinePossibleCause(diagnosisType, ratios, complexityFeatures) {
        const { yellowRatio, brownRatio, redRatio, whiteRatio, grayRatio } = ratios;
        const causes = [];
        
        switch (diagnosisType) {
            case 'fungal_spot':
                causes.push('主要为真菌性叶斑病（如炭疽病、褐斑病）');
                if (complexityFeatures.avgCircularity > 0.5) {
                    causes.push('病斑呈圆形或近圆形，符合真菌病害特征');
                }
                if (brownRatio > 0.6) {
                    causes.push('叶片出现褐色坏死斑点');
                }
                break;
                
            case 'fungal_necrosis':
                causes.push('主要为真菌性坏死病害（如炭疽病、叶斑病）');
                causes.push('病斑已出现焦枯坏死，建议紧急处理');
                break;
                
            case 'bacterial_spot':
                causes.push('可能为细菌性斑点病');
                if (complexityFeatures.avgCircularity < 0.5) {
                    causes.push('病斑形状不规则，符合细菌性病害特征');
                }
                break;
                
            case 'rust':
                causes.push('主要为锈病（真菌病害）');
                causes.push('病斑呈红褐色，常见于豆类、蔷薇科植物');
                break;
                
            case 'powdery_mildew':
                causes.push('主要为白粉病（真菌病害）');
                causes.push('叶片表面出现白色粉状霉层');
                break;
                
            case 'gray_mold':
                causes.push('主要为灰霉病（真菌病害）');
                causes.push('病斑呈灰色霉层，高湿环境易爆发');
                break;
                
            case 'nutrient_deficiency':
                causes.push('主要为营养缺乏症状');
                if (yellowRatio > 0.6) {
                    causes.push('叶片黄化，可能缺氮或缺铁');
                }
                if (yellowRatio > 0.3 && yellowRatio < 0.6 && brownRatio > 0.2) {
                    causes.push('可能缺磷或缺钾，伴有叶片焦枯');
                }
                break;
                
            case 'yellowing':
                causes.push('主要为叶片黄化症状');
                causes.push('可能是缺氮、缺铁、或环境胁迫（如干旱、涝害）');
                break;
                
            default:
                if (brownRatio > yellowRatio && brownRatio > 0.3) {
                    causes.push('主要为褐色坏死病斑，可能是真菌病害或缺素');
                } else if (yellowRatio > 0.3) {
                    causes.push('主要为黄化症状，可能是缺素或生理性黄化');
                } else {
                    causes.push('需要进一步观察分析');
                }
        }
        
        return causes.join('；');
    }

    generateSuggestion(diagnosisType, ratios, severity) {
        const { yellowRatio, brownRatio, redRatio, whiteRatio, grayRatio } = ratios;
        const suggestions = [];
        
        if (severity === 'mild') {
            suggestions.push('建议观察2-3天，注意环境变化');
        } else {
            suggestions.push('建议立即采取措施，必要时咨询专业人员');
        }
        
        switch (diagnosisType) {
            case 'fungal_spot':
            case 'fungal_necrosis':
                suggestions.push('喷施广谱杀菌剂（如多菌灵、代森锰锌）');
                suggestions.push('改善通风透光条件，降低湿度');
                suggestions.push('及时清除病叶，减少病原菌传播');
                break;
                
            case 'bacterial_spot':
                suggestions.push('喷施农用链霉素或铜制剂');
                suggestions.push('避免浇水时溅湿叶片');
                suggestions.push('加强通风，降低空气湿度');
                break;
                
            case 'rust':
                suggestions.push('喷施三唑酮、戊唑醇等杀锈病药剂');
                suggestions.push('清除病残体，减少越冬菌源');
                suggestions.push('合理密植，改善通风透光');
                break;
                
            case 'powdery_mildew':
                suggestions.push('喷施硫磺粉、三唑酮或醚菌酯');
                suggestions.push('保持良好通风，避免高温高湿');
                suggestions.push('清除下部病叶，减少菌源');
                break;
                
            case 'gray_mold':
                suggestions.push('喷施腐霉利、异菌脲或嘧霉胺');
                suggestions.push('降低湿度，加强通风');
                suggestions.push('及时清除病花病果');
                break;
                
            case 'nutrient_deficiency':
                if (yellowRatio > 0.6) {
                    suggestions.push('检查土壤氮素含量，考虑追施尿素');
                    suggestions.push('叶面喷施螯合铁肥（如EDTA-Fe）');
                }
                if (brownRatio > 0.2 && yellowRatio > 0.3) {
                    suggestions.push('考虑补充磷钾肥（如磷酸二氢钾）');
                }
                suggestions.push('改善土壤排水，避免积水');
                suggestions.push('检查根系是否健康');
                break;
                
            case 'yellowing':
                suggestions.push('全面检查土壤养分状况');
                suggestions.push('检查根系是否有腐烂或虫害');
                suggestions.push('调整浇水和光照条件');
                suggestions.push('必要时进行土壤检测');
                break;
                
            default:
                if (brownRatio > yellowRatio && brownRatio > 0.3) {
                    suggestions.push('先按真菌病害处理，喷施杀菌剂');
                } else if (yellowRatio > 0.3) {
                    suggestions.push('检查养分状况，考虑补充肥料');
                }
        }
        
        suggestions.push('控制浇水量，避免过湿或过干');
        
        return suggestions.join('；');
    }
}
