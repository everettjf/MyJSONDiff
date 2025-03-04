#!/bin/bash

# 安装依赖
echo "Installing dependencies..."
npm install
cd src && npm install
cd ..

# 启动 Tauri 开发服务器
echo "Starting Tauri development server..."
npm run tauri dev