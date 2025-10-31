#!/usr/bin/env node

/**
 * Groq AI Provider Quick Start Script
 * 
 * This script demonstrates the basic usage of the Groq AI Provider.
 * Run this script to test your setup and see the provider in action.
 * 
 * Usage:
 *   node quick-start.js
 * 
 * Environment Variables:
 *   GROQ_API_KEY - Your Groq API key (required)
 */

import { GroqAIProvider } from './src/providers/groq-ai-provider.js';
import chalk from 'chalk';

// Color output helpers
const colors = {
  success: chalk.green,
  error: chalk.red,
  info: chalk.blue,
  warning: chalk.yellow,
  dim: chalk.dim,
};

// Display banner
function displayBanner() {
  console.log(colors.info(`
╔══════════════════════════════════════════════════════════════╗
║                    Groq AI Provider Demo                     ║
║                   Fast LLM Inference API                     ║
╚══════════════════════════════════════════════════════════════╝
  `));
}

// Check environment
function checkEnvironment() {
  const apiKey = process.env.GROQ_API_KEY;
  
  if (!apiKey) {
    console.error(colors.error('❌ Error: GROQ_API_KEY environment variable is not set'));
    console.log(colors.info('Set it with: export GROQ_API_KEY="your-api-key-here"'));
    process.exit(1);
  }
  
  console.log(colors.success('✅ API key found'));
  return apiKey;
}

// Test provider initialization
async function testInitialization(apiKey) {
  console.log(colors.info('\n🔧 Initializing Groq AI Provider...'));
  
  const provider = new GroqAIProvider();
  
  try {
    await provider.initialize({
      apiKey,
      temperature: 0.7,
      maxTokens: 1024,
    });
    
    console.log(colors.success('✅ Provider initialized successfully'));
    console.log(colors.dim(`   Provider: ${provider.name}`));
    console.log(colors.dim(`   Version: ${provider.version}`));
    console.log(colors.dim(`   Default Text Model: ${provider.defaultTextModel}`));
    console.log(colors.dim(`   Default Chat Model: ${provider.defaultChatModel}`));
    console.log(colors.dim(`   Default Code Model: ${provider.defaultCodeModel}`));
    
    return provider;
  } catch (error) {
    console.error(colors.error(`❌ Failed to initialize provider: ${error.message}`));
    process.exit(1);
  }
}

// Test text completion
async function testTextCompletion(provider) {
  console.log(colors.info('\n📝 Testing Text Completion...'));
  
  try {
    const response = await provider.completeText({
      model: provider.defaultTextModel,
      prompt: 'Write a short, creative description of artificial intelligence:',
      maxTokens: 150,
      temperature: 0.8,
    });
    
    console.log(colors.success('✅ Text completion successful'));
    console.log(colors.dim('\nGenerated Text:'));
    console.log(response.text);
    console.log(colors.dim(`\nStats:`));
    console.log(colors.dim(`   Tokens: ${response.usage?.total || 'N/A'}`));
    console.log(colors.dim(`   Time: ${response.responseTime}ms`));
    console.log(colors.dim(`   Model: ${response.model}`));
    
    return response;
  } catch (error) {
    console.error(colors.error(`❌ Text completion failed: ${error.message}`));
    return null;
  }
}

// Test chat completion
async function testChatCompletion(provider) {
  console.log(colors.info('\n💬 Testing Chat Completion...'));
  
  try {
    const response = await provider.completeChat({
      model: provider.defaultChatModel,
      messages: [
        {
          role: 'system',
          content: 'You are a friendly and knowledgeable AI assistant.'
        },
        {
          role: 'user',
          content: 'What are the three most important principles of software development?'
        }
      ],
      maxTokens: 300,
      temperature: 0.7,
    });
    
    console.log(colors.success('✅ Chat completion successful'));
    console.log(colors.dim('\nAssistant Response:'));
    console.log(response.message.content);
    console.log(colors.dim(`\nStats:`));
    console.log(colors.dim(`   Tokens: ${response.usage?.total || 'N/A'}`));
    console.log(colors.dim(`   Time: ${response.responseTime}ms`));
    console.log(colors.dim(`   Finish Reason: ${response.choices?.[0]?.finishReason || 'N/A'}`));
    
    return response;
  } catch (error) {
    console.error(colors.error(`❌ Chat completion failed: ${error.message}`));
    return null;
  }
}

// Test code generation
async function testCodeGeneration(provider) {
  console.log(colors.info('\n💻 Testing Code Generation...'));
  
  try {
    const response = await provider.generateCode({
      model: provider.defaultCodeModel,
      language: 'javascript',
      prompt: 'Create a function that calculates the factorial of a number',
      context: 'The function should handle edge cases like negative numbers and be well-documented',
      temperature: 0.3,
    });
    
    console.log(colors.success('✅ Code generation successful'));
    console.log(colors.dim('\nGenerated Code:'));
    console.log(colors.dim('```' + response.language));
    console.log(response.code);
    console.log(colors.dim('```'));
    
    if (response.explanation) {
      console.log(colors.dim('\nExplanation:'));
      console.log(response.explanation);
    }
    
    console.log(colors.dim(`\nStats:`));
    console.log(colors.dim(`   Language: ${response.language}`));
    console.log(colors.dim(`   Quality Score: ${(response.qualityScore! * 100).toFixed(1)}%`));
    console.log(colors.dim(`   Tokens: ${response.usage?.total || 'N/A'}`));
    console.log(colors.dim(`   Time: ${response.responseTime}ms`));
    
    return response;
  } catch (error) {
    console.error(colors.error(`❌ Code generation failed: ${error.message}`));
    return null;
  }
}

