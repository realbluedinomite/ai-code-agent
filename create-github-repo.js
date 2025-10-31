#!/usr/bin/env node

// 🎯 AI Code Agent - GitHub Repository Creator
// Simple Node.js script to create and push your repository

const https = require('https');
const { execSync } = require('child_process');

console.log('🚀 AI Code Agent - GitHub Repository Setup');
console.log('==========================================');

// Configuration - UPDATE THESE VALUES
const CONFIG = {
    username: 'realbluedinomite',
    token: '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',
    repoName: 'ai-code-agent',
    description: 'AI Code Agent System - Intelligent code generation and analysis with TypeScript, PostgreSQL, and Groq AI'
};

// Check if credentials are set
if (CONFIG.username === 'YOUR_GITHUB_USERNAME_HERE' || CONFIG.token === 'YOUR_GITHUB_TOKEN_HERE') {
    console.log('❌ Please update the CONFIG object in this script with your actual:');
    console.log('   - username: Your GitHub username');
    console.log('   - token: Your GitHub Personal Access Token');
    console.log('');
    console.log('💡 Then run: node create-github-repo.js');
    process.exit(1);
}

function createGitHubRepo() {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            name: CONFIG.repoName,
            description: CONFIG.description,
            private: false,
            has_issues: true,
            has_projects: true,
            has_wiki: true
        });

        const options = {
            hostname: 'api.github.com',
            port: 443,
            path: '/user/repos',
            method: 'POST',
            headers: {
                'Authorization': `token ${CONFIG.token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
                'Content-Length': data.length,
                'User-Agent': 'AI-Code-Agent-Scripts'
            }
        };

        console.log('📝 Creating repository on GitHub...');

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                if (res.statusCode === 201) {
                    console.log('✅ Repository created successfully!');
                    resolve(body);
                } else if (res.statusCode === 422) {
                    console.log('ℹ️ Repository already exists, continuing...');
                    resolve(null);
                } else {
                    console.error(`❌ GitHub API error (${res.statusCode}):`);
                    console.error(body);
                    reject(new Error(`GitHub API returned ${res.statusCode}`));
                }
            });
        });

        req.on('error', (err) => {
            console.error('❌ Network error:', err.message);
            reject(err);
        });

        req.write(data);
        req.end();
    });
}

function setupGitAndPush() {
    console.log('');
    console.log('🔧 Setting up git repository...');

    try {
        // Initialize git
        console.log('📁 Initializing git...');
        execSync('git init', { stdio: 'inherit' });

        // Configure git user
        execSync(`git config user.name "${CONFIG.username}"`, { stdio: 'inherit' });
        execSync(`git config user.email "${CONFIG.username}@users.noreply.github.com"`, { stdio: 'inherit' });

        // Add files
        console.log('📋 Adding files...');
        execSync('git add .', { stdio: 'inherit' });

        // Check if there are changes
        const statusOutput = execSync('git status --porcelain').toString();
        
        if (statusOutput.trim() === '') {
            console.log('ℹ️ No changes to commit');
        } else {
            // Commit
            console.log('💾 Committing...');
            execSync('git commit -m "Initial commit: Complete AI Code Agent System\\n\\nFeatures:\\n- 6 Core Components (Input Parser, Project Analyzer, Planner, Implementer, Reviewer, Orchestrator)\\n- Groq AI Integration with TypeScript\\n- PostgreSQL Database with full schema\\n- Comprehensive Testing Framework\\n- Docker Support\\n- Real-time CLI Interface\\n- Session Management & Error Handling\\n- Plugin Architecture\\n- Complete Documentation"', { stdio: 'inherit' });
        }

        // Add remote
        console.log('🔗 Adding remote...');
        try {
            execSync('git remote remove origin', { stdio: 'pipe' });
        } catch (e) {
            // Remote might not exist
        }
        
        execSync(`git remote add origin https://${CONFIG.username}:${CONFIG.token}@github.com/${CONFIG.username}/${CONFIG.repoName}.git`, { stdio: 'inherit' });

        // Push
        console.log('📤 Pushing to GitHub...');
        execSync('git branch -M main', { stdio: 'inherit' });
        execSync('git push -u origin main', { stdio: 'inherit' });

        return true;
    } catch (error) {
        console.error('❌ Git operation failed:');
        console.error(error.message);
        return false;
    }
}

async function main() {
    try {
        // Create repository
        await createGitHubRepo();

        // Setup git and push
        const success = setupGitAndPush();

        if (success) {
            console.log('');
            console.log('🎉 SUCCESS! Your AI Code Agent is on GitHub!');
            console.log('');
            console.log(`🔗 Repository: https://github.com/${CONFIG.username}/${CONFIG.repoName}`);
            console.log('');
            console.log('📋 Your repository includes:');
            console.log('   ✅ Complete AI Code Agent source code');
            console.log('   ✅ Comprehensive test suite');
            console.log('   ✅ PostgreSQL database setup');
            console.log('   ✅ Docker configuration');
            console.log('   ✅ Documentation and guides');
            console.log('   ✅ Security: .env excluded, .env.example included');
            console.log('');
            console.log('🚀 Contributors can now:');
            console.log('   1. Clone: git clone https://github.com/' + CONFIG.username + '/' + CONFIG.repoName + '.git');
            console.log('   2. Install: npm install');
            console.log('   3. Setup: Copy .env.example to .env');
            console.log('   4. Test: npm test');
            console.log('   5. Run: npm run dev');
        } else {
            console.log('');
            console.log('❌ Push failed. Please check the errors above.');
            console.log('');
            console.log('💡 Alternative: Use GitHub CLI');
            console.log(`   gh repo create ${CONFIG.repoName} --public --source=. --remote=origin --push`);
        }
    } catch (error) {
        console.error('❌ Setup failed:', error.message);
        process.exit(1);
    }
}

main();