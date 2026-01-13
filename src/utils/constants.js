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
      defaultModel: "gemini-2.5-flash-lite",
      models: [
        "gemini-3-flash-preview",
        "gemini-flash-latest",
        "gemini-2.5-flash-lite-preview-09-2025",
        "gemma-3-27b-it",
        "gemini-flash-lite-latest",
        "gemini-2.5-flash-lite",
        "gemini-2.5-flash-preview-09-2025",
        "gemma-3-12b-it",
        "gemma-3n-e4b-it",
        "gemma-3-4b-it",
        "gemma-3n-e2b-it",
        "gemma-3-1b-it",
        "gemini-robotics-er-1.5-preview"
      ],
      keyPrefix: "AI",
      requiresKey: true
    },
    openrouter: {
      name: "OpenRouter",
      endpoint: "https://openrouter.ai/api/v1/chat/completions",
      defaultModel: "google/gemini-2.0-flash-exp:free",
      models: [
        "meta-llama/llama-3.1-405b-instruct:free",
        "nousresearch/hermes-3-llama-3.1-405b:free",
        "openai/gpt-oss-120b:free",
        "deepseek/deepseek-r1-0528:free",
        "mistralai/devstral-2512:free",
        "qwen/qwen3-coder:free",
        "xiaomi/mimo-v2-flash:free",
        "google/gemma-3-27b-it:free",
        "z-ai/glm-4.5-air:free",
        "tngtech/deepseek-r1t-chimera:free",
        "allenai/molmo-2-8b:free",
        "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
        "qwen/qwen-2.5-vl-7b-instruct:free",
        "google/gemini-2.0-flash-exp:free",
        "mistralai/mistral-7b-instruct:free",
        "meta-llama/llama-3.3-70b-instruct:free",
        "nvidia/nemotron-3-nano-30b-a3b:free",
        "nvidia/nemotron-nano-12b-v2-vl:free",
        "nvidia/nemotron-nano-9b-v2:free",
        "openai/gpt-oss-20b:free",
        "moonshotai/kimi-k2:free",
        "mistralai/mistral-small-3.1-24b-instruct:free",
        "google/gemma-3-12b-it:free",
        "google/gemma-3n-e4b-it:free",
        "google/gemma-3-4b-it:free",
        "google/gemma-3n-e2b-it:free",
        "arcee-ai/trinity-mini:free",
        "qwen/qwen3-4b:free",
        "meta-llama/llama-3.2-3b-instruct:free",
        "tngtech/deepseek-r1t2-chimera:free",
        "tngtech/tng-r1t-chimera:free"
      ],
      keyPrefix: "sk-or-",
      requiresKey: true
    },
    groq: {
      name: "Groq",
      endpoint: "https://api.groq.com/openai/v1/chat/completions",
      defaultModel: "llama-3.3-70b-versatile",
      models: [
        "meta-llama/llama-4-maverick-17b-128e-instruct",
        "openai/gpt-oss-120b",
        "groq/compound",
        "meta-llama/llama-4-scout-17b-16e-instruct",
        "llama-3.3-70b-versatile",
        "moonshotai/kimi-k2-instruct-0905",
        "qwen/qwen3-32b",
        "groq/compound-mini",
        "openai/gpt-oss-20b",
        "moonshotai/kimi-k2-instruct",
        "llama-3.1-8b-instant",
        "allam-2-7b",
        "openai/gpt-oss-safeguard-20b",
        "meta-llama/llama-guard-4-12b",
        "meta-llama/llama-prompt-guard-2-86m",
        "meta-llama/llama-prompt-guard-2-22m"
      ],
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