class BeamSearchDecoder {
    constructor(options = {}) {
        this.beamSize = options.beamSize || 4;
        this.maxLength = options.maxLength || 128;
        this.minLength = options.minLength || 1;
        this.lengthPenalty = options.lengthPenalty || 1.0;
        this.earlyStopping = options.earlyStopping !== false;
        this.temperature = options.temperature || 1.0;
        this.topK = options.topK || 0;
        this.topP = options.topP || 1.0;
        
        this.eosTokenId = options.eosTokenId || 2;
        this.bosTokenId = options.bosTokenId || 1;
        this.padTokenId = options.padTokenId || 0;
    }

    async decode(modelRunner, inputIds, options = {}) {
        const { 
            beamSize = this.beamSize,
            maxLength = this.maxLength,
            minLength = this.minLength,
            initialTokenId = this.bosTokenId
        } = options;

        const beams = this._initializeBeams(initialTokenId, inputIds);
        
        let finishedBeams = [];
        let currentStep = 0;

        while (currentStep < maxLength && finishedBeams.length < beamSize) {
            currentStep++;
            
            const allCandidates = [];
            
            for (let i = 0; i < beams.length; i++) {
                const beam = beams[i];
                
                if (this._isBeamFinished(beam, currentStep)) {
                    finishedBeams.push(beam);
                    continue;
                }

                const nextTokenLogits = await modelRunner(beam.tokens, beam.encoderHiddenStates);
                const topKTokens = this._getTopKTokens(nextTokenLogits, beamSize * 2);

                for (const { tokenId, logProb } of topKTokens) {
                    const newBeam = this._expandBeam(beam, tokenId, logProb, currentStep);
                    allCandidates.push(newBeam);
                }
            }

            if (allCandidates.length === 0) {
                break;
            }

            allCandidates.sort((a, b) => b.score - a.score);
            beams = allCandidates.slice(0, beamSize);

            for (const beam of beams) {
                if (this._isBeamFinished(beam, currentStep)) {
                    finishedBeams.push(beam);
                }
            }

            beams = beams.filter(beam => !this._isBeamFinished(beam, currentStep));

            if (beams.length === 0) {
                break;
            }
        }

        if (finishedBeams.length === 0) {
            finishedBeams = beams;
        }

        finishedBeams = this._applyLengthPenalty(finishedBeams);
        finishedBeams.sort((a, b) => b.score - a.score);

        return {
            sequences: finishedBeams.map(b => b.tokens),
            scores: finishedBeams.map(b => b.score),
            bestSequence: finishedBeams[0]?.tokens || [],
            bestScore: finishedBeams[0]?.score || 0
        };
    }

    _initializeBeams(initialTokenId, encoderHiddenStates) {
        return [{
            tokens: [initialTokenId],
            score: 0,
            logProbs: [],
            encoderHiddenStates,
            finished: false
        }];
    }

    _expandBeam(beam, tokenId, logProb, currentStep) {
        return {
            tokens: [...beam.tokens, tokenId],
            score: beam.score + logProb,
            logProbs: [...beam.logProbs, logProb],
            encoderHiddenStates: beam.encoderHiddenStates,
            finished: tokenId === this.eosTokenId || currentStep >= this.maxLength
        };
    }

    _getTopKTokens(logits, k) {
        const scaledLogits = this._applyTemperature(logits);
        const tokenScores = scaledLogits.map((logit, index) => ({
            tokenId: index,
            logProb: this._logSoftmaxOne(logit, scaledLogits)
        }));

        tokenScores.sort((a, b) => b.logProb - a.logProb);

        if (this.topK > 0) {
            return tokenScores.slice(0, Math.min(k, this.topK));
        }

        if (this.topP < 1.0) {
            return this._applyTopP(tokenScores);
        }

        return tokenScores.slice(0, k);
    }

    _applyTemperature(logits) {
        if (this.temperature === 1.0) {
            return logits;
        }
        return logits.map(l => l / this.temperature);
    }

