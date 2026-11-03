#!/bin/bash
set -e

echo "===================================="
echo " SPEAXA Deployment Started"
echo "===================================="

# Safety check for macOS local machines to prevent accidental wipe of uncommitted local code
if [[ "$OSTYPE" == "darwin"* ]]; then
  if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  [SAFETY WARNING] You have uncommitted changes on your local Mac!"
    echo "   'deploy.sh' is designed for the remote production server (pulls from git & resets)."
    echo "   Please commit and push your work first before deploying:"
    echo "     git add -A"
    echo "     git commit -m 'save updates'"
    echo "     git push origin main"
    exit 1
  fi
fi

echo "📥 Resetting local modifications on server..."
git reset --hard HEAD
git clean -fd -e .env -e firebase-service-account.json -e public/uploads -e uploads

echo "⬇️ Pulling latest code from GitHub..."
git fetch origin main
git pull origin main

echo "📦 Installing node dependencies..."
npm install

echo "🗄️ Running production-safe database migrations..."
npm run migrate

echo "🔄 Restarting application process..."
if command -v pm2 &> /dev/null; then
  echo "   Using PM2 process manager..."
  pm2 restart speaxa || pm2 start server.js --name speaxa
  echo "💾 Saving PM2 process state..."
  pm2 save
elif [ -f "$HOME/.nvm/versions/node/$(node -v 2>/dev/null)/bin/pm2" ]; then
  PM2_PATH="$HOME/.nvm/versions/node/$(node -v 2>/dev/null)/bin/pm2"
  "$PM2_PATH" restart speaxa || "$PM2_PATH" start server.js --name speaxa
  "$PM2_PATH" save
else
  echo "⚠️  PM2 is not installed globally on this machine."
  echo "   • On your Production Server (Ubuntu/Linux), install PM2: sudo npm install -g pm2"
  echo "   • If running locally on your Mac, start the app with: npm start or npm run dev"
  echo "   • If you want PM2 locally on Mac: npm install -g pm2"
fi

echo "===================================="
echo " SPEAXA Deployment Complete & Live!"
echo "===================================="
