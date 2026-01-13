/* src/background/background.js */

// RAG Configuration
const RAG_CONFIG = {
  SERVER_URL: "http://localhost:8000",
  ENABLED: true,
  TOP_K: 3,
  MIN_SIMILARITY: 0.5
};

// Provider configurations for background worker
const PROVIDERS_CONFIG = {
  pollinations: {
    name: "Pollinations (Free)",
    endpoint: "https://text.pollinations.ai/",
    requiresKey: false
  },
  openai: {
    name: "OpenAI",
    endpoint: "https://api.openai.com/v1/chat/completions",
    defaultModel: "gpt-4o-mini",
    requiresKey: true
  },
  gemini: {
    name: "Google Gemini",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
    defaultModel: "models/gemini-2.5-flash",
    requiresKey: true
  },
  openrouter: {
    name: "OpenRouter",
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
    defaultModel: "openai/gpt-oss-20b:free",
    requiresKey: true
  },
  groq: {
    name: "Groq",
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    defaultModel: "llama-3.3-70b-versatile",
    requiresKey: true
  }
};

// Listen for messages from the sidebar and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "GENERATE_RESPONSE") {
    handleGenerateResponse(request.payload, sendResponse);
    return true;
  }

  if (request.action === "TEST_CONNECTION") {
    handleTestConnection(request.payload, sendResponse);
    return true;
  }

  // RAG Actions
  if (request.action === "RAG_ADD_DOCUMENT") {
    handleAddDocument(request.payload, sendResponse);
    return true;
  }

  if (request.action === "RAG_GET_DOCUMENTS") {
    handleGetDocuments(sendResponse);
    return true;
  }

  if (request.action === "RAG_DELETE_DOCUMENT") {
    handleDeleteDocument(request.payload, sendResponse);
    return true;
  }

  if (request.action === "RAG_SEARCH") {
    handleRagSearch(request.payload, sendResponse);
    return true;
  }

  if (request.action === "RAG_HEALTH") {
    handleRagHealth(sendResponse);
    return true;
  }

  // Cloud Sync Actions
  if (request.action === "CLOUD_HEALTH") {
    handleCloudHealth(sendResponse);
    return true;
  }

  if (request.action === "CLOUD_SYNC_ALL") {
    handleCloudSyncAll(sendResponse);
    return true;
  }
});

// ==================== RAG Functions ====================

async function handleRagHealth(sendResponse) {
  try {
    const response = await fetch(`${RAG_CONFIG.SERVER_URL}/health`);
    const data = await response.json();
    sendResponse({ success: true, ...data });
  } catch (err) {
    sendResponse({ success: false, error: "RAG server not running" });
  }
}

async function handleAddDocument(payload, sendResponse) {
  // Check storage mode preference
  const settings = await chrome.storage.local.get(['storageMode']);
  const storageMode = settings.storageMode || 'local';

  if (storageMode === 'cloud') {
    // Use cloud storage (Firebase)
    try {
      const CloudDB = await loadCloudDB();
      if (!CloudDB) {
        sendResponse({ success: false, error: "Cloud not configured. Check firebase-config.js" });
        return;
      }

      // Simple chunking for cloud storage
      const chunks = payload.content.match(/.{1,500}/g) || [];
      const result = await CloudDB.saveDocument(payload.title, payload.content, chunks);

      if (result.success) {
        sendResponse({ success: true, chunks: result.chunks || chunks.length });
      } else {
        sendResponse({ success: false, error: result.error || "Failed to save to cloud" });
      }
    } catch (err) {
      sendResponse({ success: false, error: "Cloud error: " + err.message });
    }
  } else {
    // Use local RAG server
    try {
      const response = await fetch(`${RAG_CONFIG.SERVER_URL}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: payload.title,
          content: payload.content
        })
      });

      const data = await response.json();

      if (!response.ok) {
        sendResponse({ success: false, error: data.detail || "Failed to add document" });
      } else {
        sendResponse({ success: true, ...data });
      }
    } catch (err) {
      sendResponse({ success: false, error: "RAG server not running. Start with: uvicorn main:app" });
    }
  }
}

async function handleGetDocuments(sendResponse) {
  // Check storage mode preference
  const settings = await chrome.storage.local.get(['storageMode']);
  const storageMode = settings.storageMode || 'local';

  if (storageMode === 'cloud') {
    try {
      const CloudDB = await loadCloudDB();
      if (!CloudDB) {
        sendResponse({ success: false, error: "Cloud not configured", documents: [] });
        return;
      }
      const result = await CloudDB.getDocuments();
      sendResponse(result);
    } catch (err) {
      sendResponse({ success: false, error: err.message, documents: [] });
    }
  } else {
    try {
      const response = await fetch(`${RAG_CONFIG.SERVER_URL}/documents`);
      const data = await response.json();
      sendResponse({ success: true, ...data });
    } catch (err) {
      sendResponse({ success: false, error: "RAG server not running", documents: [] });
    }
  }
}

async function handleDeleteDocument(payload, sendResponse) {
  // Check storage mode preference
  const settings = await chrome.storage.local.get(['storageMode']);
  const storageMode = settings.storageMode || 'local';

  if (storageMode === 'cloud') {
    try {
      const CloudDB = await loadCloudDB();
      if (!CloudDB) {
        sendResponse({ success: false, error: "Cloud not configured" });
        return;
      }
      const result = await CloudDB.deleteDocument(payload.title);
      sendResponse(result);
    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
  } else {
    try {
      const response = await fetch(`${RAG_CONFIG.SERVER_URL}/documents/${encodeURIComponent(payload.title)}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        const data = await response.json();
        sendResponse({ success: false, error: data.detail || "Failed to delete" });
      } else {
        sendResponse({ success: true });
      }
    } catch (err) {
      sendResponse({ success: false, error: "RAG server not running" });
    }
  }
}

