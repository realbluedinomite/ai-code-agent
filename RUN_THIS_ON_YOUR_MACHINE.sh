#!/bin/bash

# 🚀 AI Code Agent - GitHub Repository Setup
# Run this script on your LOCAL MACHINE where you have full control

echo "🚀 Starting GitHub repository setup..."

# Configuration
REPO_NAME="ai-code-agent"
USERNAME="YOUR_GITHUB_USERNAME_HERE"
TOKEN="YOUR_GITHUB_TOKEN_HERE"

# Check if username and token are set
if [ "$USERNAME" = "YOUR_GITHUB_USERNAME_HERE" ] || [ "$TOKEN" = "YOUR_GITHUB_TOKEN_HERE" ]; then
    echo "❌ Please update the USERNAME and TOKEN variables in this script first!"
    echo "   1. Replace YOUR_GITHUB_USERNAME_HERE with your actual username"
    echo "   2. Replace YOUR_GITHUB_TOKEN_HERE with your personal access token"
    exit 1
fi

echo "📝 Creating GitHub repository '$REPO_NAME'..."
# Create repository on GitHub using API
curl_response=$(curl -s -X POST \
  -H "Authorization: token $TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/user/repos \
  -d "{
    \"name\": \"$REPO_NAME\",
    \"description\": \"AI Code Agent System - Intelligent code generation and analysis with TypeScript, PostgreSQL, and Groq AI\",
    \"private\": false,
    \"has_issues\": true,
    \"has_projects\": true,
    \"has_wiki\": true
  }")

# Check if repository was created successfully
if echo "$curl_response" | grep -q '"id"'; then
    echo "✅ Repository created successfully on GitHub!"
elif echo "$curl_response" | grep -q '"message".*"already exists"'; then
    echo "ℹ️ Repository already exists, continuing with push..."
else
    echo "❌ Failed to create repository. Response:"
    echo "$curl_response"
    exit 1
fi

echo ""
echo "🔧 Setting up local git repository..."

# Initialize git if not already done
if [ ! -d ".git" ]; then
    git init
    echo "✅ Git repository initialized"
else
    echo "ℹ️ Git repository already initialized"
fi

# Configure git (replace with your actual email)
echo "📧 Configuring git user..."
git config user.name "$USERNAME"
git config user.email "$USERNAME@users.noreply.github.com"

# Add all files
echo "📁 Adding files to git..."
git add .

# Check if there are changes to commit
if git diff --cached --quiet; then
    echo "ℹ️ No changes to commit"
else
    # Commit with comprehensive message
    echo "💾 Committing changes..."
    git commit -m "Initial commit: Complete AI Code Agent System

Features:
- 6 Core Components (Input Parser, Project Analyzer, Planner, Implementer, Reviewer, Orchestrator)
- Groq AI Integration with TypeScript
- PostgreSQL Database with full schema
- Comprehensive Testing Framework
- Docker Support
- Real-time CLI Interface
- Session Management & Error Handling
- Plugin Architecture
- Complete Documentation

Security: .env file excluded (contains sensitive API keys)
Setup: Follow LOCAL_SETUP_GUIDE.md for installation instructions"
    echo "✅ Changes committed"
fi

# Add remote with credentials
echo "🔗 Adding GitHub remote..."
# Remove remote if it already exists
git remote remove origin 2>/dev/null || true

# Add remote with embedded credentials
git remote add origin "https://$USERNAME:$TOKEN@github.com/$USERNAME/$REPO_NAME.git"

# Push to GitHub
echo "📤 Pushing to GitHub..."
git branch -M main

# Try to push (handle authentication errors gracefully)
if git push -u origin main 2>&1; then
    echo ""
    echo "🎉 SUCCESS! Your AI Code Agent is now on GitHub!"
    echo ""
    echo "🔗 Repository URL: https://github.com/$USERNAME/$REPO_NAME"
    echo ""
    echo "📋 What's in your repository:"
    echo "   ✅ Complete AI Code Agent source code"
    echo "   ✅ Comprehensive test suite"
    echo "   ✅ PostgreSQL database schema"
    echo "   ✅ Docker configuration"
    echo "   ✅ TypeScript configuration"
    echo "   ✅ Documentation and setup guides"
    echo "   ✅ .env.example for environment setup"
    echo ""
    echo "🚫 Security note: Your actual .env file with API keys is NOT included"
    echo ""
    echo "📖 Next steps for contributors:"
    echo "   1. Clone: git clone https://github.com/$USERNAME/$REPO_NAME.git"
    echo "   2. Setup: Follow LOCAL_SETUP_GUIDE.md"
    echo "   3. Install: npm install"
    echo "   4. Configure: Copy .env.example to .env and add your API keys"
    echo "   5. Test: npm test"
    echo "   6. Run: npm run dev"
else
    echo ""
    echo "❌ Push failed. This might be due to authentication issues."
    echo "💡 Solutions:"
    echo "   1. Make sure your Personal Access Token has 'repo' permissions"
    echo "   2. Check that your username and token are correct"
    echo "   3. Try using GitHub CLI instead: gh repo create $REPO_NAME --public --source=. --remote=origin --push"
    echo ""
    echo "Manual setup alternative:"
    echo "   1. Go to https://github.com/new"
    echo "   2. Create repository named: $REPO_NAME"
    echo "   3. Run these commands:"
    echo "      git remote add origin https://github.com/$USERNAME/$REPO_NAME.git"
    echo "      git push -u origin main"
fi

echo ""
echo "✨ Repository setup complete!"