const CONSTANTS = {
  DEFAULT_PROMPT: "Answer interview questions naturally. Use knowledge base first. Keep answers short, honest, and practical.",
  DEFAULT_TONE: "Direct",
  DEFAULT_PROVIDER: "pollinations",
  MAX_CONTEXT_CHARS: 2000,

  // RAG Configuration
  RAG: {
    SERVER_URL: "http://localhost:8000",
    ENABLED: true,
    TOP_K: 3,  // Number of chunks to retrieve
    MIN_SIMILARITY: 0.5  // Minimum similarity threshold
  },
  // AI Provider Configurations
  PROVIDERS: {
    pollinations: {
      name: "Pollinations (Free)",
      endpoint: "https://text.pollinations.ai/",
      defaultModel: "openai",
      models: ["openai", "mistral", "llama"],
      keyPrefix: null,  // No API key needed!
      requiresKey: false
    },
    openai: {
      name: "OpenAI",
      endpoint: "https://api.openai.com/v1/chat/completions",
      defaultModel: "gpt-4o-mini",
      models: ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"],
      keyPrefix: "sk-",
      requiresKey: true
    },
    gemini: {
      name: "Google Gemini",
      endpoint: "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
      defaultModel: "models/gemini-2.5-flash",
      models: ["models/gemini-2.5-flash"],
      keyPrefix: "AI",
      requiresKey: true
    },
    openrouter: {
      name: "OpenRouter",
      endpoint: "https://openrouter.ai/api/v1/chat/completions",
      defaultModel: "openai/gpt-oss-20b:free",
      models: ["openai/gpt-oss-20b:free", "nvidia/nemotron-nano-12b-v2-vl:free", "mistralai/mistral-small-3.1-24b-instruct:free", "google/gemma-3-27b-it:free", "deepseek/deepseek-r1-distill-qwen-14b", "cognitivecomputations/dolphin-mistral-24b-venice-edition:free"],
      keyPrefix: "sk-or-",
      requiresKey: true
    },
    groq: {
      name: "Groq",
      endpoint: "https://api.groq.com/openai/v1/chat/completions",
      defaultModel: "llama-3.3-70b-versatile",
      models: ["openai/gpt-oss-20b", "qwen/qwen3-32b", "llama-3.3-70b-versatile"],
      keyPrefix: "gsk_",
      requiresKey: true
    }
  },

  Events: {
    GENERATE: "GENERATE_RESPONSE",
    SUMMARIZE: "SUMMARIZE_CONTEXT",
    UPDATE_SIDEBAR: "UPDATE_SIDEBAR_UI"
  }
};
// Make available globally for content scripts
if (typeof window !== "undefined") window.CONSTANTS = CONSTANTS;