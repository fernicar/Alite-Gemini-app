#!/bin/bash

# Alite TypeScript Game - Quick Setup Script
# This script sets up the development environment and runs initial tests

echo "🚀 Alite TypeScript Game - Quick Setup"
echo "======================================"
echo ""

# Check Node.js version
echo "📋 Checking Node.js version..."
NODE_VERSION=$(node --version 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "✅ Node.js found: $NODE_VERSION"
    MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
    if [ $MAJOR_VERSION -lt 18 ]; then
        echo "❌ Node.js 18+ required. Current: $NODE_VERSION"
        echo "Please update Node.js from https://nodejs.org/"
        exit 1
    fi
else
    echo "❌ Node.js not found. Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ package.json not found. Please run this script from the alite-typescript directory."
    exit 1
fi

echo "📁 Project structure verified"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install
if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    echo "Try running: npm install --force"
    exit 1
fi

echo ""

# Run framework test
echo "🧪 Running framework verification..."
node run-tests.js
if [ $? -eq 0 ]; then
    echo "✅ Framework verification passed"
else
    echo "❌ Framework verification failed"
    echo "Check the error messages above for details"
    exit 1
fi

echo ""

# Type check
echo "🔍 Running TypeScript type check..."
npm run type-check
if [ $? -eq 0 ]; then
    echo "✅ TypeScript type check passed"
else
    echo "❌ TypeScript type check failed"
    exit 1
fi

echo ""

# Build project
echo "🔨 Building project..."
npm run build
if [ $? -eq 0 ]; then
    echo "✅ Project build successful"
else
    echo "❌ Project build failed"
    exit 1
fi

echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "✅ All tests passed"
echo "✅ Project built successfully"
echo ""
echo "🚀 To start development:"
echo "   npm run dev"
echo ""
echo "🌐 To view in browser:"
echo "   1. Run: npm run dev"
echo "   2. Open: http://localhost:3000"
echo ""
echo "📚 For more information, see TESTING_GUIDE.md"
echo ""

# Ask if user wants to start dev server
read -p "Would you like to start the development server now? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Starting development server..."
    npm run dev
fi