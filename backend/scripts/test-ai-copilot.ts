import 'dotenv/config';
import { AzureOpenAI } from 'openai';
import OpenAI from 'openai';
import { config } from '../src/config.js';

async function testAzureOpenAI() {
  console.log('\n--- Testing Azure OpenAI (Chat/Draft Context) ---');
  if (!config.AZURE_OPENAI_API_KEY) {
    console.log('⚠️ AZURE_OPENAI_API_KEY not found. Skipping Azure OpenAI test.');
    return;
  }

  const azureOpenai = new AzureOpenAI({
    apiKey: config.AZURE_OPENAI_API_KEY,
    endpoint: config.AZURE_OPENAI_ENDPOINT,
    apiVersion: config.AZURE_OPENAI_API_VERSION,
    deployment: config.AZURE_DEPLOYMENT_NAME,
  });

  try {
    const completion = await azureOpenai.chat.completions.create({
      model: config.AZURE_DEPLOYMENT_NAME || 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: 'You are a polite assistant.' },
        { role: 'user', content: 'Just reply exactly with the word "WORKING" if you can hear me.' },
      ],
      max_tokens: 10,
    });
    console.log('✅ Azure OpenAI Response:', completion.choices[0]?.message?.content);
  } catch (err: any) {
    console.error('❌ Azure OpenAI Test Failed:', err.message);
  }
}

async function testOpenAI() {
  console.log('\n--- Testing Standard OpenAI (Extraction/Insights Context) ---');
  if (!config.OPENAI_API_KEY) {
    console.log('⚠️ OPENAI_API_KEY not found. Skipping OpenAI test.');
    return;
  }

  const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a data extractor.' },
        { role: 'user', content: 'Extract a JSON object with a single key "status" and value "WORKING".' },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 50,
    });
    console.log('✅ Standard OpenAI Response:', completion.choices[0]?.message?.content);
  } catch (err: any) {
    console.error('❌ Standard OpenAI Test Failed:', err.message);
  }
}

async function runTests() {
  console.log('🚀 Starting AI Copilot Integration Tests...');
  await testAzureOpenAI();
  await testOpenAI();
  console.log('\n🏁 Tests Completed.');
}

runTests();
