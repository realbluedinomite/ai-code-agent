/**
 * Groq AI Provider Usage Examples
 * 
 * This file demonstrates various ways to use the Groq AI provider for different tasks.
 * Each example includes error handling and best practices.
 */

import { GroqAIProvider, createGroqProvider, GroqProviderConfig } from './groq-ai-provider';
import { TextCompletionConfig, ChatCompletionConfig, CodeGenerationConfig } from './ai-provider';

/**
 * Example 1: Basic Text Completion
 * 
 * Demonstrates how to use the provider for simple text generation tasks.
 */
export async function example1TextCompletion(): Promise<void> {
  console.log('=== Example 1: Text Completion ===\n');

  try {
    // Initialize the provider
    const provider = new GroqAIProvider();
    
    await provider.initialize({
      apiKey: process.env.GROQ_API_KEY || 'your-api-key-here',
      defaultTextModel: 'mixtral-8x7b-32768',
      maxTokens: 200,
      temperature: 0.7,
    });

    // Configure and make request
    const config: TextCompletionConfig = {
      model: 'mixtral-8x7b-32768',
      prompt: 'Explain the benefits of using TypeScript in modern web development:',
      maxTokens: 200,
      temperature: 0.7,
    };

    const response = await provider.completeText(config);

    console.log('Generated text:');
    console.log(response.text);
    console.log('\nUsage statistics:');
    console.log(`- Prompt tokens: ${response.usage?.prompt}`);
    console.log(`- Completion tokens: ${response.usage?.completion}`);
    console.log(`- Total tokens: ${response.usage?.total}`);
    console.log(`- Response time: ${response.responseTime}ms`);
    console.log(`- Model used: ${response.model}`);

  } catch (error) {
    console.error('Error in text completion:', error);
  }

  console.log('\n---\n');
}

/**
 * Example 2: Chat Completion
 * 
 * Demonstrates conversational AI with multiple messages.
 */
export async function example2ChatCompletion(): Promise<void> {
  console.log('=== Example 2: Chat Completion ===\n');

  try {
    const provider = createGroqProvider({
      apiKey: process.env.GROQ_API_KEY || 'your-api-key-here',
      defaultChatModel: 'llama2-70b-4096',
      temperature: 0.5,
      maxTokens: 300,
    });

    await provider.initialize();

    const config: ChatCompletionConfig = {
      model: 'llama2-70b-4096',
      messages: [
        {
          role: 'system',
          content: 'You are an experienced software architect. Provide practical, actionable advice.'
        },
        {
          role: 'user',
          content: 'What are the key principles for designing scalable microservices architecture?'
        },
        {
          role: 'assistant',
          content: 'Here are the key principles for scalable microservices: 1) Single responsibility, 2) Independent deployment, 3) Decentralized data management, 4) Infrastructure automation.'
        },
        {
          role: 'user',
          content: 'How should we handle data consistency between services?'
        }
      ],
      temperature: 0.5,
      maxTokens: 300,
    };

    const response = await provider.completeChat(config);

    console.log('Assistant response:');
    console.log(response.message.content);
    console.log('\nChat metadata:');
    console.log(`- Total choices: ${response.choices?.length || 1}`);
    console.log(`- Finish reason: ${response.choices?.[0]?.finishReason || 'N/A'}`);
    console.log(`- Provider: ${response.metadata?.provider}`);
    console.log(`- Version: ${response.metadata?.providerVersion}`);

  } catch (error) {
    console.error('Error in chat completion:', error);
  }

  console.log('\n---\n');
}

/**
 * Example 3: Code Generation
 * 
 * Demonstrates specialized code generation for different programming tasks.
 */
