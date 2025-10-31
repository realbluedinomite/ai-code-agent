#!/bin/bash

echo "🚀 AI Code Agent - Fix Repository Location"
echo "==========================================="

echo ""
echo "📍 Current location:"
pwd

echo ""
echo "📂 Contents of current directory:"
ls -la

echo ""
echo "🌿 Checking if this is a git repository..."
if [ -d ".git" ]; then
    echo "✅ This is a git repository"
    
    echo ""
    echo "📝 Files in this repository:"
    git ls-files
    
    echo ""
    echo "📝 Recent commits:"
    git log --oneline -3
    
else
    echo "❌ This is NOT a git repository"
    echo ""
    echo "💡 If you want to navigate to your AI Code Agent project:"
    echo "   cd /path/to/your/ai-code-agent/project"
    echo ""
    echo "💡 Or find your project directories:"
    echo "   find . -name 'package.json' -type f"
    echo "   find . -name 'src' -type d"
fi

echo ""
echo "🔧 If you need to navigate to your AI Code Agent project:"
echo "   # Example: if your project is in Downloads/ai-code-agent"
echo "   cd ~/Downloads/ai-code-agent"
echo "   # Or full path:"
echo "   cd C:/Users/19152/Downloads/ai-code-agent"

echo ""
echo "🗑️ If you pushed the wrong files and want to start fresh:"
echo "   git reset --soft HEAD~1  # Remove last commit but keep files"
echo "   git remote remove origin # Remove remote"
echo "   cd /path/to/correct/project/directory"
echo "   git init"
echo "   git add ."
echo "   git commit -m 'Initial commit: AI Code Agent'"
echo "   git remote add origin https://github.com/realbluedinomite/ai-code-agent.git"
echo "   git push -u origin main"