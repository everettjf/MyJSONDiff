import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "JSON Diff Tool",
  description: "A beautiful tool to compare and visualize differences between JSON objects",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100`}
      >
        <div id="splash-screen" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }}>
          <div id="splash-error" style={{ 
            color: 'red', 
            margin: '20px', 
            maxWidth: '80%',
            textAlign: 'center',
            display: 'none'
          }}></div>
          <script dangerouslySetInnerHTML={{ __html: `
            console.log('Splash screen initialization');
            
            // Debug information collector
            function getDebugInfo() {
              var info = {
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                vendor: navigator.vendor,
                screenSize: window.screen.width + 'x' + window.screen.height,
                windowSize: window.innerWidth + 'x' + window.innerHeight,
                hasTauri: typeof window.__TAURI__ !== 'undefined',
                hasDocument: typeof document !== 'undefined',
                hasWindow: typeof window !== 'undefined',
                documentReadyState: document.readyState
              };
              return JSON.stringify(info, null, 2);
            }
            
            // Display error on splash screen
            function showSplashError(message, details) {
              console.error('Showing splash error:', message);
              const errorElem = document.getElementById('splash-error');
              if (errorElem) {
                errorElem.innerHTML = '<strong>Error:</strong> ' + message + 
                  '<br/><br/><details><summary>Technical Details</summary><pre>' + 
                  details + '</pre></details>';
                errorElem.style.display = 'block';
                
                const loadingElem = document.querySelector('#splash-screen p');
                if (loadingElem) {
                  loadingElem.textContent = 'Failed to load application';
                  loadingElem.style.color = 'red';
                }
              }
            }
            
            // Global error handler
            window.onerror = function(message, source, lineno, colno, error) {
              console.error('Global error caught:', message, source, lineno, colno);
              const errorDetails = 'Source: ' + (source || 'unknown') + 
                '\\nLine: ' + (lineno || 'unknown') + 
                '\\nColumn: ' + (colno || 'unknown') + 
                '\\nStack: ' + (error && error.stack ? error.stack : 'unavailable') +
                '\\n\\nDebug Info:\\n' + getDebugInfo();
              
              showSplashError(message, errorDetails);
              return false;
            };
            
            // Promise rejection handler
            window.addEventListener('unhandledrejection', function(event) {
              console.error('Unhandled promise rejection:', event.reason);
              const reason = event.reason || {};
              const message = reason.message || 'Unknown promise error';
              const stack = reason.stack || 'No stack trace available';
              
              showSplashError('Promise error: ' + message, 
                'Stack: ' + stack + '\\n\\nDebug Info:\\n' + getDebugInfo());
            });
            
            // Check if document is ready
            if (document.readyState === 'complete') {
              console.log('Document already loaded at script execution time');
            } else {
              console.log('Document not ready yet, current state:', document.readyState);
              document.addEventListener('DOMContentLoaded', function() {
                console.log('DOMContentLoaded fired');
              });
              window.addEventListener('load', function() {
                console.log('Window load event fired');
              });
            }
            
            // Log initialization completion
            console.log('Splash error handlers initialized');
          `}}></script>
        </div>
        {children}
      </body>
    </html>
  );
}