export async function example3CodeGeneration(): Promise<void> {
  console.log('=== Example 3: Code Generation ===\n');

  try {
    const provider = new GroqAIProvider();

    await provider.initialize({
      apiKey: process.env.GROQ_API_KEY || 'your-api-key-here',
      defaultCodeModel: 'codellama-34b-4096',
      temperature: 0.3,
      maxTokens: 500,
    });

    const config: CodeGenerationConfig = {
      model: 'codellama-34b-4096',
      language: 'typescript',
      prompt: 'Create a function that validates email addresses using regex',
      context: 'The function should handle edge cases and be well-documented',
      format: 'block',
      temperature: 0.3,
      maxTokens: 500,
    };

    const response = await provider.generateCode(config);

    console.log('Generated code:');
    console.log(response.code);
    
    if (response.explanation) {
      console.log('\nExplanation:');
      console.log(response.explanation);
    }

    console.log('\nCode quality assessment:');
    console.log(`- Quality score: ${(response.qualityScore! * 100).toFixed(1)}%`);
    console.log(`- Language: ${response.language}`);
    console.log(`- Token usage: ${response.usage?.total}`);

  } catch (error) {
    console.error('Error in code generation:', error);
  }

  console.log('\n---\n');
}

/**
 * Example 4: Streaming Chat
 * 
 * Demonstrates real-time streaming responses for better user experience.
 */
export async function example4StreamingChat(): Promise<void> {
  console.log('=== Example 4: Streaming Chat ===\n');

  try {
    const provider = new GroqAIProvider();

    await provider.initialize({
      apiKey: process.env.GROQ_API_KEY || 'your-api-key-here',
      defaultChatModel: 'llama2-70b-4096',
    });

    const config: ChatCompletionConfig = {
      model: 'llama2-70b-4096',
      messages: [
        { role: 'user', content: 'Write a short poem about the power of technology' }
      ],
      stream: true,
    };

    console.log('Streaming response:');
    let fullResponse = '';

    await provider.streamChatCompletion(
      config,
      (chunk) => {
        fullResponse += chunk.content;
        process.stdout.write(chunk.content);
      },
      (error) => {
        console.error('\nStream error:', error.message);
      }
    );

    console.log('\n\nFull response length:', fullResponse.length, 'characters');

  } catch (error) {
    console.error('Error in streaming chat:', error);
  }

  console.log('\n---\n');
}

/**
 * Example 5: Error Handling and Recovery
 * 
 * Demonstrates robust error handling and retry mechanisms.
 */
export async function example5ErrorHandling(): Promise<void> {
  console.log('=== Example 5: Error Handling ===\n');

  const maxRetries = 3;
  const baseDelay = 1000; // 1 second

  try {
    const provider = new GroqAIProvider();

    await provider.initialize({
      apiKey: process.env.GROQ_API_KEY || 'your-api-key-here',
    });

    // Simulate a request with retry logic
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt} of ${maxRetries}`);

        const response = await provider.completeChat({
          model: 'mixtral-8x7b-32768',
          messages: [
            { role: 'user', content: 'Generate a random UUID' }
          ],
        });

        console.log('Success! Response:', response.message.content);
        break;

      } catch (error: any) {
        console.log(`Attempt ${attempt} failed:`, error.message);
        console.log('Error code:', error.code);
        console.log('Status code:', error.statusCode);

        if (attempt === maxRetries) {
          console.log('Max retries reached. Giving up.');
          throw error;
        }

        // Exponential backoff for rate limiting
        if (error.code === 'RATE_LIMITED') {
          const delay = baseDelay * Math.pow(2, attempt - 1);
          console.log(`Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          // Don't retry for other errors
          throw error;
        }
      }
    }

    // Display usage statistics
    const stats = provider.getUsageStats();
    console.log('\nUsage statistics:');
    console.log(`- Total requests: ${stats.totalRequests}`);
    console.log(`- Average response time: ${stats.averageResponseTime.toFixed(2)}ms`);
    console.log(`- Success rate: ${stats.successRate.toFixed(1)}%`);
    console.log(`- Error rate: ${stats.errorRate.toFixed(1)}%`);

  } catch (error) {
    console.error('Final error:', error);
  }

  console.log('\n---\n');
}

/**
 * Example 6: Multiple Model Comparison
 * 
 * Demonstrates comparing responses across different models.
 */
