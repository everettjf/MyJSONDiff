"use client";

import { useState, useEffect, useRef } from "react";

// 声明Tauri全局变量
declare global {
  interface Window {
    __TAURI__?: any;
  }
}

// 全局错误处理
if (typeof window !== 'undefined') {
  console.log("初始化全局错误处理");
  
  // 捕获未处理的Promise错误
  window.addEventListener('unhandledrejection', (event) => {
    console.error('未处理的Promise错误:', event.reason);
    
    // 尝试更新splash screen
    try {
      const splashScreen = document.getElementById('splash-screen');
      if (splashScreen && splashScreen.style.display !== 'none') {
        const loadingText = splashScreen.querySelector('p');
        if (loadingText) {
          loadingText.textContent = '加载失败: ' + (event.reason?.message || event.reason || '未知错误');
          loadingText.style.color = 'red';
        }

        const errorDiv = document.getElementById('splash-error');
        if (errorDiv) {
          errorDiv.textContent = '详细错误: ' + JSON.stringify(event.reason);
          errorDiv.style.display = 'block';
        }
      }
    } catch (err) {
      console.error('显示错误信息时发生异常:', err);
    }
  });
}

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
  
  const [leftJSON, setLeftJSON] = useState("");
  const [rightJSON, setRightJSON] = useState("");
  const [diffResult, setDiffResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [windowHeight, setWindowHeight] = useState(0);
  const [showDiff, setShowDiff] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [appError, setAppError] = useState<string | null>(null);
  const leftEditorRef = useRef<HTMLDivElement>(null);
  const rightEditorRef = useRef<HTMLDivElement>(null);

  // Initialize with demo data and update window height on mount and resize
  useEffect(() => {
    try {
      console.log("Application initialization starting...");
      
      // Check if running in Tauri environment
      const isTauri = !!window.__TAURI__;
      console.log("Running in Tauri environment:", isTauri);
      
      // Log environment information
      console.log("Environment details:", {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        vendor: navigator.vendor,
        screenSize: `${window.screen.width}x${window.screen.height}`,
        windowSize: `${window.innerWidth}x${window.innerHeight}`,
        isDarkMode,
        documentReadyState: document.readyState
      });
      
      // Set initial window height
      updateWindowHeight();

      // Ensure dark mode is synced with DOM
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }

      // Initialize demo data with explicit error handling
      try {
        console.log("Setting demo data");
        setLeftJSON(demoLeftJSON);
        setRightJSON(demoRightJSON);
      } catch (demoErr) {
        console.error("Failed to set demo data:", demoErr);
        throw demoErr;
      }
      
      console.log("Initialization complete, now hiding splash screen");
      
      // Add a small delay before hiding splash screen to ensure all components are ready
      setTimeout(() => {
        // Hide loading screen
        const splashScreen = document.getElementById('splash-screen');
        if (splashScreen) {
          splashScreen.style.display = 'none';
          console.log("Splash screen hidden");
        } else {
          console.warn("Splash screen element not found");
        }
      }, 500);

      // Add resize event listener
      window.addEventListener('resize', updateWindowHeight);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("Application initialization error:", errorMessage, err);
      
      // Display error and ensure splash screen continues to show loading information
      setAppError(errorMessage);
      const splashScreen = document.getElementById('splash-screen');
      if (splashScreen) {
        splashScreen.style.display = 'flex'; // Ensure it's visible
        const loadingText = splashScreen.querySelector('p');
        if (loadingText) {
          loadingText.textContent = `Error: ${errorMessage}`;
          loadingText.style.color = 'red';
        }
        
        // Also update the error details element
        const errorDetails = document.getElementById('splash-error');
        if (errorDetails) {
          errorDetails.textContent = JSON.stringify({
            error: errorMessage,
            stack: err instanceof Error ? err.stack : 'No stack available',
            timestamp: new Date().toISOString()
          }, null, 2);
          errorDetails.style.display = 'block';
        }
      }
    }

    // Clean up event listener
    return () => {
      try {
        window.removeEventListener('resize', updateWindowHeight);
      } catch (err) {
        console.error("清理事件监听错误:", err);
      }
    };
  }, [isDarkMode]);

  // Toggle between light and dark mode
  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
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

  // Debug information
  const showDebugInfo = () => {
    try {
      const debugInfo = {
        environmentInfo: {
          isTauri: !!window.__TAURI__,
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          screenSize: `${window.screen.width}x${window.screen.height}`,
          windowSize: `${window.innerWidth}x${window.innerHeight}`,
          isDarkMode,
        },
        appState: {
          hasError: !!error || !!appError,
          errorMessage: error || appError,
          showDiff,
          leftJSONLength: leftJSON?.length || 0,
          rightJSONLength: rightJSON?.length || 0,
        }
      };
      
      setAppError(`Debug Information: ${JSON.stringify(debugInfo, null, 2)}`);
    } catch (err) {
      setAppError(`Error generating debug info: ${err instanceof Error ? err.message : String(err)}`);
    }
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

      // Special handling for string arrays - detect additions and removals of individual items
      if (left.length > 0 && right.length > 0 && 
          left.every(item => typeof item === 'string') && 
          right.every(item => typeof item === 'string')) {
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

      // Standard array comparison for non-string arrays or when no string differences found
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
    const allKeys = Array.from(new Set([...Object.keys(left), ...Object.keys(right)])).sort();
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
          // For primitives within array
          for (let i = currentLinePosition; i < jsonLines.length; i++) {
            const trimmedLine = jsonLines[i].trim();
            if (trimmedLine === valueStr || trimmedLine === valueStr + ',') {
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

  // Render JSON with highlighting for differences
  const renderHighlightedJSON = (jsonStr: string, isLeft: boolean) => {
    if (!jsonStr) return <div style={{ color: '#718096' }}>Paste your JSON here...</div>;

    try {
      const jsonObj = JSON.parse(jsonStr);
      const diffMap = diffResult ? getDiffMap(diffResult) : { left: {}, right: {} };
      const relevantMap = isLeft ? diffMap.left : diffMap.right;

      // Get paths and line numbers in the JSON
      const pathMap = getPathsInJSON(jsonObj);

      const jsonLines = jsonStr.split('\n');

      // Track bracket/brace structure to properly identify structural elements
      const structuralLines = new Set<number>();
      
      // Track array items for highlighting
      const arrayItemLines = new Map<number, { type: string, value: any }>();
      
      jsonLines.forEach((line, i) => {
        const trimmed = line.trim();
        
        // Check for array/object open or close brackets
        if (trimmed === '[' || trimmed === '{' || 
            trimmed === ']' || trimmed === '}' || 
            trimmed === '],' || trimmed === '},') {
          structuralLines.add(i);
        }
        
        // Check for array items (strings in arrays)
        if (trimmed.startsWith('"') && 
            (trimmed.endsWith('",') || trimmed.endsWith('"')) && 
            !trimmed.includes('":')) {
          // Extract the string value
          const stringValue = trimmed.replace(/^"|"$/g, '').replace(/",$/g, '');
          
          // Check if this string appears in any array paths in the diff
          Object.entries(relevantMap).forEach(([path, diff]) => {
            if (path.includes('[') && 
                (diff.value === stringValue || 
                 (typeof diff.value === 'string' && diff.value.trim() === stringValue.trim()))) {
              arrayItemLines.set(i, { type: diff.type, value: stringValue });
            }
          });
        }
      });

      return (
        <div className="font-mono text-sm whitespace-pre">
          {jsonLines.map((line, i) => {
            // Handle array items first
            if (arrayItemLines.has(i)) {
              const { type } = arrayItemLines.get(i)!;
              let style: React.CSSProperties = {};
              
              if (type === "added") {
                style = {
                  backgroundColor: isDarkMode ? '#2F855A' : '#C6F6D5',
                  color: isDarkMode ? '#FFFFFF' : '#22543D',
                  borderLeft: '4px solid #48BB78'
                };
              } else if (type === "removed") {
                style = {
                  backgroundColor: isDarkMode ? '#9B2C2C' : '#FED7D7',
                  color: isDarkMode ? '#FFFFFF' : '#9B2C2C',
                  borderLeft: '4px solid #F56565'
                };
              }
              
              return (
                <div key={i} className="py-1 px-2" style={style}>
                  {line}
                </div>
              );
            }

            // Handle structural elements
            if (structuralLines.has(i)) {
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
      {appError && (
        <div className="p-4 m-4 rounded" style={{
          backgroundColor: isDarkMode ? 'rgba(229, 62, 62, 0.2)' : '#FED7D7',
          color: isDarkMode ? '#FC8181' : '#9B2C2C',
          border: '1px solid #E53E3E',
        }}>
          <h2 className="text-lg font-bold mb-2">应用错误</h2>
          <p>{appError}</p>
        </div>
      )}
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
                onChange={(e) => {
                  // Replace smart quotes with straight quotes
                  const normalizedText = e.target.value
                    .replace(/[\u201C\u201D]/g, '"') // Replace double smart quotes
                    .replace(/[\u2018\u2019]/g, "'"); // Replace single smart quotes
                  setLeftJSON(normalizedText);
                }}
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="off"
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
                onChange={(e) => {
                  // Replace smart quotes with straight quotes
                  const normalizedText = e.target.value
                    .replace(/[\u201C\u201D]/g, '"') // Replace double smart quotes
                    .replace(/[\u2018\u2019]/g, "'"); // Replace single smart quotes
                  setRightJSON(normalizedText);
                }}
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="off"
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
              onClick={showDebugInfo}
              className="px-4 py-1.5 rounded hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-colors"
              style={{
                backgroundColor: '#6B46C1',
                color: '#FFFFFF',
              }}
            >
              Debug
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