// Test streaming
async function testStreaming(provider) {
  console.log(colors.info('\n🌊 Testing Streaming Chat...'));
  
  try {
    console.log(colors.dim('Streaming response:'));
    let fullResponse = '';
    
    await provider.streamChatCompletion(
      {
        model: provider.defaultChatModel,
        messages: [
          { role: 'user', content: 'Write a haiku about programming' }
        ],
      },
      (chunk) => {
        fullResponse += chunk.content;
        process.stdout.write(chunk.content); // Stream to stdout
      },
      (error) => {
        console.error(colors.error(`\n❌ Streaming error: ${error.message}`));
      }
    );
    
    console.log('\n');
    console.log(colors.success('✅ Streaming completed'));
    console.log(colors.dim(`\nFull response length: ${fullResponse.length} characters`));
    
    return fullResponse;
  } catch (error) {
    console.error(colors.error(`❌ Streaming failed: ${error.message}`));
    return null;
  }
}

// Display available models
async function displayAvailableModels(provider) {
  console.log(colors.info('\n📋 Available Models:'));
  
  try {
    const models = await provider.getAvailableModels();
    
    models.forEach((model, index) => {
      console.log(colors.dim(`\n${index + 1}. ${model.name} (${model.id})`));
      console.log(colors.dim(`   ${model.description}`));
      console.log(colors.dim(`   Context Length: ${model.contextLength.toLocaleString()} tokens`));
      
      const supports = Object.entries(model.supports)
        .filter(([_, supported]) => supported)
        .map(([feature, _]) => feature)
        .join(', ');
      
      console.log(colors.dim(`   Supports: ${supports}`));
    });
  } catch (error) {
    console.error(colors.error(`❌ Failed to get models: ${error.message}`));
  }
}

// Show rate limit status
function showRateLimitStatus(provider) {
  console.log(colors.info('\n⏱️  Rate Limit Status:'));
  
  try {
    const status = provider.getRateLimitStatus();
    
    console.log(colors.dim(`Window Limit: ${status.window.limit}`));
    console.log(colors.dim(`Window Remaining: ${status.window.remaining}`));
    console.log(colors.dim(`Window Reset: ${status.window.resetTime.toLocaleTimeString()}`));
    
    console.log(colors.dim(`RPM Limit: ${status.rpm.limit}`));
    console.log(colors.dim(`RPM Remaining: ${status.rpm.remaining}`));
  } catch (error) {
    console.error(colors.error(`❌ Failed to get rate limit status: ${error.message}`));
  }
}

// Show usage statistics
function showUsageStatistics(provider) {
  console.log(colors.info('\n📊 Usage Statistics:'));
  
  try {
    const stats = provider.getUsageStats();
    
    console.log(colors.dim(`Total Requests: ${stats.totalRequests}`));
    console.log(colors.dim(`Total Tokens: ${stats.totalTokens.toLocaleString()}`));
    console.log(colors.dim(`Average Response Time: ${stats.averageResponseTime.toFixed(2)}ms`));
    console.log(colors.dim(`Success Rate: ${stats.successRate.toFixed(1)}%`));
    console.log(colors.dim(`Error Rate: ${stats.errorRate.toFixed(1)}%`));
    
    if (stats.totalCost !== undefined) {
      console.log(colors.dim(`Total Cost: $${stats.totalCost.toFixed(4)}`));
    }
  } catch (error) {
    console.error(colors.error(`❌ Failed to get usage statistics: ${error.message}`));
  }
}

// Test error handling
async function testErrorHandling(provider) {
  console.log(colors.info('\n🛡️  Testing Error Handling...'));
  
  try {
    // Test with an invalid model (should handle gracefully)
    await provider.completeText({
      model: 'invalid-model-name',
      prompt: 'This should fail',
    });
    
    console.log(colors.warning('⚠️  Expected an error but request succeeded'));
  } catch (error) {
    if (error.code === 'MODEL_NOT_FOUND' || error.code === 'GROQ_API_ERROR') {
      console.log(colors.success('✅ Error handling working correctly'));
      console.log(colors.dim(`   Error Code: ${error.code}`));
      console.log(colors.dim(`   Error Message: ${error.message}`));
    } else {
      console.error(colors.error(`❌ Unexpected error: ${error.message}`));
    }
  }
}

// Main execution
async function main() {
  displayBanner();
  
  const apiKey = checkEnvironment();
  const provider = await testInitialization(apiKey);
  
  // Run all tests
  await testTextCompletion(provider);
  await testChatCompletion(provider);
  await testCodeGeneration(provider);
  await testStreaming(provider);
  
  // Show additional information
  await displayAvailableModels(provider);
  showRateLimitStatus(provider);
  showUsageStatistics(provider);
  await testErrorHandling(provider);
  
  // Cleanup
  await provider.close();
  
  console.log(colors.success('\n🎉 Demo completed successfully!'));
  console.log(colors.info('\nNext steps:'));
  console.log(colors.dim('1. Check out the examples in groq-ai-examples.ts'));
  console.log(colors.dim('2. Read the documentation in docs/GROQ_PROVIDER.md'));
  console.log(colors.dim('3. Run the test suite: npm test'));
  console.log(colors.dim('4. Start building your AI-powered application!'));
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error(colors.error('Unhandled Rejection at:'), promise, 'reason:', reason);
  process.exit(1);
});

// Run the demo
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(colors.error('Fatal error:'), error);
    process.exit(1);
  });
}