export async function example6ModelComparison(): Promise<void> {
  console.log('=== Example 6: Model Comparison ===\n');

  const models = [
    { id: 'mixtral-8x7b-32768', name: 'Mixtral-8x7B' },
    { id: 'llama2-70b-4096', name: 'Llama 2 70B' },
    { id: 'gemma-7b-it', name: 'Gemma 7B' },
  ];

  try {
    const provider = new GroqAIProvider();

    await provider.initialize({
      apiKey: process.env.GROQ_API_KEY || 'your-api-key-here',
    });

    const prompt = 'Explain the concept of quantum computing in simple terms:';

    for (const model of models) {
      try {
        console.log(`--- ${model.name} (${model.id}) ---`);

        const startTime = Date.now();
        const response = await provider.completeText({
          model: model.id,
          prompt,
          maxTokens: 150,
          temperature: 0.7,
        });
        const responseTime = Date.now() - startTime;

        console.log('Response:', response.text);
        console.log(`Response time: ${responseTime}ms`);
        console.log(`Tokens used: ${response.usage?.total || 'N/A'}`);
        console.log('');

      } catch (error) {
        console.log(`Error with ${model.name}:`, error.message);
        console.log('');
      }
    }

  } catch (error) {
    console.error('Error in model comparison:', error);
  }

  console.log('\n---\n');
}

/**
 * Example 7: Rate Limit Monitoring
 * 
 * Demonstrates monitoring and managing API rate limits.
 */
export async function example7RateLimitMonitoring(): Promise<void> {
  console.log('=== Example 7: Rate Limit Monitoring ===\n');

  try {
    const provider = new GroqAIProvider();

    await provider.initialize({
      apiKey: process.env.GROQ_API_KEY || 'your-api-key-here',
    });

    // Display initial rate limit status
    const initialStatus = provider.getRateLimitStatus();
    console.log('Initial rate limit status:');
    console.log(JSON.stringify(initialStatus, null, 2));

    // Make multiple requests and monitor rate limits
    for (let i = 1; i <= 5; i++) {
      try {
        console.log(`\nRequest ${i}:`);

        const response = await provider.completeChat({
          model: 'mixtral-8x7b-32768',
          messages: [{ role: 'user', content: `Request ${i}: Generate a random number between 1 and 100` }],
        });

        console.log(`Response: ${response.message.content.substring(0, 50)}...`);

        // Check rate limit status after each request
        const status = provider.getRateLimitStatus();
        console.log(`Remaining requests in window: ${status.window.remaining}`);
        console.log(`Reset in: ${Math.ceil(status.window.resetTime.getTime() - Date.now()) / 1000}s`);

      } catch (error: any) {
        if (error.code === 'RATE_LIMITED') {
          console.log('Rate limit hit! Waiting for reset...');
          
          const status = provider.getRateLimitStatus();
          const waitTime = status.window.resetTime.getTime() - Date.now();
          
          if (waitTime > 0) {
            console.log(`Waiting ${Math.ceil(waitTime / 1000)} seconds...`);
            await new Promise(resolve => setTimeout(resolve, waitTime + 1000));
          }
          
          // Retry the request
          const response = await provider.completeChat({
            model: 'mixtral-8x7b-32768',
            messages: [{ role: 'user', content: `Request ${i}: Generate a random number between 1 and 100` }],
          });
          
          console.log(`Retry successful: ${response.message.content.substring(0, 50)}...`);
        } else {
          throw error;
        }
      }
    }

    // Final statistics
    const finalStats = provider.getUsageStats();
    console.log('\nFinal statistics:');
    console.log(`- Total requests: ${finalStats.totalRequests}`);
    console.log(`- Total tokens: ${finalStats.totalTokens}`);
    console.log(`- Average response time: ${finalStats.averageResponseTime.toFixed(2)}ms`);

  } catch (error) {
    console.error('Error in rate limit monitoring:', error);
  }

  console.log('\n---\n');
}

