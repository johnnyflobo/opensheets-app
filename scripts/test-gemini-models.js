
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

async function listModels() {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error("❌ GOOGLE_API_KEY not found in .env");
    process.exit(1);
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  
  try {
    console.log("🔄 Fetching available models...");
    // Direct API call to list models if SDK doesn't expose it easily in this version,
    // but newer SDKs usually do. Let's try to infer or just run a simple generation on 'gemini-pro' to see specific error detail,
    // actually SDK has specific endpoint for this?
    // The error message suggests: "Call ListModels to see the list of available models"
    
    // Attempting to rely on standard fetch to the API since SDK might hide the raw list method depending on version
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();
    
    if (data.models) {
        console.log("✅ Models available for your key:");
        data.models.forEach(m => {
            if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent")) {
                console.log(`- ${m.name}`);
            }
        });
    } else {
        console.error("❌ No models found or error:", data);
    }

  } catch (error) {
    console.error("❌ Error fetching models:", error);
  }
}

listModels();
