#!/bin/bash

# GitHub Repository Creation and Push Script
# This script creates a GitHub repository and pushes your AI Code Agent

echo "🚀 Creating GitHub repository and pushing AI Code Agent..."

# Set repository name
REPO_NAME="ai-code-agent"
USERNAME="$GITHUB_USERNAME"
TOKEN="$GITHUB_TOKEN"

# Create repository on GitHub
echo "📝 Creating repository on GitHub..."
curl -X POST \
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
  }"

echo ""
echo "🔧 Setting up git repository..."

# Initialize git
git init

# Add all files
git add .

# Commit with comprehensive message
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
- Complete Documentation"

# Add remote with credentials
git remote add origin "https://$USERNAME:$TOKEN@github.com/$USERNAME/$REPO_NAME.git"

# Push to GitHub
git branch -M main
git push -u origin main

echo ""
echo "✅ Done! Your repository is available at:"
echo "🔗 https://github.com/$USERNAME/$REPO_NAME"