async function handleRagSearch(payload, sendResponse) {
  try {
    const response = await fetch(`${RAG_CONFIG.SERVER_URL}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: payload.query,
        limit: RAG_CONFIG.TOP_K
      })
    });

    const data = await response.json();
    sendResponse({ success: true, ...data });
  } catch (err) {
    sendResponse({ success: false, error: "RAG server not running", results: [] });
  }
}

// Get relevant context from RAG
async function getRagContext(query) {
  if (!RAG_CONFIG.ENABLED) return "";

  try {
    const response = await fetch(`${RAG_CONFIG.SERVER_URL}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: query,
        limit: RAG_CONFIG.TOP_K
      })
    });

    if (!response.ok) return "";

    const data = await response.json();

    // Filter by similarity threshold and format context
    const relevantChunks = data.results
      .filter(r => r.similarity >= RAG_CONFIG.MIN_SIMILARITY)
      .map(r => `[${r.title}]: ${r.content}`)
      .join("\n\n");

    return relevantChunks;
  } catch (err) {
    console.log("RAG search failed:", err);
    return "";
  }
}

// ==================== Test Connection ====================

async function handleTestConnection(payload, sendResponse) {
  const { provider, model, apiKey } = payload;
  const testPrompt = "Say 'OK' if you can hear me.";

  try {
    let response;

    switch (provider) {
      case "pollinations":
        response = await callPollinations(testPrompt, model);
        break;
      case "gemini":
        response = await callGemini(apiKey, model, testPrompt);
        break;
      case "openrouter":
        response = await callOpenRouter(apiKey, model, testPrompt);
        break;
      case "groq":
        response = await callGroq(apiKey, model, testPrompt);
        break;
      case "openai":
      default:
        response = await callOpenAI(apiKey, model, testPrompt);
        break;
    }

    if (response.error) {
      sendResponse({ success: false, error: response.error });
    } else {
      sendResponse({ success: true, message: response.text });
    }
  } catch (err) {
    sendResponse({ success: false, error: `Network Error: ${err.message}` });
  }
}

// ==================== Generate Response with RAG ====================