    _logSoftmaxOne(logit, allLogits) {
        const maxLogit = Math.max(...allLogits);
        const sumExp = allLogits.reduce((sum, l) => sum + Math.exp(l - maxLogit), 0);
        return logit - maxLogit - Math.log(sumExp);
    }

    _applyTopP(tokenScores) {
        const sortedScores = [...tokenScores].sort((a, b) => b.logProb - a.logProb);
        const probs = sortedScores.map(s => Math.exp(s.logProb));
        
        let cumulativeProb = 0;
        const selected = [];
        
        for (let i = 0; i < sortedScores.length; i++) {
            selected.push(sortedScores[i]);
            cumulativeProb += probs[i];
            if (cumulativeProb >= this.topP) {
                break;
            }
        }

        return selected;
    }

    _isBeamFinished(beam, currentStep) {
        const lastToken = beam.tokens[beam.tokens.length - 1];
        if (lastToken === this.eosTokenId) {
            if (beam.tokens.length - 1 < this.minLength) {
                return false;
            }
            return true;
        }
        return false;
    }

    _applyLengthPenalty(beams) {
        if (this.lengthPenalty === 1.0) {
            return beams;
        }

        return beams.map(beam => {
            const length = beam.tokens.length;
            const penalty = Math.pow(5 + length, this.lengthPenalty) / Math.pow(6, this.lengthPenalty);
            return {
                ...beam,
                score: beam.score / penalty
            };
        });
    }

    async greedyDecode(modelRunner, inputIds, options = {}) {
        const {
            maxLength = this.maxLength,
            minLength = this.minLength,
            initialTokenId = this.bosTokenId
        } = options;

        const tokens = [initialTokenId];
        const logProbs = [];

        for (let step = 0; step < maxLength; step++) {
            const nextTokenLogits = await modelRunner(tokens, null);
            const scaledLogits = this._applyTemperature(nextTokenLogits);
            
            let maxIndex = 0;
            let maxValue = -Infinity;
            
            for (let i = 0; i < scaledLogits.length; i++) {
                if (scaledLogits[i] > maxValue) {
                    maxValue = scaledLogits[i];
                    maxIndex = i;
                }
            }

            const logProb = this._logSoftmaxOne(maxValue, scaledLogits);
            tokens.push(maxIndex);
            logProbs.push(logProb);

            if (maxIndex === this.eosTokenId && tokens.length - 1 >= minLength) {
                break;
            }
        }

        const finalScore = logProbs.reduce((sum, lp) => sum + lp, 0);
        
        return {
            sequences: [tokens],
            scores: [finalScore],
            bestSequence: tokens,
            bestScore: finalScore
        };
    }

    async sampleDecode(modelRunner, inputIds, options = {}) {
        const {
            maxLength = this.maxLength,
            minLength = this.minLength,
            initialTokenId = this.bosTokenId
        } = options;

        const tokens = [initialTokenId];
        const logProbs = [];

        for (let step = 0; step < maxLength; step++) {
            const nextTokenLogits = await modelRunner(tokens, null);
            const scaledLogits = this._applyTemperature(nextTokenLogits);
            
            const probs = scaledLogits.map(l => Math.exp(l));
            const sumProbs = probs.reduce((a, b) => a + b, 0);
            const normalizedProbs = probs.map(p => p / sumProbs);

            const sampledIndex = this._sampleFromDistribution(normalizedProbs);
            const logProb = Math.log(normalizedProbs[sampledIndex]);
            
            tokens.push(sampledIndex);
            logProbs.push(logProb);

            if (sampledIndex === this.eosTokenId && tokens.length - 1 >= minLength) {
                break;
            }
        }

        const finalScore = logProbs.reduce((sum, lp) => sum + lp, 0);
        
        return {
            sequences: [tokens],
            scores: [finalScore],
            bestSequence: tokens,
            bestScore: finalScore
        };
    }

    _sampleFromDistribution(probs) {
        const random = Math.random();
        let cumulative = 0;
        
        for (let i = 0; i < probs.length; i++) {
            cumulative += probs[i];
            if (random <= cumulative) {
                return i;
            }
        }
        
        return probs.length - 1;
    }

