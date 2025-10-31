#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 DIAGNOSTIC: Checking your current location and AI Code Agent files...\n');

// Check current directory
exec('pwd', (err, stdout) => {
  if (err) {
    console.log('❌ Current directory (Windows):');
    exec('cd', (err2, stdout2) => {
      if (stdout2) console.log(`   ${stdout2.trim()}`);
    });
  } else {
    console.log('✅ Current directory:', stdout.trim());
  }
  
  console.log('\n📁 Looking for AI Code Agent files...');
  
  const requiredFiles = [
    'src/',
    'tests/',
    'docs/',
    'package.json',
    'README.md',
    '.gitignore',
    '.env'
  ];
  
  let foundFiles = 0;
  let missingFiles = [];
  
  requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`✅ ${file} - FOUND`);
      foundFiles++;
    } else {
      console.log(`❌ ${file} - MISSING`);
      missingFiles.push(file);
    }
  });
  
  console.log(`\n📊 SUMMARY:`);
  console.log(`   Found: ${foundFiles}/${requiredFiles.length} required files`);
  
  if (foundFiles === requiredFiles.length) {
    console.log('\n🎉 PERFECT! You are in the correct AI Code Agent directory!');
    console.log('   You can proceed with git commands.');
  } else {
    console.log('\n⚠️  MISSING FILES DETECTED');
    console.log('   Missing:', missingFiles.join(', '));
    console.log('\n   You may be in the wrong directory.');
    console.log('   Check if your AI Code Agent folder is in a subdirectory.');
  }
  
  // Check if we're in a git repository
  if (fs.existsSync('.git')) {
    console.log('\n✅ Git repository detected');
    
    // Check git status
    exec('git status --porcelain', (err, stdout) => {
      if (err) {
        console.log('❌ Could not check git status');
      } else {
        const status = stdout.trim();
        if (status) {
          console.log('📋 Git status (changes):');
          console.log(status);
        } else {
          console.log('📋 Git status: All files committed');
        }
      }
      
      // Check remote
      exec('git remote -v', (err, stdout) => {
        if (err) {
          console.log('❌ No remote repository configured');
        } else {
          console.log('🔗 Remote repository:');
          console.log(stdout.trim());
        }
      });
    });
  } else {
    console.log('❌ No git repository detected');
  }
});