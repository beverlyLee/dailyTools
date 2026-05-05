const DiffMatchPatch = require('diff-match-patch');

const dmp = new DiffMatchPatch();

function compareTexts(text1, text2) {
  const lines1 = text1.split('\n');
  const lines2 = text2.split('\n');
  
  const diffs = dmp.diff_main(text1, text2);
  dmp.diff_cleanupSemantic(diffs);
  
  return processDiffsToLines(diffs, lines1, lines2);
}

function processDiffsToLines(diffs, lines1, lines2) {
  const result = {
    leftDecorations: [],
    rightDecorations: [],
    lineMappings: []
  };
  
  let leftLine = 0;
  let rightLine = 0;
  let leftPos = 0;
  let rightPos = 0;
  
  for (const diff of diffs) {
    const type = diff[0];
    const text = diff[1];
    const lines = text.split('\n');
    
    if (type === 0) {
      for (let i = 0; i < lines.length; i++) {
        if (i > 0) {
          leftLine++;
          rightLine++;
          leftPos = 0;
          rightPos = 0;
        }
        leftPos += lines[i].length;
        rightPos += lines[i].length;
      }
    } else if (type === -1) {
      for (let i = 0; i < lines.length; i++) {
        if (i > 0) {
          leftLine++;
          leftPos = 0;
        }
        
        if (lines[i].length > 0 || i > 0) {
          result.leftDecorations.push({
            line: leftLine,
            type: 'delete',
            startColumn: leftPos,
            endColumn: leftPos + lines[i].length
          });
        }
        
        leftPos += lines[i].length;
      }
    } else if (type === 1) {
      for (let i = 0; i < lines.length; i++) {
        if (i > 0) {
          rightLine++;
          rightPos = 0;
        }
        
        if (lines[i].length > 0 || i > 0) {
          result.rightDecorations.push({
            line: rightLine,
            type: 'insert',
            startColumn: rightPos,
            endColumn: rightPos + lines[i].length
          });
        }
        
        rightPos += lines[i].length;
      }
    }
  }
  
  return result;
}

function getLineBasedDiff(text1, text2) {
  const lines1 = text1.split('\n');
  const lines2 = text2.split('\n');
  
  const result = {
    leftLines: [],
    rightLines: [],
    mappings: []
  };
  
  const lineDiffs = computeLineDiff(lines1, lines2);
  
  let leftIdx = 0;
  let rightIdx = 0;
  
  for (const diff of lineDiffs) {
    if (diff.type === 'equal') {
      for (const line of diff.lines) {
        result.leftLines.push({ text: line, type: 'equal', originalIndex: leftIdx });
        result.rightLines.push({ text: line, type: 'equal', originalIndex: rightIdx });
        result.mappings.push({ left: leftIdx, right: rightIdx, type: 'equal' });
        leftIdx++;
        rightIdx++;
      }
    } else if (diff.type === 'delete') {
      for (const line of diff.lines) {
        result.leftLines.push({ text: line, type: 'delete', originalIndex: leftIdx });
        leftIdx++;
      }
    } else if (diff.type === 'insert') {
      for (const line of diff.lines) {
        result.rightLines.push({ text: line, type: 'insert', originalIndex: rightIdx });
        rightIdx++;
      }
    }
  }
  
  return result;
}

