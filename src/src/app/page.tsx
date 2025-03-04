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
  const [leftJSON, setLeftJSON] = useState("");
  const [rightJSON, setRightJSON] = useState("");
  const [diffResult, setDiffResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [windowHeight, setWindowHeight] = useState(0);
  const [showDiff, setShowDiff] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const leftEditorRef = useRef<HTMLDivElement>(null);
  const rightEditorRef = useRef<HTMLDivElement>(null);
  
  // Initialize with demo data and update window height on mount and resize
  useEffect(() => {
    // Set demo data
    setLeftJSON(demoLeftJSON);
    setRightJSON(demoRightJSON);
    
    // Set initial window height
    updateWindowHeight();
    
    // Detect system preference for dark mode
    if (typeof window !== 'undefined') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkMode(prefersDark);
      
      // Apply dark mode class to html element
      if (prefersDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    
    // Add resize event listener
    window.addEventListener('resize', updateWindowHeight);
    
    // Clean up event listener
    return () => window.removeEventListener('resize', updateWindowHeight);
  }, []);
  
  // Toggle between light and dark mode
  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    
    // Apply dark mode class to html element for Tailwind
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Function to update window height
  const updateWindowHeight = () => {
    setWindowHeight(window.innerHeight);
  };
  
  // Calculate textarea height based on window size (subtract space for other elements)
  const getTextareaHeight = () => {
    // Reserve space for header, buttons, margins, etc.
    const reservedSpace = 250;
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
      obj.forEach((item, index) => {
        const newPath = currentPath ? `${currentPath}[${index}]` : `[${index}]`;
        if (typeof item === 'object' && item !== null) {
          // For objects/arrays within array
          result[newPath] = { 
            lineNumber: jsonLines.findIndex(line => line.trim().startsWith(`{`) || line.trim().startsWith(`[`)) + 1,
            text: typeof item === 'object' ? JSON.stringify(item, null, 2) : String(item)
          };
          getPathsInJSON(item, newPath, result);
        } else {
          // For primitives within array
          const lineIdx = jsonLines.findIndex(line => line.includes(`${item}`));
          result[newPath] = { 
            lineNumber: lineIdx > -1 ? lineIdx + 1 : 1, 
            text: typeof item === 'object' ? JSON.stringify(item, null, 2) : String(item)
          };
        }
      });
    } else {
      // For objects
      Object.entries(obj).forEach(([key, value]) => {
        const newPath = currentPath ? `${currentPath}.${key}` : key;
        if (typeof value === 'object' && value !== null) {
          // For nested objects/arrays
          const lineIdx = jsonLines.findIndex(line => line.includes(`"${key}"`));
          result[newPath] = { 
            lineNumber: lineIdx > -1 ? lineIdx + 1 : 1,
            text: typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)
          };
          getPathsInJSON(value, newPath, result);
        } else {
          // For primitive values
          const lineIdx = jsonLines.findIndex(line => line.includes(`"${key}"`));
          result[newPath] = { 
            lineNumber: lineIdx > -1 ? lineIdx + 1 : 1,
            text: typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)
          };
        }
      });
    }
    
    return result;
  };

  // Render JSON with highlighting for differences
  const renderHighlightedJSON = (jsonStr: string, isLeft: boolean) => {
    if (!jsonStr) return <div className="text-gray-400">Paste your JSON here...</div>;
    
    try {
      const jsonObj = JSON.parse(jsonStr);
      const diffMap = diffResult ? getDiffMap(diffResult) : { left: {}, right: {} };
      const relevantMap = isLeft ? diffMap.left : diffMap.right;
      
      // Get paths and line numbers in the JSON
      const pathMap = getPathsInJSON(jsonObj);
      
      const jsonLines = jsonStr.split('\n');
      
      return (
        <div className="font-mono text-sm whitespace-pre">
          {jsonLines.map((line, i) => {
            // Find if this line corresponds to any diff path
            const matchingPath = Object.keys(pathMap).find(path => {
              return pathMap[path].lineNumber === i + 1 && relevantMap[path];
            });
            
            const diffType = matchingPath ? relevantMap[matchingPath].type : null;
            
            let bgClass = "";
            if (diffType === "added") {
              bgClass = "bg-green-300 dark:bg-green-800 border-l-4 border-green-500";
            } else if (diffType === "removed") {
              bgClass = "bg-red-300 dark:bg-red-800 border-l-4 border-red-500";
            } else if (diffType === "changed") {
              bgClass = "bg-yellow-300 dark:bg-yellow-800 border-l-4 border-yellow-500";
            }
            
            return (
              <div key={i} className={`py-1 px-2 ${bgClass}`}>
                {line}
              </div>
            );
          })}
        </div>
      );
    } catch (err) {
      return <div className="font-mono text-sm whitespace-pre">{jsonStr}</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200">
      <div className="container mx-auto p-4 h-screen flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-white">JSON Diff Tool</h1>
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {darkMode ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 flex-grow">
          <div className="flex flex-col">
            <label htmlFor="leftJSON" className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Left JSON
            </label>
            {showDiff ? (
              <div 
                ref={leftEditorRef}
                className="w-full flex-grow p-3 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 overflow-auto text-gray-900 dark:text-gray-100" 
                style={{ height: `${getTextareaHeight()}px` }}
              >
                {renderHighlightedJSON(leftJSON, true)}
              </div>
            ) : (
              <textarea
                id="leftJSON"
                className="w-full flex-grow p-3 border border-gray-300 dark:border-gray-600 rounded font-mono text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                style={{ height: `${getTextareaHeight()}px` }}
                placeholder="Paste your JSON here..."
                value={leftJSON}
                onChange={(e) => setLeftJSON(e.target.value)}
              />
            )}
          </div>
          <div className="flex flex-col">
            <label htmlFor="rightJSON" className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Right JSON
            </label>
            {showDiff ? (
              <div 
                ref={rightEditorRef}
                className="w-full flex-grow p-3 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 overflow-auto text-gray-900 dark:text-gray-100" 
                style={{ height: `${getTextareaHeight()}px` }}
              >
                {renderHighlightedJSON(rightJSON, false)}
              </div>
            ) : (
              <textarea
                id="rightJSON"
                className="w-full flex-grow p-3 border border-gray-300 dark:border-gray-600 rounded font-mono text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                style={{ height: `${getTextareaHeight()}px` }}
                placeholder="Paste your JSON here..."
                value={rightJSON}
                onChange={(e) => setRightJSON(e.target.value)}
              />
            )}
          </div>
        </div>

        <div className="flex justify-center gap-4 mb-4 flex-wrap">
          <button
            onClick={compareJSON}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors"
          >
            Compare JSON
          </button>
          <button
            onClick={() => setShowDiff(false)}
            className={`px-6 py-2 ${showDiff ? 'bg-yellow-600 text-white' : 'bg-gray-300 text-gray-700 dark:bg-gray-700 dark:text-gray-300'} rounded hover:bg-yellow-700 dark:hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-opacity-50 transition-colors`}
            disabled={!showDiff}
          >
            Edit Mode
          </button>
          <button
            onClick={clearAll}
            className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 transition-colors"
          >
            Clear All
          </button>
          <button
            onClick={resetToDemo}
            className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 transition-colors"
          >
            Load Demo Data
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
