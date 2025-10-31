#!/bin/bash

echo "🔍 Running Diagnostic Check..."
echo "================================"
echo ""

# Check current directory
echo "📍 Current directory:"
pwd
echo ""

# Check for AI Code Agent files
echo "📁 Checking for AI Code Agent files:"
echo ""

files=("src" "tests" "docs" "package.json" "README.md" ".gitignore")
found=0
total=0

for file in "${files[@]}"; do
  total=$((total + 1))
  if [ -e "$file" ]; then
    echo "✅ $file - FOUND"
    found=$((found + 1))
  else
    echo "❌ $file - MISSING"
  fi
done

echo ""
echo "📊 Summary: $found/$total required files found"

if [ $found -eq $total ]; then
  echo "✅ PERFECT! You're in the correct directory!"
else
  echo "⚠️  You may be in the wrong directory."
  echo "   Check if there's an 'ai-code-agent' subfolder."
fi

echo ""

# Check git status
if [ -d ".git" ]; then
  echo "✅ Git repository detected"
  echo ""
  echo "📋 Git status:"
  git status --porcelain
  echo ""
  echo "🔗 Remote repository:"
  git remote -v
else
  echo "❌ Not a git repository"
fi

echo ""
echo "================================"
echo "🔧 Next Steps:"
echo ""
echo "1. If all files found AND you're in correct directory:"
echo "   → git push -u origin main"
echo ""
echo "2. If files are missing:"
echo "   → Navigate to your AI Code Agent project folder"
echo ""
echo "3. To fix GitHub secret scanning:"
echo "   → See FIX_GITHUB_SECRET.md for detailed instructions"