function computeLineDiff(lines1, lines2) {
  const m = lines1.length;
  const n = lines2.length;
  
  if (m === 0 && n === 0) return [];
  if (m === 0) return [{ type: 'insert', lines: lines2 }];
  if (n === 0) return [{ type: 'delete', lines: lines1 }];
  
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (lines1[i - 1] === lines2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  
  const result = [];
  let i = m;
  let j = n;
  
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && lines1[i - 1] === lines2[j - 1]) {
      result.unshift({ type: 'equal', lines: [lines1[i - 1]] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      if (result.length === 0 || result[0].type !== 'insert') {
        result.unshift({ type: 'insert', lines: [] });
      }
      result[0].lines.unshift(lines2[j - 1]);
      j--;
    } else if (i > 0) {
      if (result.length === 0 || result[0].type !== 'delete') {
        result.unshift({ type: 'delete', lines: [] });
      }
      result[0].lines.unshift(lines1[i - 1]);
      i--;
    }
  }
  
  return result;
}

function getDetailedLineDiff(text1, text2) {
  const lines1 = text1.split('\n');
  const lines2 = text2.split('\n');
  const lineDiffs = computeLineDiff(lines1, lines2);
  
  const result = {
    blocks: [],
    leftLineCount: lines1.length,
    rightLineCount: lines2.length,
    insertions: 0,
    deletions: 0,
    modifications: 0
  };
  
  let leftLine = 0;
  let rightLine = 0;
  
  for (let i = 0; i < lineDiffs.length; i++) {
    const diff = lineDiffs[i];
    const block = {
      type: diff.type,
      leftLines: [],
      rightLines: [],
      leftStartLine: leftLine,
      rightStartLine: rightLine
    };
    
    if (diff.type === 'equal') {
      for (const line of diff.lines) {
        block.leftLines.push({ text: line, lineNumber: leftLine, type: 'equal' });
        block.rightLines.push({ text: line, lineNumber: rightLine, type: 'equal' });
        leftLine++;
        rightLine++;
      }
    } else if (diff.type === 'delete') {
      const nextDiff = lineDiffs[i + 1];
      if (nextDiff && nextDiff.type === 'insert') {
        block.type = 'modify';
        for (const line of diff.lines) {
          block.leftLines.push({ text: line, lineNumber: leftLine, type: 'delete' });
          leftLine++;
          result.deletions++;
        }
        for (const line of nextDiff.lines) {
          block.rightLines.push({ text: line, lineNumber: rightLine, type: 'insert' });
          rightLine++;
          result.insertions++;
        }
        result.modifications++;
        i++;
      } else {
        for (const line of diff.lines) {
          block.leftLines.push({ text: line, lineNumber: leftLine, type: 'delete' });
          leftLine++;
          result.deletions++;
        }
      }
    } else if (diff.type === 'insert') {
      for (const line of diff.lines) {
        block.rightLines.push({ text: line, lineNumber: rightLine, type: 'insert' });
        rightLine++;
        result.insertions++;
      }
    }
    
    if (block.leftLines.length > 0 || block.rightLines.length > 0) {
      result.blocks.push(block);
    }
  }
  
  return result;
}

function mergeSingleChange(direction, blockIndex, leftText, rightText) {
  const detailedDiff = getDetailedLineDiff(leftText, rightText);
  const block = detailedDiff.blocks[blockIndex];
  
  if (!block) return { leftText, rightText, changed: false };
  
  const leftLines = leftText.split('\n');
  const rightLines = rightText.split('\n');
  
  let changed = false;
  
  if (direction === 'right') {
    if (block.type === 'delete' || block.type === 'modify') {
      const deleteStart = block.leftStartLine;
      const deleteCount = block.leftLines.length;
      leftLines.splice(deleteStart, deleteCount);
      changed = true;
    }
    if (block.type === 'insert' || block.type === 'modify') {
      const insertStart = block.leftStartLine;
      const insertLines = block.rightLines.map(l => l.text);
      leftLines.splice(insertStart, 0, ...insertLines);
      changed = true;
    }
  } else if (direction === 'left') {
    if (block.type === 'insert' || block.type === 'modify') {
      const deleteStart = block.rightStartLine;
      const deleteCount = block.rightLines.length;
      rightLines.splice(deleteStart, deleteCount);
      changed = true;
    }
    if (block.type === 'delete' || block.type === 'modify') {
      const insertStart = block.rightStartLine;
      const insertLines = block.leftLines.map(l => l.text);
      rightLines.splice(insertStart, 0, ...insertLines);
      changed = true;
    }
  }
  
  return {
    leftText: leftLines.join('\n'),
    rightText: rightLines.join('\n'),
    changed
  };
}

function getCharDiffForLine(oldLine, newLine) {
  const diffs = dmp.diff_main(oldLine, newLine);
  dmp.diff_cleanupSemantic(diffs);
  
  return diffs.map(diff => ({
    type: diff[0] === 0 ? 'equal' : diff[0] === -1 ? 'delete' : 'insert',
    text: diff[1]
  }));
}

function mergeChange(fromText, toText, changeType, lineNumber) {
  const fromLines = fromText.split('\n');
  const toLines = toText.split('\n');
  
  if (changeType === 'insert') {
    toLines.splice(lineNumber, 0, fromLines[lineNumber] || '');
  } else if (changeType === 'delete') {
    if (lineNumber < toLines.length) {
      toLines.splice(lineNumber, 1);
    }
  } else if (changeType === 'replace') {
    if (lineNumber < toLines.length) {
      toLines[lineNumber] = fromLines[lineNumber] || '';
    }
  }
  
  return toLines.join('\n');
}

module.exports = {
  compareTexts,
  getLineBasedDiff,
  getDetailedLineDiff,
  computeLineDiff,
  mergeChange,
  mergeSingleChange,
  getCharDiffForLine
};
