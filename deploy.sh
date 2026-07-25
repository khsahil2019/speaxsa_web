#!/bin/bash
set -e

echo "===================================="
echo " SPEAXA Deployment Started"
echo "===================================="

echo "📥 Resetting local modifications on server..."
git reset --hard HEAD
git clean -fd -e .env -e public/uploads -e uploads

echo "⬇️ Pulling latest code from GitHub..."
git fetch origin main
git pull origin main

echo "📦 Installing node dependencies (including pdfkit)..."
npm install

echo "🔄 Restarting PM2 process..."
pm2 restart speaxa || pm2 start server.js --name speaxa

echo "💾 Saving PM2 process state..."
pm2 save

echo "===================================="
echo " SPEAXA Deployment Complete & Live!"
echo "===================================="
