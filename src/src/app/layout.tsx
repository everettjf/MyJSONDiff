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
        <script 
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // 检查本地存储的主题偏好
                  var savedTheme = localStorage.getItem('theme');
                  
                  // 如果有明确的存储值，使用它
                  if (savedTheme === 'dark') {
                    document.documentElement.classList.add('dark');
                    return;
                  }
                  
                  if (savedTheme === 'light') {
                    document.documentElement.classList.remove('dark');
                    return;
                  }
                  
                  // 如果没有存储值，检查系统偏好
                  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (prefersDark) {
                    document.documentElement.classList.add('dark');
                    return;
                  }
                  
                  // 如果没有明确设置且系统无偏好，默认使用深色模式
                  document.documentElement.classList.add('dark');
                  
                  // 注意：这里不设置默认的localStorage值，只有用户明确切换时才会设置
                } catch (e) {
                  // 如果出现异常（如隐私模式下无法访问localStorage），默认使用深色模式
                  document.documentElement.classList.add('dark');
                  console.log('Could not access localStorage', e);
                }
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100`}
      >
        {children}
      </body>
    </html>
  );
}
