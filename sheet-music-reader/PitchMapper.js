class PitchMapper {
    constructor(options = {}) {
        this.options = {
            clef: options.clef || 'treble',
            tolerance: options.tolerance || 0.3
        };
        
        this.noteNames = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    }

    map(noteHeads, staves, forceClef = null) {
        console.log('[PitchMapper] 几何映射音高...');
        
        const mappedNotes = [];
        const clef = forceClef || this.options.clef;
        
        for (const note of noteHeads) {
            const staff = this.findNearestStaff(note, staves);
            
            if (staff) {
                const pitchInfo = this.calculatePitchByPosition(note, staff, clef);
                mappedNotes.push({
                    ...note,
                    ...pitchInfo
                });
            } else {
                mappedNotes.push({
                    ...note,
                    noteName: '[?]',
                    octave: null,
                    fullName: '[?]',
                    position: 'unknown',
                    isOnLine: false,
                    isInSpace: false,
                    clef: clef
                });
            }
        }
        
        console.log(`[PitchMapper] 完成 ${mappedNotes.length} 个符头的位置映射`);
        
        return mappedNotes;
    }

    findNearestStaff(note, staves) {
        if (staves.length === 0) return null;
        
        let nearest = null;
        let minDistance = Infinity;
        
        for (const staff of staves) {
            const staffCenter = (staff.topY + staff.bottomY) / 2;
            const distance = Math.abs(note.y - staffCenter);
            
            if (distance < minDistance) {
                minDistance = distance;
                nearest = staff;
            }
        }
        
        return nearest;
    }

    calculatePitchByPosition(note, staff, clef) {
        const lines = staff.lines || [];
        const lineSpacing = staff.lineSpacing || 15;
        const halfStep = lineSpacing / 2;
        const tolerance = halfStep * this.options.tolerance;
        
        if (lines.length === 0) {
            return {
                noteName: '[?]',
                octave: null,
                fullName: '[?]',
                position: 'unknown',
                isOnLine: false,
                isInSpace: false,
                clef: clef,
                lineDistance: null,
                spaceDistance: null
            };
        }
        
        const noteY = note.y;
        
        let isOnLine = false;
        let isInSpace = false;
        let lineIndex = -1;
        let spaceIndex = -1;
        let minLineDistance = Infinity;
        let minSpaceDistance = Infinity;
        
        for (let i = 0; i < lines.length; i++) {
            const lineY = lines[i];
            const distance = Math.abs(noteY - lineY);
            
            if (distance < minLineDistance) {
                minLineDistance = distance;
                if (distance <= tolerance) {
                    isOnLine = true;
                    lineIndex = i;
                }
            }
            
            if (i < lines.length - 1) {
                const spaceCenterY = (lines[i] + lines[i + 1]) / 2;
                const spaceDistance = Math.abs(noteY - spaceCenterY);
                
                if (spaceDistance < minSpaceDistance) {
                    minSpaceDistance = spaceDistance;
                    if (spaceDistance <= tolerance) {
                        isInSpace = true;
                        spaceIndex = i;
                    }
                }
            }
        }
        
        const aboveTopLine = noteY < lines[0] - tolerance;
        const belowBottomLine = noteY > lines[lines.length - 1] + tolerance;
        
        let ledgerLineIndex = null;
        if (aboveTopLine || belowBottomLine) {
            const distanceFromTop = lines[0] - noteY;
            const distanceFromBottom = noteY - lines[lines.length - 1];
            
            const stepsFromTop = Math.round(distanceFromTop / halfStep);
            const stepsFromBottom = Math.round(distanceFromBottom / halfStep);
            
            if (aboveTopLine && stepsFromTop > 0) {
                ledgerLineIndex = -stepsFromTop;
            } else if (belowBottomLine && stepsFromBottom > 0) {
                ledgerLineIndex = 4 + stepsFromBottom;
            }
        }
        
        if (!isOnLine && !isInSpace && ledgerLineIndex === null) {
            return {
                noteName: '[?]',
                octave: null,
                fullName: '[?]',
                position: 'ambiguous',
                isOnLine: false,
                isInSpace: false,
                clef: clef,
                lineDistance: minLineDistance,
                spaceDistance: minSpaceDistance,
                tolerance: tolerance
            };
        }
        
        let totalSteps;
        if (isOnLine && lineIndex >= 0) {
            totalSteps = lineIndex * 2;
        } else if (isInSpace && spaceIndex >= 0) {
            totalSteps = spaceIndex * 2 + 1;
        } else if (ledgerLineIndex !== null) {
            totalSteps = ledgerLineIndex;
        } else {
            return {
                noteName: '[?]',
                octave: null,
                fullName: '[?]',
                position: 'ambiguous',
                isOnLine: false,
                isInSpace: false,
                clef: clef
            };
        }
        
        let referenceNote, referenceOctave, referenceSteps;
        
        if (clef === 'bass') {
            referenceNote = 3;
            referenceOctave = 3;
            referenceSteps = 6;
        } else {
            referenceNote = 6;
            referenceOctave = 4;
            referenceSteps = 4;
        }
        
        let noteIndex = totalSteps - referenceSteps + referenceNote;
        let octave = referenceOctave;
        
        while (noteIndex < 0) {
            noteIndex += 7;
            octave--;
        }
        while (noteIndex >= 7) {
            noteIndex -= 7;
            octave++;
        }
        
        if (clef === 'treble') {
            if (isOnLine) {
                const lineNoteIndices = [4, 2, 6, 4, 2];
                const lineOctaves = [4, 5, 5, 5, 6];
                if (lineIndex >= 0 && lineIndex < lineNoteIndices.length) {
                    noteIndex = lineNoteIndices[lineIndex];
                    octave = lineOctaves[lineIndex];
                }
            } else if (isInSpace) {
                const spaceNoteIndices = [5, 3, 0, 5];
                const spaceOctaves = [4, 5, 5, 5];
                if (spaceIndex >= 0 && spaceIndex < spaceNoteIndices.length) {
                    noteIndex = spaceNoteIndices[spaceIndex];
                    octave = spaceOctaves[spaceIndex];
                }
            }
        } else if (clef === 'bass') {
            if (isOnLine) {
                const lineNoteIndices = [2, 6, 4, 2, 6];
                const lineOctaves = [3, 3, 3, 4, 4];
                if (lineIndex >= 0 && lineIndex < lineNoteIndices.length) {
                    noteIndex = lineNoteIndices[lineIndex];
                    octave = lineOctaves[lineIndex];
                }
            } else if (isInSpace) {
                const spaceNoteIndices = [3, 0, 5, 3];
                const spaceOctaves = [3, 4, 3, 4];
                if (spaceIndex >= 0 && spaceIndex < spaceNoteIndices.length) {
                    noteIndex = spaceNoteIndices[spaceIndex];
                    octave = spaceOctaves[spaceIndex];
                }
            }
        }
        
        const noteName = this.noteNames[noteIndex];
        const fullName = `${noteName}${octave}`;
        
        let positionLabel;
        if (isOnLine) {
            positionLabel = `线${lineIndex + 1}`;
        } else if (isInSpace) {
            positionLabel = `间${spaceIndex + 1}`;
        } else {
            positionLabel = `加线位置`;
        }
        
        return {
            noteName: noteName,
            octave: octave,
            fullName: fullName,
            position: positionLabel,
            isOnLine: isOnLine,
            isInSpace: isInSpace,
            isLedgerLine: ledgerLineIndex !== null,
            clef: clef,
            lineIndex: lineIndex,
            spaceIndex: spaceIndex,
            totalSteps: totalSteps
        };
    }

    setClef(clef) {
        this.options.clef = clef;
    }
}

export { PitchMapper };
