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
  computeLineDiff,
  mergeChange
};
