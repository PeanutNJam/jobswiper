#!/bin/bash
set -e

# Make setup script executable
chmod +x setup.sh

# Frontend
echo "📱 Installing frontend dependencies..."
cd frontend
npm install
cd ..

# Backend  
echo "🔧 Installing backend dependencies..."
cd backend
go mod download
cd ..

echo "✅ All dependencies installed!"
