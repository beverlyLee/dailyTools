class ChordDetector {
    constructor(options = {}) {
        this.options = {
            chordDistance: options.chordDistance || 20,
            minChordSize: options.minChordSize || 2,
            maxYDiff: options.maxYDiff || 100
        };
    }

    detect(mappedNotes, lineSpacing = 15) {
        console.log('[ChordDetector] 检测和弦...');
        
        const chordDistance = Math.max(this.options.chordDistance, lineSpacing * 1.2);
        
        const sortedNotes = [...mappedNotes].sort((a, b) => a.x - b.x);
        
        const chords = [];
        const singleNotes = [];
        const used = new Set();
        
        for (let i = 0; i < sortedNotes.length; i++) {
            if (used.has(i)) continue;
            
            const note = sortedNotes[i];
            const chordNotes = [note];
            used.add(i);
            
            for (let j = i + 1; j < sortedNotes.length; j++) {
                if (used.has(j)) continue;
                
                const other = sortedNotes[j];
                const xDiff = Math.abs(other.x - note.x);
                const yDiff = Math.abs(other.y - note.y);
                
                if (xDiff <= chordDistance && yDiff <= this.options.maxYDiff) {
                    chordNotes.push(other);
                    used.add(j);
                }
            }
            
            if (chordNotes.length >= this.options.minChordSize) {
                chordNotes.sort((a, b) => b.y - a.y);
                
                const pitches = chordNotes.map(n => n.fullName || '[?]');
                const validPitches = pitches.filter(p => p !== '[?]');
                
                chords.push({
                    type: 'chord',
                    x: chordNotes.reduce((sum, n) => sum + n.x, 0) / chordNotes.length,
                    y: chordNotes.reduce((sum, n) => sum + n.y, 0) / chordNotes.length,
                    notes: chordNotes,
                    pitches: validPitches,
                    allPitches: pitches,
                    noteCount: chordNotes.length,
                    boundingBox: this.getBoundingBox(chordNotes),
                    staffIndex: note.staffIndex
                });
            } else {
                singleNotes.push({
                    type: 'note',
                    x: note.x,
                    y: note.y,
                    pitch: note.fullName || '[?]',
                    note: note,
                    staffIndex: note.staffIndex
                });
            }
        }
        
        const result = [
            ...chords.map(c => ({
                ...c,
                isChord: true
            })),
            ...singleNotes.map(n => ({
                ...n,
                pitches: [n.pitch],
                isChord: false,
                noteCount: 1
            }))
        ];
        
        result.sort((a, b) => a.x - b.x);
        
        console.log(`[ChordDetector] 检测到 ${chords.length} 个和弦, ${singleNotes.length} 个单音符`);
        
        return {
            chords: chords,
            singleNotes: singleNotes,
            all: result
        };
    }

    getBoundingBox(notes) {
        if (notes.length === 0) return null;
        
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        
        for (const note of notes) {
            if (note.boundingBox) {
                minX = Math.min(minX, note.boundingBox.minX);
                maxX = Math.max(maxX, note.boundingBox.maxX);
                minY = Math.min(minY, note.boundingBox.minY);
                maxY = Math.max(maxY, note.boundingBox.maxY);
            } else {
                minX = Math.min(minX, note.x - (note.width || 10) / 2);
                maxX = Math.max(maxX, note.x + (note.width || 10) / 2);
                minY = Math.min(minY, note.y - (note.height || 10) / 2);
                maxY = Math.max(maxY, note.y + (note.height || 10) / 2);
            }
        }
        
        return {
            minX, maxX, minY, maxY,
            width: maxX - minX,
            height: maxY - minY,
            centerX: (minX + maxX) / 2,
            centerY: (minY + maxY) / 2
        };
    }

    formatOutput(chordResult, staves = []) {
        const lines = [];
        const groupedByStaff = {};
        
        for (const item of chordResult.all) {
            const staffIndex = item.staffIndex !== undefined ? item.staffIndex : 0;
            if (!groupedByStaff[staffIndex]) {
                groupedByStaff[staffIndex] = [];
            }
            groupedByStaff[staffIndex].push(item);
        }
        
        const staffIndices = Object.keys(groupedByStaff).map(Number).sort((a, b) => a - b);
        
        for (const staffIndex of staffIndices) {
            const items = groupedByStaff[staffIndex];
            const staff = staves[staffIndex];
            const handLabel = staff && staff.handLabel ? staff.handLabel : (staffIndex === 0 ? '右手' : '左手');
            
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const seqNum = i + 1;
                
                if (item.isChord) {
                    const pitchStr = item.allPitches.join(', ');
                    lines.push(`第${seqNum}个和弦(${handLabel}): [${pitchStr}]`);
                } else {
                    lines.push(`第${seqNum}个音符(${handLabel}): ${item.pitch}`);
                }
            }
        }
        
        return lines.join('\n');
    }

    toJSON(chordResult) {
        return {
            items: chordResult.all.map(item => ({
                type: item.isChord ? 'chord' : 'note',
                x: Math.round(item.x * 100) / 100,
                y: Math.round(item.y * 100) / 100,
                pitches: item.allPitches || [item.pitch],
                noteCount: item.noteCount,
                staffIndex: item.staffIndex
            }))
        };
    }
}

export { ChordDetector };