/**
 * Example 8: Batch Processing
 * 
 * Demonstrates processing multiple requests efficiently.
 */
export async function example8BatchProcessing(): Promise<void> {
  console.log('=== Example 8: Batch Processing ===\n');

  const tasks = [
    'Summarize the benefits of machine learning',
    'Explain the difference between synchronous and asynchronous programming',
    'Describe best practices for API design',
    'List the key principles of clean code',
    'Explain the CAP theorem in distributed systems',
  ];

  try {
    const provider = new GroqAIProvider();

    await provider.initialize({
      apiKey: process.env.GROQ_API_KEY || 'your-api-key-here',
      temperature: 0.5,
      maxTokens: 100,
    });

    const results: Array<{ task: string; response: any; error?: any }> = [];

    console.log('Processing tasks sequentially...');
    const startTime = Date.now();

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      
      try {
        console.log(`Processing task ${i + 1}/${tasks.length}: ${task.substring(0, 50)}...`);

        const response = await provider.completeText({
          model: 'mixtral-8x7b-32768',
          prompt: `Briefly explain: ${task}`,
          maxTokens: 100,
          temperature: 0.5,
        });

        results.push({ task, response });

      } catch (error) {
        console.log(`Failed to process task ${i + 1}:`, error.message);
        results.push({ task, response: null, error });
      }
    }

    const totalTime = Date.now() - startTime;

    console.log('\n--- Results Summary ---');
    const successCount = results.filter(r => !r.error).length;
    console.log(`Successful: ${successCount}/${tasks.length}`);
    console.log(`Failed: ${tasks.length - successCount}`);
    console.log(`Total time: ${totalTime}ms`);
    console.log(`Average time per task: ${(totalTime / tasks.length).toFixed(2)}ms`);

    // Display successful results
    console.log('\n--- Successful Results ---');
    results.forEach((result, index) => {
      if (!result.error) {
        console.log(`\n${index + 1}. ${result.task.substring(0, 50)}...`);
        console.log(`   Response: ${result.response!.text.substring(0, 100)}...`);
        console.log(`   Tokens: ${result.response!.usage?.total}`);
      }
    });

  } catch (error) {
    console.error('Error in batch processing:', error);
  }

  console.log('\n---\n');
}

/**
 * Run all examples (can be used for testing)
 */
export async function runAllExamples(): Promise<void> {
  console.log('🚀 Running all Groq AI Provider examples...\n');

  await example1TextCompletion();
  await example2ChatCompletion();
  await example3CodeGeneration();
  await example4StreamingChat();
  await example5ErrorHandling();
  await example6ModelComparison();
  await example7RateLimitMonitoring();
  await example8BatchProcessing();

  console.log('✅ All examples completed!');
}

// Example environment setup
export const exampleEnvConfig = `
# .env file example
GROQ_API_KEY=your-groq-api-key-here

# Optional: Custom base URL (for self-hosted instances)
GROQ_BASE_URL=https://api.groq.com

# Optional: Timeout settings
GROQ_TIMEOUT=30000

# Optional: Rate limit settings
GROQ_MAX_REQUESTS_PER_MINUTE=60
GROQ_MAX_REQUESTS_PER_HOUR=3600
`;

// CLI usage example
export const cliUsageExample = `
#!/bin/bash

# Example CLI usage

# Set environment variable
export GROQ_API_KEY="your-api-key-here"

# Run text completion
node -e "
import('./src/providers/groq-ai-provider.js').then(async ({ GroqAIProvider }) => {
  const provider = new GroqAIProvider();
  await provider.initialize({ apiKey: process.env.GROQ_API_KEY });
  
  const response = await provider.completeText({
    model: 'mixtral-8x7b-32768',
    prompt: 'Hello, world!',
    maxTokens: 50,
  });
  
  console.log(response.text);
  await provider.close();
});
"
`;

if (require.main === module) {
  // Run examples if this file is executed directly
  runAllExamples().catch(console.error);
}