async function handleGenerateResponse(payload, sendResponse) {
  // 1. Get Settings
  const settings = await chrome.storage.local.get(["apiKeys", "prompt", "tone", "provider", "model", "ragEnabled"]);
  const { prompt, tone } = settings;
  const provider = settings.provider || "pollinations";
  const model = settings.model || PROVIDERS_CONFIG[provider]?.defaultModel || "openai";
  const providerConfig = PROVIDERS_CONFIG[provider];
  const ragEnabled = settings.ragEnabled !== false; // Default to true

  // Get API key for the selected provider
  const apiKeys = settings.apiKeys || {};
  const apiKey = apiKeys[provider] || "";

  // Check API key only for providers that require it
  if (providerConfig.requiresKey && !apiKey) {
    sendResponse({ error: `No API Key found for ${providerConfig.name}. Please open extension settings.` });
    return;
  }

  // 2. Get RAG Context if enabled
  let ragContext = "";
  if (ragEnabled) {
    ragContext = await getRagContext(payload.recentCaptions);
  }

  // 3. Build the System Prompt with RAG context
  let systemPrompt = `
You are an expert MAINFRAME interview coach helping a candidate ace their IBM z/OS mainframe job interview.
Generate the PERFECT spoken answer for mainframe-related questions.

🖥️ MAINFRAME EXPERTISE AREAS:
- COBOL: File handling, PERFORM, EVALUATE, STRING/UNSTRING, COMP/COMP-3, copybooks
- JCL: DD statements, PROCs, COND/IF-THEN-ELSE, GDGs, utilities (IEBGENER, SORT, IDCAMS)
- CICS: COMMAREA, BMS maps, EXEC CICS commands, pseudo-conversational, channels/containers
- DB2: BIND, EXPLAIN, cursors, SQLCODE, DBRM, static vs dynamic SQL, locking
- VSAM: KSDS/ESDS/RRDS, DEFINE CLUSTER, REPRO, alternate indexes
- z/OS: SPOOL, JES2/JES3, initiators, RACF, SMS, catalogs

🎯 RESPONSE RULES:
1. Keep answers 2-4 sentences MAX - be concise and technical
2. Lead with the KEY technical point, then support briefly
3. Use specific mainframe metrics ("processed 5M records in batch window", "reduced CICS response to under 1 second")
4. For troubleshooting questions: Problem → Analysis tool used → Solution
5. Always mention the specific utility, command, or technique by name

💡 ANSWER STRATEGY:
- KNOWLEDGE BASE answers take TOP PRIORITY - use them verbatim when relevant
- Show deep z/OS understanding - refer to system internals when appropriate
- Mention specific tools: SDSF, File-AID, Xpediter, Abend-AID, SPUFI, QMF
- Reference common abends and how to resolve them (S0C7, S0C4, S322, S806, S913)
- For COBOL: mention paragraph names, WORKING-STORAGE structure, 88-levels

🚫 AVOID:
- Vague answers like "I worked with batch jobs"
- Confusing COBOL with other languages syntax
- Mixing up JCL parameters
- Generic programming answers that don't show mainframe depth

✅ MAINFRAME ANSWER PATTERNS:
- "For [problem], I use [specific utility/command] because [technical reason]"
- "The SQLCODE -[number] indicates [issue], so I would check [solution]"
- "In COBOL, I handle this using [technique] in the [division/section]"
- "The JCL COND parameter [value] means [explanation], so [result]"
- "For VSAM, I'd use IDCAMS [command] with [parameters]"
`;

  // Add RAG context if available - THIS IS TOP PRIORITY
  if (ragContext) {
    systemPrompt += `
═══════════════════════════════════════
📚 YOUR KNOWLEDGE BASE (USE THIS FIRST!):
${ragContext}
═══════════════════════════════════════
`;
  }

  systemPrompt += `
═══════════════════════════════════════
🎤 INTERVIEWER JUST ASKED:
${payload.recentCaptions}
═══════════════════════════════════════

Generate the IDEAL spoken answer now. Be concise, confident, and specific.
If knowledge base has relevant info, weave it in naturally.
  `;

  try {
    let response;

    switch (provider) {
      case "pollinations":
        response = await callPollinations(systemPrompt, model);
        break;
      case "gemini":
        response = await callGemini(apiKey, model, systemPrompt);
        break;
      case "openrouter":
        response = await callOpenRouter(apiKey, model, systemPrompt);
        break;
      case "groq":
        response = await callGroq(apiKey, model, systemPrompt);
        break;
      case "openai":
      default:
        response = await callOpenAI(apiKey, model, systemPrompt);
        break;
    }

    // Add RAG indicator to response
    if (ragContext && response.text) {
      response.usedRag = true;
    }

    sendResponse(response);
  } catch (err) {
    sendResponse({ error: `Network Error: ${err.message}` });
  }
}

// ==================== AI Provider Calls ====================

