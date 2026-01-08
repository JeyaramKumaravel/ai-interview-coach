document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements
  const providerSelect = document.getElementById('provider');
  const modelSelect = document.getElementById('model');
  const apiKeySection = document.getElementById('apiKeySection');
  const apiKeyInput = document.getElementById('apiKey');
  const toggleKeyBtn = document.getElementById('toggleKey');
  const keyHint = document.getElementById('keyHint');
  const promptInput = document.getElementById('prompt');
  const saveBtn = document.getElementById('saveBtn');
  const testBtn = document.getElementById('testBtn');
  const status = document.getElementById('status');
  const connectionStatus = document.getElementById('connectionStatus');
  const connectionDot = connectionStatus.querySelector('.dot');
  const connectionText = connectionStatus.querySelector('span:last-child');

  // RAG Elements
  const ragEnabled = document.getElementById('ragEnabled');
  const ragStatus = document.getElementById('ragStatus');
  const ragStatusText = document.getElementById('ragStatusText');
  const docTitle = document.getElementById('docTitle');
  const docContent = document.getElementById('docContent');
  const addDocBtn = document.getElementById('addDocBtn');
  const docList = document.getElementById('docList');
  const docCount = document.getElementById('docCount');
  const fileInput = document.getElementById('fileInput');
  const uploadBtn = document.getElementById('uploadBtn');
  const fileName = document.getElementById('fileName');

  // Embedding provider elements
  const embeddingProvider = document.getElementById('embeddingProvider');
  const googleKeySection = document.getElementById('googleKeySection');
  const googleApiKey = document.getElementById('googleApiKey');
  const toggleGoogleKey = document.getElementById('toggleGoogleKey');

  // Load saved settings
  const settings = await StorageUtils.getSettings();
  const { apiKey, prompt, tone, provider, model } = settings;

  // Initialize UI
  providerSelect.value = provider;
  updateModelOptions(provider, model);
  updateKeyVisibility(provider);
  apiKeyInput.value = apiKey;
  promptInput.value = prompt;

  // Load RAG enabled state
  const ragSettings = await chrome.storage.local.get(['ragEnabled']);
  ragEnabled.checked = ragSettings.ragEnabled !== false;

  // Set tone radio button
  const toneRadio = document.getElementById(`tone-${tone.toLowerCase()}`);
  if (toneRadio) toneRadio.checked = true;

  // Check RAG server status and load embedding settings
  checkRagStatus();
  loadDocuments();
  loadEmbeddingSettings();

  // Provider change handler
  providerSelect.addEventListener('change', () => {
    const selectedProvider = providerSelect.value;
    const providerConfig = CONSTANTS.PROVIDERS[selectedProvider];
    updateModelOptions(selectedProvider, providerConfig.defaultModel);
    updateKeyVisibility(selectedProvider);
    hideStatus();
    updateConnectionIndicator('ready');
  });

  // Toggle password visibility
  toggleKeyBtn.addEventListener('click', () => {
    const isPassword = apiKeyInput.type === 'password';
    apiKeyInput.type = isPassword ? 'text' : 'password';
    toggleKeyBtn.textContent = isPassword ? '🙈' : '👁️';
  });

  // RAG Toggle
  ragEnabled.addEventListener('change', async () => {
    await chrome.storage.local.set({ ragEnabled: ragEnabled.checked });
  });

  // Embedding Provider Toggle
  embeddingProvider.addEventListener('change', async () => {
    updateGoogleKeyVisibility();
    await saveEmbeddingSettings();
  });

  // Toggle Google API key visibility
  toggleGoogleKey.addEventListener('click', () => {
    const isPassword = googleApiKey.type === 'password';
    googleApiKey.type = isPassword ? 'text' : 'password';
    toggleGoogleKey.textContent = isPassword ? '🙈' : '👁️';
  });

  // Save Google API key on blur
  googleApiKey.addEventListener('blur', async () => {
    await saveEmbeddingSettings();
  });

  // File Upload Button
  uploadBtn.addEventListener('click', () => {
    fileInput.click();
  });

  // File Input Handler
  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    fileName.textContent = 'Reading...';
    fileName.className = 'file-name';

    try {
      const content = await readFileContent(file);

      // Set title from filename (without extension)
      const title = file.name.replace(/\.[^/.]+$/, '');
      if (!docTitle.value) {
        docTitle.value = title;
      }

      docContent.value = content;
      fileName.textContent = `✓ ${file.name}`;
      fileName.className = 'file-name success';
    } catch (err) {
      fileName.textContent = `Error: ${err.message}`;
      fileName.className = 'file-name';
      showStatus(`❌ Failed to read file: ${err.message}`, 'error');
    }

    // Reset file input
    fileInput.value = '';
  });

  // Read file content based on type
  async function readFileContent(file) {
    const extension = file.name.split('.').pop().toLowerCase();

    // Files that need server-side extraction
    const serverExtract = ['pdf', 'docx', 'pptx'];

    if (serverExtract.includes(extension)) {
      return await extractFileContent(file, extension);
    } else {
      // For text files (.txt, .md), read directly
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
      });
    }
  }

  // Extract file content via server
  async function extractFileContent(file, type) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`http://localhost:8000/extract-file`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `${type.toUpperCase()} extraction failed`);
    }

    const data = await response.json();
    return data.content;
  }

  // Update model dropdown based on provider
  function updateModelOptions(provider, selectedModel) {
    const providerConfig = CONSTANTS.PROVIDERS[provider];
    modelSelect.innerHTML = '';

    providerConfig.models.forEach(m => {
      const option = document.createElement('option');
      option.value = m;
      option.textContent = m;
      if (m === selectedModel) option.selected = true;
      modelSelect.appendChild(option);
    });
  }

  // Show/hide API key based on provider
  function updateKeyVisibility(provider) {
    const providerConfig = CONSTANTS.PROVIDERS[provider];

    if (providerConfig.requiresKey) {
      apiKeySection.style.display = 'flex';
      keyHint.textContent = `Starts with: ${providerConfig.keyPrefix}...`;
    } else {
      apiKeySection.style.display = 'none';
      keyHint.textContent = '';
    }
  }

  // Status helper functions
  function showStatus(message, type) {
    status.textContent = message;
    status.className = `status show ${type}`;
  }

  function hideStatus() {
    status.className = 'status';
  }

  // Connection indicator
  function updateConnectionIndicator(state, message) {
    connectionDot.className = 'dot';

    switch (state) {
      case 'success':
        connectionDot.classList.add('success');
        connectionText.textContent = message || 'Connected';
        break;
      case 'error':
        connectionDot.classList.add('error');
        connectionText.textContent = message || 'Error';
        break;
      case 'loading':
        connectionDot.classList.add('warning');
        connectionText.textContent = message || 'Testing...';
        break;
      default:
        connectionText.textContent = 'Ready';
    }
  }

  // Get selected tone
  function getSelectedTone() {
    const selected = document.querySelector('input[name="tone"]:checked');
    return selected ? selected.value : 'Direct';
  }

  // ==================== RAG Functions ====================

  // Show/hide Google API key based on selected provider
  function updateGoogleKeyVisibility() {
    if (embeddingProvider.value === 'google') {
      googleKeySection.style.display = 'flex';
    } else {
      googleKeySection.style.display = 'none';
    }
  }

  // Load embedding settings from server
  async function loadEmbeddingSettings() {
    try {
      const response = await fetch('http://localhost:8000/settings/embedding');
      if (response.ok) {
        const data = await response.json();
        embeddingProvider.value = data.provider || 'ollama';
        updateGoogleKeyVisibility();

        // Load Google API key from local storage
        const stored = await chrome.storage.local.get(['googleEmbeddingKey']);
        if (stored.googleEmbeddingKey) {
          googleApiKey.value = stored.googleEmbeddingKey;
        }
      }
    } catch (err) {
      console.log('Could not load embedding settings:', err);
    }
  }

  // Save embedding settings to server
  async function saveEmbeddingSettings() {
    try {
      const key = googleApiKey.value.trim();

      // Save key to local storage
      await chrome.storage.local.set({ googleEmbeddingKey: key });

      // Send settings to server
      const response = await fetch('http://localhost:8000/settings/embedding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: embeddingProvider.value,
          google_api_key: key
        })
      });

      if (response.ok) {
        showStatus(`✅ Embedding provider set to ${embeddingProvider.value}`, 'success');
        setTimeout(hideStatus, 2000);
      }
    } catch (err) {
      showStatus(`❌ Failed to save embedding settings`, 'error');
    }
  }

  async function checkRagStatus() {
    try {
      const response = await chrome.runtime.sendMessage({ action: "RAG_HEALTH" });

      if (response.success) {
        ragStatus.className = 'rag-status connected';
        const embeddingInfo = response.embedding_provider ? ` • ${response.embedding_provider}` : '';
        ragStatusText.textContent = `Server running • ${response.documents || 0} chunks${embeddingInfo}`;
      } else {
        ragStatus.className = 'rag-status error';
        ragStatusText.textContent = 'Server offline';
      }
    } catch (err) {
      ragStatus.className = 'rag-status error';
      ragStatusText.textContent = 'Server offline';
    }
  }

  async function loadDocuments() {
    try {
      const response = await chrome.runtime.sendMessage({ action: "RAG_GET_DOCUMENTS" });

      if (response.success && response.documents) {
        docCount.textContent = response.documents.length;
        renderDocuments(response.documents);
      } else {
        docCount.textContent = '0';
        renderDocuments([]);
      }
    } catch (err) {
      docCount.textContent = '0';
      renderDocuments([]);
    }
  }

  function renderDocuments(documents) {
    if (!documents || documents.length === 0) {
      docList.innerHTML = '<div class="doc-empty">No documents yet. Add your first one!</div>';
      return;
    }

    docList.innerHTML = documents.map(doc => `
      <div class="doc-item" data-title="${doc.title}">
        <div class="doc-item-info">
          <span class="doc-item-title">📄 ${doc.title}</span>
          <span class="doc-item-chunks">${doc.chunks} chunks</span>
        </div>
        <button class="doc-delete-btn" title="Delete">🗑️</button>
      </div>
    `).join('');

    // Add delete handlers
    docList.querySelectorAll('.doc-delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const item = e.target.closest('.doc-item');
        const title = item.dataset.title;

        if (confirm(`Delete "${title}"?`)) {
          btn.textContent = '⏳';
          const response = await chrome.runtime.sendMessage({
            action: "RAG_DELETE_DOCUMENT",
            payload: { title }
          });

          if (response.success) {
            loadDocuments();
            checkRagStatus();
          } else {
            btn.textContent = '❌';
            showStatus(`Failed to delete: ${response.error}`, 'error');
          }
        }
      });
    });
  }

  // Add document handler
  addDocBtn.addEventListener('click', async () => {
    const title = docTitle.value.trim();
    const content = docContent.value.trim();

    if (!title) {
      showStatus('⚠️ Please enter a document title', 'error');
      return;
    }

    if (!content || content.length < 10) {
      showStatus('⚠️ Please enter document content (at least 10 characters)', 'error');
      return;
    }

    // Disable and show loading
    addDocBtn.disabled = true;
    const originalContent = addDocBtn.innerHTML;
    addDocBtn.innerHTML = '<span class="loading-spinner"></span><span>Adding...</span>';

    try {
      const response = await chrome.runtime.sendMessage({
        action: "RAG_ADD_DOCUMENT",
        payload: { title, content }
      });

      if (response.success) {
        showStatus(`✅ Added "${title}" (${response.chunks} chunks)`, 'success');
        docTitle.value = '';
        docContent.value = '';
        loadDocuments();
        checkRagStatus();

        setTimeout(hideStatus, 3000);
      } else {
        showStatus(`❌ ${response.error}`, 'error');
      }
    } catch (err) {
      showStatus(`❌ Failed to add document: ${err.message}`, 'error');
    } finally {
      addDocBtn.disabled = false;
      addDocBtn.innerHTML = originalContent;
    }
  });

  // ==================== Test Connection ====================

  testBtn.addEventListener('click', async () => {
    const selectedProvider = providerSelect.value;
    const selectedModel = modelSelect.value;
    const currentApiKey = apiKeyInput.value.trim();
    const providerConfig = CONSTANTS.PROVIDERS[selectedProvider];

    if (providerConfig.requiresKey && !currentApiKey) {
      showStatus('⚠️ Please enter an API key first', 'error');
      updateConnectionIndicator('error', 'No Key');
      return;
    }

    testBtn.disabled = true;
    saveBtn.disabled = true;
    const originalBtnContent = testBtn.innerHTML;
    testBtn.innerHTML = '<span class="loading-spinner"></span><span>Testing...</span>';

    showStatus(`🔄 Testing connection to ${providerConfig.name}...`, 'loading');
    updateConnectionIndicator('loading');

    try {
      const response = await chrome.runtime.sendMessage({
        action: "TEST_CONNECTION",
        payload: {
          provider: selectedProvider,
          model: selectedModel,
          apiKey: currentApiKey
        }
      });

      if (response.success) {
        showStatus(`✅ ${providerConfig.name} is working!`, 'success');
        updateConnectionIndicator('success', 'Connected');
        setTimeout(hideStatus, 3000);
      } else {
        showStatus(`❌ ${response.error || 'Connection failed'}`, 'error');
        updateConnectionIndicator('error', 'Failed');
      }
    } catch (err) {
      showStatus(`❌ Error: ${err.message}`, 'error');
      updateConnectionIndicator('error', 'Error');
    } finally {
      testBtn.disabled = false;
      saveBtn.disabled = false;
      testBtn.innerHTML = originalBtnContent;
    }
  });

  // ==================== Save Settings ====================

  saveBtn.addEventListener('click', async () => {
    const newSettings = {
      apiKey: apiKeyInput.value.trim(),
      prompt: promptInput.value.trim(),
      tone: getSelectedTone(),
      provider: providerSelect.value,
      model: modelSelect.value,
      ragEnabled: ragEnabled.checked
    };

    saveBtn.disabled = true;
    const originalBtnContent = saveBtn.innerHTML;
    saveBtn.innerHTML = '<span class="loading-spinner"></span><span>Saving...</span>';

    await StorageUtils.saveSettings(newSettings);

    saveBtn.innerHTML = '<span class="btn-icon">✅</span><span>Saved!</span>';
    showStatus('✅ Settings saved!', 'success');

    setTimeout(() => {
      saveBtn.disabled = false;
      saveBtn.innerHTML = originalBtnContent;
      hideStatus();
    }, 1500);
  });

  // Animate cards on load
  document.querySelectorAll('.card').forEach((card, index) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(10px)';
    setTimeout(() => {
      card.style.transition = 'all 0.3s ease';
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, 100 + (index * 100));
  });
});