#!/usr/bin/env node

const { execSync } = require('child_process');
const https = require('https');

// Load environment variables
require('dotenv').config();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_USERNAME = process.env.GITHUB_USERNAME;

if (!GITHUB_TOKEN || !GITHUB_USERNAME) {
    console.error('❌ GitHub token or username not found in environment');
    process.exit(1);
}

console.log('🚀 Starting GitHub repository creation and push...');

// Create repository on GitHub
function createGitHubRepo() {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            name: "ai-code-agent",
            description: "AI Code Agent System - Intelligent code generation and analysis with TypeScript, PostgreSQL, and Groq AI",
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
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
                'Content-Length': data.length,
                'User-Agent': 'AI-Code-Agent-Pusher'
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                if (res.statusCode === 201) {
                    console.log('✅ Repository created successfully on GitHub');
                    resolve(body);
                } else if (res.statusCode === 422) {
                    console.log('ℹ️ Repository already exists, continuing with push...');
                    resolve(null);
                } else {
                    console.error(`❌ Failed to create repository: ${res.statusCode}`);
                    console.error(body);
                    reject(new Error(`GitHub API returned ${res.statusCode}`));
                }
            });
        });

        req.on('error', (err) => {
            console.error('❌ Error creating repository:', err.message);
            reject(err);
        });

        req.write(data);
        req.end();
    });
}

// Initialize git and push to GitHub
async function pushToGitHub() {
    try {
        console.log('📝 Initializing git repository...');
        execSync('git init', { stdio: 'pipe' });

        console.log('📁 Adding files to git...');
        execSync('git add .', { stdio: 'pipe' });

        console.log('💾 Committing files...');
        execSync('git commit -m "Initial commit: Complete AI Code Agent System\n\nFeatures:\n- 6 Core Components (Input Parser, Project Analyzer, Planner, Implementer, Reviewer, Orchestrator)\n- Groq AI Integration with TypeScript\n- PostgreSQL Database with full schema\n- Comprehensive Testing Framework\n- Docker Support\n- Real-time CLI Interface\n- Session Management & Error Handling\n- Plugin Architecture\n- Complete Documentation"', { stdio: 'pipe' });

        console.log('🔗 Adding GitHub remote...');
        const repoUrl = `https://${GITHUB_USERNAME}:${GITHUB_TOKEN}@github.com/${GITHUB_USERNAME}/ai-code-agent.git`;
        
        try {
            execSync('git remote remove origin', { stdio: 'pipe' });
        } catch (e) {
            // Remote might not exist, that's okay
        }
        
        execSync(`git remote add origin ${repoUrl}`, { stdio: 'pipe' });

        console.log('📤 Pushing to GitHub...');
        execSync('git branch -M main', { stdio: 'pipe' });
        execSync('git push -u origin main', { stdio: 'pipe' });

        console.log('🎉 Successfully pushed to GitHub!');
        console.log(`🔗 Repository URL: https://github.com/${GITHUB_USERNAME}/ai-code-agent`);
        
        return true;
    } catch (error) {
        console.error('❌ Error during git operations:', error.message);
        return false;
    }
}

// Main execution
async function main() {
    try {
        // Create repository
        await createGitHubRepo();
        
        // Push to GitHub
        const success = await pushToGitHub();
        
        if (success) {
            console.log('\n✅ All done! Your AI Code Agent is now on GitHub.');
            console.log(`🔗 Access it at: https://github.com/${GITHUB_USERNAME}/ai-code-agent`);
        } else {
            console.log('\n❌ Push failed. Check the errors above.');
            process.exit(1);
        }
    } catch (error) {
        console.error('❌ Process failed:', error.message);
        process.exit(1);
    }
}

main();