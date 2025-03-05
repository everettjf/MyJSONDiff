"use client";

import { useState, useEffect, useRef } from "react";

// Define demo JSON examples
const demoLeftJSON = JSON.stringify({
  name: "Product A",
  price: 19.99,
  features: ["Durable", "Waterproof", "Lightweight"],
  specs: {
    dimensions: {
      height: 10,
      width: 15,
      depth: 5
    },
    weight: 2.5,
    color: "blue"
  },
  inStock: true,
  categories: ["electronics", "accessories"]
}, null, 2);

const demoRightJSON = JSON.stringify({
  name: "Product A",
  price: 24.99,
  features: ["Durable", "Waterproof", "Eco-friendly"],
  specs: {
    dimensions: {
      height: 10,
      width: 15,
      depth: 6
    },
    weight: 2.2,
    color: "green"
  },
  inStock: true,
  categories: ["electronics", "accessories", "outdoor"],
  discount: 10
}, null, 2);

export default function Home() {
  // 从localStorage获取初始主题状态
  const getInitialTheme = () => {
    // 注意：此函数在服务器端渲染时不能访问localStorage
    const savedTheme = localStorage.getItem('theme');
    console.log(`savedTheme: ${savedTheme}`);

    // 如果localStorage中有值，使用它
    if (savedTheme == 'dark') return true;
    if (savedTheme == 'light') return false;

    // 如果没有明确设置且系统无偏好，默认使用深色模式
    return true;
  };

  const [leftJSON, setLeftJSON] = useState("");
  const [rightJSON, setRightJSON] = useState("");
  const [diffResult, setDiffResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [windowHeight, setWindowHeight] = useState(0);
  const [showDiff, setShowDiff] = useState(false);
  // const [isDarkMode, setIsDarkMode] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(getInitialTheme());
  const leftEditorRef = useRef<HTMLDivElement>(null);
  const rightEditorRef = useRef<HTMLDivElement>(null);

  // Initialize with demo data and update window height on mount and resize
  useEffect(() => {
    // Set initial window height
    updateWindowHeight();

    // 确保深色模式状态同步到DOM
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Add resize event listener
    window.addEventListener('resize', updateWindowHeight);

    // Clean up event listener
    return () => window.removeEventListener('resize', updateWindowHeight);
  }, [isDarkMode]);

  // Toggle between light and dark mode
  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);

    // 只有当用户明确切换主题时，才存储到localStorage
    localStorage.setItem('theme', newMode ? 'dark' : 'light');

    // DOM类名的更新会通过useEffect处理
  };

  // Function to update window height
  const updateWindowHeight = () => {
    setWindowHeight(window.innerHeight);
  };

  // Calculate textarea height based on window size (subtract space for other elements)
  const getTextareaHeight = () => {
    // Reserve space for header, buttons, margins, etc.
    const reservedSpace = 220;
    return Math.max(300, windowHeight - reservedSpace);
  };

  const compareJSON = () => {
    try {
      // Parse JSON inputs
      const leftObj = leftJSON ? JSON.parse(leftJSON) : {};
      const rightObj = rightJSON ? JSON.parse(rightJSON) : {};

      // Generate diff
      const diff = generateDiff(leftObj, rightObj);
      setDiffResult(diff);
      setShowDiff(true);
      setError(null);
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
      setDiffResult(null);
      setShowDiff(false);
    }
  };

  // Function to clear both input fields and results
  const clearAll = () => {
    setLeftJSON("");
    setRightJSON("");
    setDiffResult(null);
    setError(null);
    setShowDiff(false);
  };

  // Function to reset to demo data
  const resetToDemo = () => {
    setLeftJSON(demoLeftJSON);
    setRightJSON(demoRightJSON);
    setDiffResult(null);
    setError(null);
    setShowDiff(false);
  };

  // Function to generate differences between two objects
  const generateDiff = (left: any, right: any, path: string = "") => {
    if (typeof left !== typeof right) {
      return {
        type: "changed",
        path: path,
        oldValue: left,
        newValue: right
      };
    }

    if (typeof left !== "object" || left === null || right === null) {
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

      // Check items in both arrays
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
    const allKeys = Array.from(new Set([...Object.keys(left), ...Object.keys(right)]));
    const result: any[] = [];

    for (const key of allKeys) {
      const keyPath = path ? `${path}.${key}` : key;

      if (!(key in left)) {
        result.push({
          type: "added",
          path: keyPath,
          value: right[key]
        });
      } else if (!(key in right)) {
        result.push({
          type: "removed",
          path: keyPath,
          value: left[key]
        });
      } else {
        const diff = generateDiff(left[key], right[key], keyPath);
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
  };

  // Map diff results to highlighted lines
  const getDiffMap = (diff: any) => {
    if (!diff) return { left: {}, right: {} };

    const flatDiffs = Array.isArray(diff) ? diff : [diff];
    const leftMap: Record<string, { type: string, value: any }> = {};
    const rightMap: Record<string, { type: string, value: any }> = {};

    flatDiffs.forEach(item => {
      const path = item.path;

      if (item.type === "added") {
        rightMap[path] = { type: "added", value: item.value };
      } else if (item.type === "removed") {
        leftMap[path] = { type: "removed", value: item.value };
      } else if (item.type === "changed") {
        leftMap[path] = { type: "changed", value: item.oldValue };
        rightMap[path] = { type: "changed", value: item.newValue };
      }
    });

    return { left: leftMap, right: rightMap };
  };

  // Function to find the paths in the JSON structure
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
      let currentLinePosition = 0;

      obj.forEach((item, index) => {
        const newPath = currentPath ? `${currentPath}[${index}]` : `[${index}]`;
        
        if (typeof item === 'object' && item !== null) {
          // For objects/arrays within array
          // Find the line that likely starts this object/array
          let lineIdx = -1;
          for (let i = currentLinePosition; i < jsonLines.length; i++) {
            if (jsonLines[i].trim().startsWith('{') || jsonLines[i].trim().startsWith('[')) {
              lineIdx = i;
              currentLinePosition = i + 1; // Move past this line
              break;
            }
          }
          
          result[newPath] = {
            lineNumber: lineIdx > -1 ? lineIdx + 1 : currentLinePosition + 1,
            text: typeof item === 'object' ? JSON.stringify(item, null, 2) : String(item)
          };
          
          getPathsInJSON(item, newPath, result);
        } else {
          // For primitives within array, using a more precise approach
          let lineIdx = -1;
          const itemStr = JSON.stringify(item);
          
          // Look for the exact item starting from the current position
          for (let i = currentLinePosition; i < jsonLines.length; i++) {
            const line = jsonLines[i].trim();
            // Match the line that contains exactly this item (with possible comma)
            if (line === itemStr || line === itemStr + ',') {
              lineIdx = i;
              currentLinePosition = i + 1; // Move past this line
              break;
            }
          }
          
          result[newPath] = {
            lineNumber: lineIdx > -1 ? lineIdx + 1 : currentLinePosition + 1,
            text: typeof item === 'object' ? JSON.stringify(item, null, 2) : String(item)
          };
        }
      });
    } else {
      // For objects
      let currentLinePosition = 0;
      
      Object.entries(obj).forEach(([key, value]) => {
        const newPath = currentPath ? `${currentPath}.${key}` : key;
        
        if (typeof value === 'object' && value !== null) {
          // For nested objects/arrays
          let lineIdx = -1;
          // Find the line with this key
          for (let i = currentLinePosition; i < jsonLines.length; i++) {
            if (jsonLines[i].includes(`"${key}"`)) {
              lineIdx = i;
              currentLinePosition = i + 1; // Move past this line
              break;
            }
          }
          
          result[newPath] = {
            lineNumber: lineIdx > -1 ? lineIdx + 1 : currentLinePosition + 1,
            text: typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)
          };
          
          getPathsInJSON(value, newPath, result);
        } else {
          // For primitive values
          let lineIdx = -1;
          for (let i = currentLinePosition; i < jsonLines.length; i++) {
            if (jsonLines[i].includes(`"${key}"`)) {
              lineIdx = i;
              currentLinePosition = i + 1; // Move past this line
              break;
            }
          }
          
          result[newPath] = {
            lineNumber: lineIdx > -1 ? lineIdx + 1 : currentLinePosition + 1,
            text: typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)
          };
        }
      });
    }

    return result;
  };

  // Render JSON with highlighting for differences
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
            
            // Find if this line corresponds to any diff path
            const matchingPath = Object.keys(pathMap).find(path => {
              return pathMap[path].lineNumber === i + 1 && relevantMap[path];
            });

            const diffType = matchingPath ? relevantMap[matchingPath].type : null;

            // Define styles based on diff type and dark mode
            let style: React.CSSProperties = {};
            let className = "py-1 px-2 ";

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

  // Define styles based on dark mode
  const styles = {
    container: {
      backgroundColor: isDarkMode ? '#1A202C' : '#F7FAFC',
      color: isDarkMode ? '#E2E8F0' : '#1A202C',
      minHeight: '100vh',
      transition: 'background-color 0.2s, color 0.2s',
    },
    header: {
      color: isDarkMode ? '#FFFFFF' : '#1A202C',
    },
    label: {
      color: isDarkMode ? '#CBD5E0' : '#4A5568',
    },
    editor: {
      backgroundColor: isDarkMode ? '#2D3748' : '#FFFFFF',
      color: isDarkMode ? '#E2E8F0' : '#1A202C',
      border: `1px solid ${isDarkMode ? '#4A5568' : '#E2E8F0'}`,
    },
    buttonPrimary: {
      backgroundColor: '#3182CE',
      color: '#FFFFFF',
    },
    buttonSecondary: {
      backgroundColor: isDarkMode ? '#4A5568' : '#E2E8F0',
      color: isDarkMode ? '#E2E8F0' : '#4A5568',
    },
    buttonSuccess: {
      backgroundColor: '#38A169',
      color: '#FFFFFF',
    },
    buttonDanger: {
      backgroundColor: '#E53E3E',
      color: '#FFFFFF',
    },
    error: {
      backgroundColor: isDarkMode ? 'rgba(229, 62, 62, 0.2)' : '#FED7D7',
      color: isDarkMode ? '#FC8181' : '#9B2C2C',
      borderLeft: '4px solid #E53E3E',
    }
  };

  return (
    <div style={styles.container}>
      <div className="container mx-auto p-2 h-screen flex flex-col max-w-full">
        

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3 flex-grow">
          <div className="flex flex-col">
            <label htmlFor="leftJSON" className="block text-sm font-medium mb-1" style={styles.label}>
              Left JSON
            </label>
            {showDiff ? (
              <div
                ref={leftEditorRef}
                className="w-full flex-grow p-2 rounded overflow-auto"
                style={{ ...styles.editor, height: `${getTextareaHeight()}px` }}
              >
                {renderHighlightedJSON(leftJSON, true)}
              </div>
            ) : (
              <textarea
                id="leftJSON"
                className="w-full flex-grow p-2 rounded font-mono text-sm"
                style={{ ...styles.editor, height: `${getTextareaHeight()}px` }}
                placeholder="Paste your JSON here..."
                value={leftJSON}
                onChange={(e) => setLeftJSON(e.target.value)}
              />
            )}
          </div>
          <div className="flex flex-col">
            <label htmlFor="rightJSON" className="block text-sm font-medium mb-1" style={styles.label}>
              Right JSON
            </label>
            {showDiff ? (
              <div
                ref={rightEditorRef}
                className="w-full flex-grow p-2 rounded overflow-auto"
                style={{ ...styles.editor, height: `${getTextareaHeight()}px` }}
              >
                {renderHighlightedJSON(rightJSON, false)}
              </div>
            ) : (
              <textarea
                id="rightJSON"
                className="w-full flex-grow p-2 rounded font-mono text-sm"
                style={{ ...styles.editor, height: `${getTextareaHeight()}px` }}
                placeholder="Paste your JSON here..."
                value={rightJSON}
                onChange={(e) => setRightJSON(e.target.value)}
              />
            )}
          </div>
        </div>

        <div className="flex justify-between items-center mb-3">
          <div className="w-10"></div>
          <div className="flex gap-3 flex-wrap justify-center">
            <button
              onClick={compareJSON}
              className="px-4 py-1.5 rounded hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-colors"
              style={styles.buttonPrimary}
            >
              Compare JSON
            </button>
            <button
              onClick={() => setShowDiff(false)}
              className="px-4 py-1.5 rounded hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-colors"
              style={{
                ...styles.buttonSecondary,
                backgroundColor: showDiff ? '#D69E2E' : isDarkMode ? '#4A5568' : '#E2E8F0',
                color: showDiff ? 'white' : (isDarkMode ? '#E2E8F0' : '#4A5568'),
                opacity: showDiff ? 1 : 0.5,
                cursor: showDiff ? 'pointer' : 'not-allowed'
              }}
              disabled={!showDiff}
            >
              Edit Mode
            </button>
            <button
              onClick={clearAll}
              className="px-4 py-1.5 rounded hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-colors"
              style={styles.buttonDanger}
            >
              Clear All
            </button>
          </div>
          <div className="flex gap-3 items-center">
            <button
              onClick={resetToDemo}
              className="px-4 py-1.5 rounded hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-colors"
              style={styles.buttonSuccess}
            >
              Demo
            </button>
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-full hover:opacity-80"
              style={{ backgroundColor: isDarkMode ? '#4A5568' : '#E2E8F0' }}
              aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDarkMode ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="#FEFCDE" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="#4A5568" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4" style={styles.error}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
