import React from 'react';

const getPathsInJSON = (obj: any, currentPath = "", result: Record<string, { lineNumber: number, text: string }> = {}) => {
  if (typeof obj !== 'object' || obj === null) {
    // For primitive values at root level
    if (currentPath === "") {
      result[currentPath] = { lineNumber: 1, text: JSON.stringify(obj, null, 2) };
    }
    return result;
  }

  const jsonLines = JSON.stringify(obj, null, 2).split('\n');

  // For objects/arrays, process each key/index
  if (Array.isArray(obj)) {
    // Track the current line position within the array
    let currentLinePosition = 1; // Start at 1 to account for the opening bracket

    obj.forEach((item, index) => {
      const newPath = currentPath ? `${currentPath}[${index}]` : `[${index}]`;
      
      // Look for line that contains this item
      let lineIdx = -1;
      let valueStr = JSON.stringify(item);
      
      if (typeof item === 'object' && item !== null) {
        // For objects/arrays within array
        for (let i = currentLinePosition; i < jsonLines.length; i++) {
          const trimmedLine = jsonLines[i].trim();
          if ((trimmedLine.startsWith('{') || trimmedLine.startsWith('[')) && 
              (i === currentLinePosition || jsonLines[i-1].trim().endsWith('['))) {
            lineIdx = i;
            break;
          }
        }
        
        if (lineIdx === -1) {
          // Fallback - use the current position
          lineIdx = currentLinePosition;
        }
        
        const itemLines = JSON.stringify(item, null, 2).split('\n').length;
        currentLinePosition = lineIdx + (itemLines > 0 ? itemLines : 1);
        
        result[newPath] = {
          lineNumber: lineIdx + 1, // 1-indexed line numbers
          text: JSON.stringify(item, null, 2)
        };
        
        getPathsInJSON(item, newPath, result);
      } else {
        // For primitives within array - need to handle strings carefully
        const isString = typeof item === 'string';
        const searchValue = isString ? `"${item}"` : valueStr;
        
        for (let i = currentLinePosition; i < jsonLines.length; i++) {
          const trimmedLine = jsonLines[i].trim();
          // Look for the exact string/value with potential comma at the end
          if (trimmedLine === searchValue || trimmedLine === searchValue + ',') {
            lineIdx = i;
            break;
          }
        }
        
        if (lineIdx === -1) {
          // Fallback - use the current position
          lineIdx = currentLinePosition;
        }
        
        currentLinePosition = lineIdx + 1;
        
        result[newPath] = {
          lineNumber: lineIdx + 1, // 1-indexed line numbers
          text: String(item)
        };
      }
    });
  } else {
    // For objects
    let currentLinePosition = 1; // Start at 1 to account for the opening brace
    
    Object.entries(obj).forEach(([key, value]) => {
      const newPath = currentPath ? `${currentPath}.${key}` : key;
      
      // Find the line with this key
      let lineIdx = -1;
      for (let i = currentLinePosition; i < jsonLines.length; i++) {
        if (jsonLines[i].includes(`"${key}":`)) {
          lineIdx = i;
          break;
        }
      }
      
      if (lineIdx === -1) {
        // Fallback - use the current position
        lineIdx = currentLinePosition;
      }
      
      if (typeof value === 'object' && value !== null) {
        // For nested objects/arrays
        const valueLines = JSON.stringify(value, null, 2).split('\n').length;
        currentLinePosition = lineIdx + (valueLines > 0 ? valueLines : 1);
        
        result[newPath] = {
          lineNumber: lineIdx + 1, // 1-indexed line numbers
          text: JSON.stringify(value, null, 2)
        };
        
        getPathsInJSON(value, newPath, result);
      } else {
        // For primitive values
        currentLinePosition = lineIdx + 1;
        
        result[newPath] = {
          lineNumber: lineIdx + 1, // 1-indexed line numbers
          text: String(value)
        };
      }
    });
  }

  return result;
};

