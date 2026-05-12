class RhythmParser {
    constructor(options = {}) {
        this.options = {
            minConfidence: options.minConfidence || 0.65,
            showAmbiguous: options.showAmbiguous !== undefined ? options.showAmbiguous : true
        };
    }

    parse(mappedNotes, staves, barLines, width) {
        console.log('[RhythmParser] 开始解析小节结构...');
        console.log(`[RhythmParser] 输入: ${mappedNotes.length} 个音符, ${staves.length} 个谱表, ${barLines.length} 个小节线`);
        
        const groupedByStaff = this.groupNotesByStaff(mappedNotes, staves);
        
        const stavesWithHands = this.detectHands(staves);
        
        const measures = this.createMeasures(groupedByStaff, stavesWithHands, barLines, width);
        
        const formattedOutput = this.formatOutput(measures, stavesWithHands);
        
        return {
            measures: measures,
            formattedOutput: formattedOutput,
            staves: stavesWithHands
        };
    }

    groupNotesByStaff(mappedNotes, staves) {
        const groups = {};
        
        for (const staff of staves) {
            groups[staff.index] = {
                staff: staff,
                notes: []
            };
        }
        
        for (const note of mappedNotes) {
            const staffIndex = note.staffIndex !== undefined ? note.staffIndex : 0;
            
            if (!groups[staffIndex]) {
                groups[staffIndex] = {
                    staff: { index: staffIndex },
                    notes: []
                };
            }
            
            groups[staffIndex].notes.push(note);
        }
        
        for (const key in groups) {
            groups[key].notes.sort((a, b) => a.x - b.x);
        }
        
        return groups;
    }

    detectHands(staves) {
        const stavesWithHands = [...staves];
        
        for (let i = 0; i < stavesWithHands.length; i++) {
            if (stavesWithHands.length === 2) {
                stavesWithHands[i].hand = i === 0 ? 'right' : 'left';
                stavesWithHands[i].handLabel = i === 0 ? '右手' : '左手';
            } else if (stavesWithHands.length > 2) {
                if (i % 2 === 0) {
                    stavesWithHands[i].hand = 'right';
                    stavesWithHands[i].handLabel = '右手';
                } else {
                    stavesWithHands[i].hand = 'left';
                    stavesWithHands[i].handLabel = '左手';
                }
            } else {
                stavesWithHands[i].hand = 'right';
                stavesWithHands[i].handLabel = '右手';
            }
        }
        
        return stavesWithHands;
    }

    createMeasures(groupedByStaff, stavesWithHands, barLines, width) {
        const measures = [];
        
        const staffBarLines = {};
        for (const barLine of barLines) {
            if (!staffBarLines[barLine.staffIndex]) {
                staffBarLines[barLine.staffIndex] = [];
            }
            staffBarLines[barLine.staffIndex].push(barLine.x);
        }
        
        for (const staff of stavesWithHands) {
            const staffIndex = staff.index;
            const group = groupedByStaff[staffIndex];
            const notes = group ? group.notes : [];
            
            const lines = staffBarLines[staffIndex] || [];
            lines.sort((a, b) => a - b);
            
            let currentMeasureNotes = [];
            let measureStartX = 0;
            let lineIndex = 0;
            
            for (const note of notes) {
                while (lineIndex < lines.length && note.x > lines[lineIndex]) {
                    if (currentMeasureNotes.length > 0 || measureStartX > 0) {
                        measures.push({
                            measureIndex: measures.length + 1,
                            staffIndex: staffIndex,
                            hand: staff.hand,
                            handLabel: staff.handLabel,
                            notes: [...currentMeasureNotes],
                            startX: measureStartX,
                            endX: lines[lineIndex]
                        });
                        currentMeasureNotes = [];
                    }
                    measureStartX = lines[lineIndex];
                    lineIndex++;
                }
                currentMeasureNotes.push(note);
            }
            
            if (currentMeasureNotes.length > 0) {
                measures.push({
                    measureIndex: measures.length + 1,
                    staffIndex: staffIndex,
                    hand: staff.hand,
                    handLabel: staff.handLabel,
                    notes: currentMeasureNotes,
                    startX: measureStartX,
                    endX: width
                });
            }
        }
        
        measures.sort((a, b) => {
            if (a.measureIndex !== b.measureIndex) {
                return a.measureIndex - b.measureIndex;
            }
            return a.staffIndex - b.staffIndex;
        });
        
        console.log(`[RhythmParser] 解析出 ${measures.length} 个小节段`);
        
        return measures;
    }

    formatOutput(measures, stavesWithHands) {
        const lines = [];
        
        const groupedByMeasure = {};
        for (const measure of measures) {
            const key = measure.measureIndex;
            if (!groupedByMeasure[key]) {
                groupedByMeasure[key] = [];
            }
            groupedByMeasure[key].push(measure);
        }
        
        const measureNumbers = Object.keys(groupedByMeasure).map(Number).sort((a, b) => a - b);
        
        for (const measureNum of measureNumbers) {
            const measureParts = groupedByMeasure[measureNum];
            
            let rightNotes = [];
            let leftNotes = [];
            
            for (const part of measureParts) {
                const noteNames = part.notes.map(n => {
                    if (n.score < this.options.minConfidence) {
                        return this.options.showAmbiguous ? '[模糊]' : '';
                    }
                    return n.fullName;
                }).filter(n => n);
                
                if (part.hand === 'right') {
                    rightNotes = rightNotes.concat(noteNames);
                } else {
                    leftNotes = leftNotes.concat(noteNames);
                }
            }
            
            const rightStr = rightNotes.length > 0 ? rightNotes.join(', ') : '无';
            const leftStr = leftNotes.length > 0 ? leftNotes.join(', ') : '无';
            
            lines.push(`第${measureNum}小节右手: ${rightStr}`);
            if (stavesWithHands.length > 1 || leftNotes.length > 0) {
                lines.push(`第${measureNum}小节左手: ${leftStr}`);
            }
        }
        
        return lines.join('\n');
    }
}

export { RhythmParser };