    async diverseBeamSearch(modelRunner, inputIds, options = {}) {
        const {
            beamSize = this.beamSize,
            maxLength = this.maxLength,
            diversityPenalty = 0.5,
            initialTokenId = this.bosTokenId
        } = options;

        const beams = this._initializeBeams(initialTokenId, inputIds);
        const finishedBeams = [];
        const usedTokenSets = new Set();

        let currentStep = 0;

        while (currentStep < maxLength && finishedBeams.length < beamSize) {
            currentStep++;
            const allCandidates = [];

            for (let i = 0; i < beams.length; i++) {
                const beam = beams[i];
                
                if (this._isBeamFinished(beam, currentStep)) {
                    finishedBeams.push(beam);
                    continue;
                }

                const nextTokenLogits = await modelRunner(beam.tokens, beam.encoderHiddenStates);
                const topKTokens = this._getTopKTokens(nextTokenLogits, beamSize);

                for (const { tokenId, logProb } of topKTokens) {
                    const newBeam = this._expandBeam(beam, tokenId, logProb, currentStep);
                    
                    const tokenKey = newBeam.tokens.join(',');
                    if (usedTokenSets.has(tokenKey)) {
                        newBeam.score -= diversityPenalty;
                    }
                    usedTokenSets.add(tokenKey);
                    
                    allCandidates.push(newBeam);
                }
            }

            if (allCandidates.length === 0) {
                break;
            }

            allCandidates.sort((a, b) => b.score - a.score);
            beams.length = 0;
            
            for (const candidate of allCandidates) {
                if (this._isBeamFinished(candidate, currentStep)) {
                    finishedBeams.push(candidate);
                } else if (beams.length < beamSize) {
                    beams.push(candidate);
                }
            }

            if (beams.length === 0) {
                break;
            }
        }

        if (finishedBeams.length === 0) {
            finishedBeams.push(...beams);
        }

        finishedBeams.sort((a, b) => b.score - a.score);

        return {
            sequences: finishedBeams.slice(0, beamSize).map(b => b.tokens),
            scores: finishedBeams.slice(0, beamSize).map(b => b.score),
            bestSequence: finishedBeams[0]?.tokens || [],
            bestScore: finishedBeams[0]?.score || 0
        };
    }
}

class SequenceGenerator {
    constructor(decoder, tokenizer) {
        this.decoder = decoder;
        this.tokenizer = tokenizer;
    }

    async generate(sourceText, modelRunner, options = {}) {
        const {
            method = 'beam',
            returnMultiple = false,
            numBeams = 4,
            maxNewTokens = 64
        } = options;

        const encoded = this.tokenizer.encode(sourceText, {
            addSpecialTokens: true,
            padding: false
        });

        let result;

        switch (method) {
            case 'greedy':
                result = await this.decoder.greedyDecode(modelRunner, encoded.inputIds, {
                    maxLength: maxNewTokens
                });
                break;
            case 'sample':
                result = await this.decoder.sampleDecode(modelRunner, encoded.inputIds, {
                    maxLength: maxNewTokens
                });
                break;
            case 'diverse':
                result = await this.decoder.diverseBeamSearch(modelRunner, encoded.inputIds, {
                    beamSize: numBeams,
                    maxLength: maxNewTokens
                });
                break;
            case 'beam':
            default:
                result = await this.decoder.decode(modelRunner, encoded.inputIds, {
                    beamSize: numBeams,
                    maxLength: maxNewTokens
                });
        }

        if (returnMultiple) {
            return result.sequences.map(seq => ({
                text: this.tokenizer.decode(seq, { skipSpecialTokens: true }),
                score: result.scores[result.sequences.indexOf(seq)]
            }));
        }

        return {
            text: this.tokenizer.decode(result.bestSequence, { skipSpecialTokens: true }),
            score: result.bestScore,
            tokens: result.bestSequence
        };
    }
}

export { BeamSearchDecoder, SequenceGenerator };