async function callPollinations(systemPrompt, model) {
  const encodedPrompt = encodeURIComponent(systemPrompt);
  const url = `https://text.pollinations.ai/${encodedPrompt}?model=${model}`;

  const response = await fetch(url, {
    method: "GET",
    headers: { "Accept": "text/plain" }
  });

  if (!response.ok) {
    return { error: `Pollinations Error: ${response.status} ${response.statusText}` };
  }

  const text = await response.text();
  return { text: text };
}

async function callOpenAI(apiKey, model, systemPrompt) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [{ role: "system", content: systemPrompt }]
    })
  });

  const data = await response.json();

  if (data.error) {
    return { error: "OpenAI Error: " + data.error.message };
  }
  return { text: data.choices[0].message.content };
}

async function callGemini(apiKey, model, systemPrompt) {
  // Strip 'models/' prefix if present since URL already includes it
  const modelName = model.replace(/^models\//, '');
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: systemPrompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
    })
  });

  const data = await response.json();

  if (data.error) {
    return { error: "Gemini Error: " + data.error.message };
  }

  if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
    return { text: data.candidates[0].content.parts[0].text };
  }

  return { error: "Gemini: No response generated" };
}

async function callOpenRouter(apiKey, model, systemPrompt) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": chrome.runtime.getURL(""),
      "X-Title": "AI Interview Coach"
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: "system", content: "You are an expert interview coach. Answer concisely and professionally." },
        { role: "user", content: systemPrompt }
      ]
    })
  });

  const data = await response.json();

  if (data.error) {
    return { error: "OpenRouter Error: " + (data.error.message || JSON.stringify(data.error)) };
  }

  if (data.choices && data.choices[0]?.message?.content) {
    return { text: data.choices[0].message.content };
  }

  return { error: "OpenRouter: No response generated" };
}

async function callGroq(apiKey, model, systemPrompt) {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [{ role: "system", content: systemPrompt }]
    })
  });

  const data = await response.json();

  if (data.error) {
    return { error: "Groq Error: " + data.error.message };
  }
  return { text: data.choices[0].message.content };
}

// ==================== Cloud Sync Functions ====================

// Cloud sync configuration
const CLOUD_CONFIG = {
  FIREBASE_CONFIG_URL: chrome.runtime.getURL('src/utils/firebase-config.js')
};

// Dynamic import helper for ES modules
async function loadCloudDB() {
  try {
    const module = await import(chrome.runtime.getURL('src/utils/cloud-db.js'));
    return module.CloudDB;
  } catch (err) {
    console.log("CloudDB module not available:", err);
    return null;
  }
}

async function handleCloudHealth(sendResponse) {
  try {
    const CloudDB = await loadCloudDB();
    if (!CloudDB) {
      sendResponse({ success: false, status: "not_configured", message: "Cloud module not loaded" });
      return;
    }

    const result = await CloudDB.healthCheck();
    sendResponse(result);
  } catch (err) {
    sendResponse({ success: false, status: "error", message: err.message });
  }
}

async function handleCloudSyncAll(sendResponse) {
  try {
    const CloudDB = await loadCloudDB();
    if (!CloudDB) {
      sendResponse({ success: false, error: "Cloud module not loaded" });
      return;
    }

    // Get documents from local RAG server
    let localDocs = [];
    try {
      const response = await fetch(`${RAG_CONFIG.SERVER_URL}/documents`);
      if (response.ok) {
        const data = await response.json();
        localDocs = data.documents || [];
      }
    } catch (err) {
      console.log("Local server not available, syncing from cloud only");
    }

    // Sync each document to cloud
    let syncedCount = 0;
    for (const doc of localDocs) {
      try {
        // Get full document content
        const fullDoc = await fetch(`${RAG_CONFIG.SERVER_URL}/documents/${encodeURIComponent(doc.title)}`);
        if (fullDoc.ok) {
          const docData = await fullDoc.json();
          await CloudDB.saveDocument(doc.title, docData.content || '', docData.chunks || []);
          syncedCount++;
        }
      } catch (err) {
        console.log(`Failed to sync document ${doc.title}:`, err);
      }
    }

    sendResponse({ success: true, documents: syncedCount });
  } catch (err) {
    sendResponse({ success: false, error: err.message });
  }
}