const renderHighlightedJSON = (jsonStr: string, isLeft: boolean) => {
  if (!jsonStr) return <div style={{ color: isDarkMode ? '#A0AEC0' : '#718096' }}>Paste your JSON here...</div>;

  try {
    const jsonObj = JSON.parse(jsonStr);
    const diffMap = diffResult ? getDiffMap(diffResult) : { left: {}, right: {} };
    const relevantMap = isLeft ? diffMap.left : diffMap.right;

    // Get paths and line numbers in the JSON
    const pathMap = getPathsInJSON(jsonObj);

    const jsonLines = jsonStr.split('\n');

    // 识别属于数组或对象的开始和结束行
    const arrayBracketLines = new Set<number>();
    // Track array items that are part of changed arrays
    const arrayItemLines = new Map<number, string>();
    
    jsonLines.forEach((line, i) => {
      const trimmed = line.trim();
      // 检查是否是数组或对象的开始/结束行
      if (trimmed === '[' || trimmed === '{' || 
          trimmed === ']' || trimmed === '}' || 
          trimmed === '],' || trimmed === '},') {
        arrayBracketLines.add(i);
      }
      // 检查是否包含键名并以 [ 或 { 结尾的行（如 "features": [）
      if (/".+"\s*:\s*[\[\{]$/.test(trimmed)) {
        arrayBracketLines.add(i);
      }
      
      // Check for array item
      if (trimmed.startsWith('"') && 
          (trimmed.endsWith('"') || trimmed.endsWith('",')) && 
          !trimmed.includes('":')) {
        // This looks like it could be an array item string
        // We'll check if it's a leaf node in an array that has changes
        const itemValue = trimmed.replace(/^"|"$/g, '').replace(/",$/g, '');
        // Check against diffMap to see if any array path contains this value
        Object.keys(diffMap.left).forEach(path => {
          if (path.includes('[') && diffMap.left[path].type === 'removed') {
            // Check if this item value matches what we expect
            try {
              const pathParts = path.split('[');
              const index = parseInt(pathParts[pathParts.length - 1].replace(']', ''));
              if (diffMap.left[path].value === itemValue) {
                arrayItemLines.set(i, 'removed');
              }
            } catch(e) {
              // Skip if parsing fails
            }
          }
        });
        
        Object.keys(diffMap.right).forEach(path => {
          if (path.includes('[') && diffMap.right[path].type === 'added') {
            // Check if this item value matches what we expect
            try {
              const pathParts = path.split('[');
              const index = parseInt(pathParts[pathParts.length - 1].replace(']', ''));
              if (diffMap.right[path].value === itemValue) {
                arrayItemLines.set(i, 'added');
              }
            } catch(e) {
              // Skip if parsing fails
            }
          }
        });
      }
    });

    return (
      <div className="font-mono text-sm whitespace-pre">
        {jsonLines.map((line, i) => {
          // 跳过对数组和对象开始/结束行的高亮
          if (arrayBracketLines.has(i)) {
            return (
              <div key={i} className="py-1 px-2">
                {line}
              </div>
            );
          }
          
          // Handle array items specially
          if (arrayItemLines.has(i)) {
            const diffType = arrayItemLines.get(i);
            
            if (diffType === 'added') {
              return (
                <div key={i} className="py-1 px-2" style={{
                  backgroundColor: isDarkMode ? '#2F855A' : '#C6F6D5',
                  color: isDarkMode ? '#FFFFFF' : '#22543D',
                  borderLeft: '4px solid #48BB78'
                }}>
                  {line}
                </div>
              );
            } else if (diffType === 'removed') {
              return (
                <div key={i} className="py-1 px-2" style={{
                  backgroundColor: isDarkMode ? '#9B2C2C' : '#FED7D7',
                  color: isDarkMode ? '#FFFFFF' : '#9B2C2C',
                  borderLeft: '4px solid #F56565'
                }}>
                  {line}
                </div>
              );
            }
          }
          
          // Find if this line corresponds to any diff path
          const matchingPath = Object.keys(pathMap).find(path => {
            return pathMap[path].lineNumber === i + 1 && relevantMap[path];
          });

          const diffType = matchingPath ? relevantMap[matchingPath].type : null;

          // Define styles based on diff type and dark mode
          let style: React.CSSProperties = {};
          let className = "py-1 px-2 ";

          // Special check for array items (strings in arrays) that might not be directly mapped
          const trimmedLine = line.trim();
          if (!diffType && 
              trimmedLine.startsWith('"') && 
              (trimmedLine.endsWith('",') || trimmedLine.endsWith('"')) && 
              !trimmedLine.includes('":')) {
            // This is likely an array item (string)
            // Extract the string value
            const stringValue = trimmedLine.replace(/^"|"$/g, '').replace(/",$/g, '');
            
            // Check if this string appears in any array paths in the diff
            const arrayPaths = Object.keys(relevantMap).filter(path => 
              path.includes('[') && 
              // Check if this value matches
              (JSON.stringify(relevantMap[path].value) === JSON.stringify(stringValue) ||
               relevantMap[path].value === stringValue)
            );
            
            if (arrayPaths.length > 0) {
              // We found an array item that should be highlighted
              const arrayPath = arrayPaths[0];
              const arrayDiffType = relevantMap[arrayPath].type;
              
              // Apply appropriate styles
              if (arrayDiffType === "added") {
                style = {
                  backgroundColor: isDarkMode ? '#2F855A' : '#C6F6D5',
                  color: isDarkMode ? '#FFFFFF' : '#22543D',
                  borderLeft: '4px solid #48BB78'
                };
              } else if (arrayDiffType === "removed") {
                style = {
                  backgroundColor: isDarkMode ? '#9B2C2C' : '#FED7D7',
                  color: isDarkMode ? '#FFFFFF' : '#9B2C2C',
                  borderLeft: '4px solid #F56565'
                };
              }
            }
          }

          if (diffType === "added") {
            style = {
              backgroundColor: isDarkMode ? '#2F855A' : '#C6F6D5',
              color: isDarkMode ? '#FFFFFF' : '#22543D',
              borderLeft: '4px solid #48BB78'
            };
          } else if (diffType === "removed") {
            style = {
              backgroundColor: isDarkMode ? '#9B2C2C' : '#FED7D7',
              color: isDarkMode ? '#FFFFFF' : '#9B2C2C',
              borderLeft: '4px solid #F56565'
            };
          } else if (diffType === "changed") {
            style = {
              backgroundColor: isDarkMode ? '#744210' : '#FEFCBF',
              color: isDarkMode ? '#FFFFFF' : '#744210',
              borderLeft: '4px solid #ECC94B'
            };
          }

          return (
            <div key={i} className={className} style={style}>
              {line}
            </div>
          );
        })}
      </div>
    );
  } catch (err) {
    return <div className="font-mono text-sm whitespace-pre" style={{ color: isDarkMode ? '#E2E8F0' : '#1A202C' }}>{jsonStr}</div>;
  }
};

const generateDiff = (left: any, right: any, path: string = "") => {
  // Handle null cases
  if (left === null && right === null) return null;
  if (left === null) {
    return {
      type: "added",
      path: path,
      value: right
    };
  }
  if (right === null) {
    return {
      type: "removed",
      path: path,
      value: left
    };
  }
  
  // Type mismatch
  if (typeof left !== typeof right) {
    return {
      type: "changed",
      path: path,
      oldValue: left,
      newValue: right
    };
  }

  // Handle primitives
  if (typeof left !== "object") {
    if (left === right) return null;
    return {
      type: "changed",
      path: path,
      oldValue: left,
      newValue: right
    };
  }

  // Handle arrays
  if (Array.isArray(left) && Array.isArray(right)) {
    const result: any[] = [];

    // For string arrays, we do a more precise comparison to detect additions and removals
    if (left.every(item => typeof item === 'string') && right.every(item => typeof item === 'string')) {
      // Create sets for faster lookups
      const leftSet = new Set(left);
      const rightSet = new Set(right);
      
      // Find items added in right
      right.forEach((item, i) => {
        const itemPath = path ? `${path}[${i}]` : `[${i}]`;
        if (!leftSet.has(item)) {
          result.push({
            type: "added",
            path: itemPath,
            value: item
          });
        }
      });
      
      // Find items removed from left
      left.forEach((item, i) => {
        const itemPath = path ? `${path}[${i}]` : `[${i}]`;
        if (!rightSet.has(item)) {
          result.push({
            type: "removed",
            path: itemPath,
            value: item
          });
        }
      });
      
      // If we found differences, return them
      if (result.length) {
        return result;
      }
    }

    // Default array comparison for non-string arrays or when no string differences found
    const maxLength = Math.max(left.length, right.length);

    for (let i = 0; i < maxLength; i++) {
      const itemPath = path ? `${path}[${i}]` : `[${i}]`;

      if (i >= left.length) {
        result.push({
          type: "added",
          path: itemPath,
          value: right[i]
        });
      } else if (i >= right.length) {
        result.push({
          type: "removed",
          path: itemPath,
          value: left[i]
        });
      } else {
        const diff = generateDiff(left[i], right[i], itemPath);
        if (diff) {
          if (Array.isArray(diff)) {
            result.push(...diff);
          } else {
            result.push(diff);
          }
        }
      }
    }

    return result.length ? result : null;
  }

  // Handle objects
  // ... existing code ...
};