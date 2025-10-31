#!/usr/bin/env node

// Check what files are in your GitHub repository

const https = require('https');

const GITHUB_TOKEN = 'YOUR_GITHUB_TOKEN_HERE';
const USERNAME = 'realbluedinomite';
const REPO = 'ai-code-agent';

const options = {
    hostname: 'api.github.com',
    port: 443,
    path: `/repos/${USERNAME}/${REPO}/contents`,
    method: 'GET',
    headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Check-Repo-Content'
    }
};

const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        if (res.statusCode === 200) {
            const contents = JSON.parse(data);
            console.log('📁 Files currently in your GitHub repository:');
            console.log('=' * 50);
            contents.forEach(item => {
                console.log(`${item.type === 'dir' ? '📁' : '📄'} ${item.name}`);
            });
            console.log('=' * 50);
        } else {
            console.error(`❌ Error: ${res.statusCode}`);
            console.error(data);
        }
    });
});

req.on('error', (err) => {
    console.error('❌ Request failed:', err.message);
});

req.end();