"use client";

import { useState, useEffect, useRef } from "react";
import jsonabc from "jsonabc";
import { diffLines } from "diff";

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
      // try {
      //   console.log("Setting demo data");
      //   setLeftJSON(demoLeftJSON);
      //   setRightJSON(demoRightJSON);
      // } catch (demoErr) {
      //   console.error("Failed to set demo data:", demoErr);
      //   throw demoErr;
      // }
      
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

      // Sort both JSON objects using jsonabc
      const sortedLeft = jsonabc.sortObj(leftObj);
      const sortedRight = jsonabc.sortObj(rightObj);

      // Convert sorted objects to formatted strings
      const leftStr = JSON.stringify(sortedLeft, null, 2);
      const rightStr = JSON.stringify(sortedRight, null, 2);

      // Generate diff using diff package
      const diff = diffLines(leftStr, rightStr);
      
      // Store the diff result and sorted strings for display
      setDiffResult({
        diff: diff,
        sortedLeft: leftStr,
        sortedRight: rightStr,
        originalLeft: leftJSON,
        originalRight: rightJSON
      });
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


  // Render diff using side-by-side comparison
  const renderDiffHTML = (diffResult: any[]) => {
    // Split diff result into left and right sides
    const leftLines: string[] = [];
    const rightLines: string[] = [];
    const leftStyles: React.CSSProperties[] = [];
    const rightStyles: React.CSSProperties[] = [];
    
    diffResult.forEach((part) => {
      const lines = part.value.split('\n');
      lines.forEach((line: string, lineIndex: number) => {
        if (lineIndex === lines.length - 1 && line === '') return; // Skip empty last line
        
        if (part.removed) {
          // Show in left side (removed)
          leftLines.push(line);
          leftStyles.push({
            backgroundColor: isDarkMode ? '#9B2C2C' : '#FED7D7',
            color: isDarkMode ? '#FFFFFF' : '#9B2C2C',
            borderLeft: '4px solid #F56565'
          });
          rightLines.push(''); // Empty line on right
          rightStyles.push({});
        } else if (part.added) {
          // Show in right side (added)
          leftLines.push(''); // Empty line on left
          leftStyles.push({});
          rightLines.push(line);
          rightStyles.push({
            backgroundColor: isDarkMode ? '#2F855A' : '#C6F6D5',
            color: isDarkMode ? '#FFFFFF' : '#22543D',
            borderLeft: '4px solid #48BB78'
          });
        } else {
          // Show in both sides (unchanged)
          leftLines.push(line);
          leftStyles.push({
            backgroundColor: 'transparent',
            color: isDarkMode ? '#E2E8F0' : '#1A202C'
          });
          rightLines.push(line);
          rightStyles.push({
            backgroundColor: 'transparent',
            color: isDarkMode ? '#E2E8F0' : '#1A202C'
          });
        }
      });
    });

    return (
      <div 
        className="diff-viewer-side-by-side"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0',
          fontFamily: 'monospace',
          fontSize: '14px',
          lineHeight: '1.4',
          backgroundColor: isDarkMode ? '#2D3748' : '#FFFFFF',
          color: isDarkMode ? '#E2E8F0' : '#1A202C',
          borderRadius: '8px',
          border: `1px solid ${isDarkMode ? '#4A5568' : '#E2E8F0'}`,
          overflow: 'auto',
          maxHeight: `${getTextareaHeight()}px`
        }}
      >
        {/* Left side (Original) */}
        <div className="diff-left">
          <div 
            className="diff-header"
            style={{
              backgroundColor: isDarkMode ? '#4A5568' : '#E2E8F0',
              color: isDarkMode ? '#E2E8F0' : '#4A5568',
              padding: '8px 12px',
              fontWeight: 'bold',
              borderBottom: `1px solid ${isDarkMode ? '#4A5568' : '#E2E8F0'}`
            }}
          >
            Original (Sorted)
          </div>
          <div className="diff-content">
            {leftLines.map((line, index) => (
              <div 
                key={index} 
                className="diff-line"
                style={{
                  padding: '2px 12px',
                  whiteSpace: 'pre-wrap',
                  wordWrap: 'break-word',
                  ...leftStyles[index]
                }}
              >
                {line}
              </div>
            ))}
          </div>
        </div>

        {/* Right side (Modified) */}
        <div className="diff-right">
          <div 
            className="diff-header"
            style={{
              backgroundColor: isDarkMode ? '#4A5568' : '#E2E8F0',
              color: isDarkMode ? '#E2E8F0' : '#4A5568',
              padding: '8px 12px',
              fontWeight: 'bold',
              borderBottom: `1px solid ${isDarkMode ? '#4A5568' : '#E2E8F0'}`
            }}
          >
            Modified (Sorted)
          </div>
          <div className="diff-content">
            {rightLines.map((line, index) => (
              <div 
                key={index} 
                className="diff-line"
                style={{
                  padding: '2px 12px',
                  whiteSpace: 'pre-wrap',
                  wordWrap: 'break-word',
                  ...rightStyles[index]
                }}
              >
                {line}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };


  // Render sorted JSON for display
  const renderSortedJSON = (jsonStr: string) => {
    if (!jsonStr) return <div style={{ color: '#718096' }}>Paste your JSON here...</div>;

      return (
      <div className="font-mono text-sm whitespace-pre" style={{ color: isDarkMode ? '#E2E8F0' : '#1A202C' }}>
        {jsonStr}
        </div>
      );
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
        

        {showDiff && diffResult ? (
          <div className="mb-3 flex-grow">
            <div className="mb-2">
              <h3 className="text-lg font-semibold" style={styles.header}>
                JSON Diff (Sorted & Compared)
              </h3>
              <p className="text-sm" style={styles.label}>
                Both JSON objects have been sorted alphabetically before comparison
              </p>
            </div>
            {renderDiffHTML(diffResult.diff)}
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3 flex-grow">
          <div className="flex flex-col">
            <label htmlFor="leftJSON" className="block text-sm font-medium mb-1" style={styles.label}>
              Left JSON
            </label>
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
          </div>
          <div className="flex flex-col">
            <label htmlFor="rightJSON" className="block text-sm font-medium mb-1" style={styles.label}>
              Right JSON
            </label>
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
            </div>
          </div>
        )}

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
            {/* <button
              onClick={showDebugInfo}
              className="px-4 py-1.5 rounded hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-colors"
              style={{
                backgroundColor: '#6B46C1',
                color: '#FFFFFF',
              }}
            >
              Debug
            </button> */}
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
