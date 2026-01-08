/* src/content/sidebar.js */

const Sidebar = {
  isHidden: false, // Stealth mode flag
  sidebarHtml: null, // Cache the HTML for re-injection

  init() {
    // Load the HTML for the sidebar
    const url = chrome.runtime.getURL('src/content/sidebar.html');
    fetch(url)
      .then(response => response.text())
      .then(html => {
        this.sidebarHtml = html; // Cache for potential re-injection
        this.injectSidebar();
        this.startPresenceCheck();
      });
  },

  // Inject the sidebar HTML into the page
  injectSidebar() {
    // Remove existing if present (to avoid duplicates)
    const existingLauncher = document.getElementById('sc-launcher');
    const existingWidget = document.getElementById('sc-widget');
    if (existingLauncher) existingLauncher.remove();
    if (existingWidget) existingWidget.remove();

    document.body.insertAdjacentHTML('beforeend', this.sidebarHtml);
    this.attachListeners();
    this.makeWidgetDraggable();
    this.makeLauncherDraggable();
    this.loadPosition();
    this.setupStealthMode();
  },

  // Periodically check if launcher is still in the DOM
  startPresenceCheck() {
    // Check every 2 seconds
    setInterval(() => {
      this.ensureLauncherPresence();
    }, 2000);

    // Also check on visibility change (when tab becomes active)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        setTimeout(() => this.ensureLauncherPresence(), 500);
      }
    });
  },

  // Ensure launcher button exists in the DOM
  ensureLauncherPresence() {
    const launcher = document.getElementById('sc-launcher');
    const widget = document.getElementById('sc-widget');

    // If launcher is missing and we're not in stealth mode, re-inject
    if (!launcher && !this.isHidden && this.sidebarHtml) {
      console.log('🔄 Sales Coach: Launcher missing, re-injecting...');
      this.injectSidebar();
    }

    // If widget is missing but launcher exists, that's also a problem
    if (launcher && !widget && this.sidebarHtml) {
      console.log('🔄 Sales Coach: Widget missing, re-injecting...');
      this.injectSidebar();
    }
  },

  // Setup stealth mode - hide when screen sharing
  setupStealthMode() {
    const widget = document.getElementById('sc-widget');
    const launcher = document.getElementById('sc-launcher');

    // Keyboard shortcut: Escape to hide/show
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.toggleStealth();
      }
    });

    // Double-click launcher to toggle stealth
    launcher.addEventListener('dblclick', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.toggleStealth();
    });

    // Detect screen sharing by watching for Google Meet's presentation mode
    const observer = new MutationObserver(() => {
      this.checkScreenSharing();
    });

    // Observe body for screen share UI changes
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true
    });

    // Initial check
    setTimeout(() => this.checkScreenSharing(), 2000);
  },

  checkScreenSharing() {
    // Detect if user is presenting (Google Meet specific selectors)
    const isPresentingIndicators = [
      '[data-is-presenting="true"]',
      '[aria-label*="presenting"]',
      '[aria-label*="Stop sharing"]',
      '[aria-label*="You are presenting"]',
      '.screen-share-active'
    ];

    const isPresenting = isPresentingIndicators.some(selector =>
      document.querySelector(selector) !== null
    );

    // Auto-hide when presenting
    if (isPresenting && !this.isHidden) {
      this.enableStealth();
    }
  },

  toggleStealth() {
    if (this.isHidden) {
      this.disableStealth();
    } else {
      this.enableStealth();
    }
  },

  enableStealth() {
    const widget = document.getElementById('sc-widget');
    const launcher = document.getElementById('sc-launcher');

    widget.style.display = 'none';
    launcher.style.display = 'none';
    this.isHidden = true;

    console.log('🙈 Stealth mode ON - Press Escape to show');
  },

  disableStealth() {
    const widget = document.getElementById('sc-widget');
    const launcher = document.getElementById('sc-launcher');

    widget.style.display = '';  // Restore widget display
    launcher.style.display = 'flex';
    this.isHidden = false;

    console.log('👁️ Stealth mode OFF');
  },


  // Save widget position to storage
  savePosition() {
    const widget = document.getElementById('sc-widget');
    const launcher = document.getElementById('sc-launcher');

    const position = {
      widget: {
        left: widget.style.left,
        top: widget.style.top,
        width: widget.style.width,
        height: widget.style.height
      },
      launcher: {
        left: launcher.style.left,
        top: launcher.style.top
      }
    };

    localStorage.setItem('sc-position', JSON.stringify(position));
  },

  // Load widget position from storage
  loadPosition() {
    const saved = localStorage.getItem('sc-position');
    if (!saved) return;

    try {
      const position = JSON.parse(saved);
      const widget = document.getElementById('sc-widget');
      const launcher = document.getElementById('sc-launcher');

      if (position.widget) {
        if (position.widget.left) widget.style.left = position.widget.left;
        if (position.widget.top) widget.style.top = position.widget.top;
        if (position.widget.width) widget.style.width = position.widget.width;
        if (position.widget.height) widget.style.height = position.widget.height;
        widget.style.right = 'auto';
        widget.style.bottom = 'auto';
      }

      if (position.launcher) {
        if (position.launcher.left) launcher.style.left = position.launcher.left;
        if (position.launcher.top) launcher.style.top = position.launcher.top;
        launcher.style.right = 'auto';
        launcher.style.bottom = 'auto';
      }
    } catch (e) {
      console.log('Failed to load position:', e);
    }
  },

  // Make the widget draggable by its header
  makeWidgetDraggable() {
    const widget = document.getElementById('sc-widget');
    const header = document.getElementById('sc-drag-handle');

    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

    header.addEventListener('mousedown', (e) => {
      // Ignore if clicking on buttons
      if (e.target.tagName === 'BUTTON') return;

      isDragging = true;
      widget.classList.add('dragging');

      startX = e.clientX;
      startY = e.clientY;

      const rect = widget.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;

      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      let newLeft = initialLeft + dx;
      let newTop = initialTop + dy;

      // Keep within viewport bounds
      const maxLeft = window.innerWidth - widget.offsetWidth;
      const maxTop = window.innerHeight - widget.offsetHeight;

      newLeft = Math.max(0, Math.min(newLeft, maxLeft));
      newTop = Math.max(0, Math.min(newTop, maxTop));

      widget.style.left = `${newLeft}px`;
      widget.style.top = `${newTop}px`;
      widget.style.right = 'auto';
      widget.style.bottom = 'auto';
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        widget.classList.remove('dragging');
        this.savePosition();
      }
    });
  },

  // Make launcher button draggable
  makeLauncherDraggable() {
    const launcher = document.getElementById('sc-launcher');
    const widget = document.getElementById('sc-widget');

    let isDragging = false;
    let hasMoved = false;
    let startX, startY, initialLeft, initialTop;

    launcher.addEventListener('mousedown', (e) => {
      isDragging = true;
      hasMoved = false;

      startX = e.clientX;
      startY = e.clientY;

      const rect = launcher.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;

      launcher.style.cursor = 'grabbing';
      launcher.style.transition = 'none';

      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        hasMoved = true;
      }

      let newLeft = initialLeft + dx;
      let newTop = initialTop + dy;

      // Keep within viewport
      const maxLeft = window.innerWidth - launcher.offsetWidth;
      const maxTop = window.innerHeight - launcher.offsetHeight;

      newLeft = Math.max(0, Math.min(newLeft, maxLeft));
      newTop = Math.max(0, Math.min(newTop, maxTop));

      launcher.style.left = `${newLeft}px`;
      launcher.style.top = `${newTop}px`;
      launcher.style.right = 'auto';
      launcher.style.bottom = 'auto';
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        launcher.style.cursor = 'pointer';
        launcher.style.transition = 'all 0.2s ease';

        if (hasMoved) {
          this.savePosition();
        }
      }
    });

    // Store hasMoved state for click handler
    launcher.addEventListener('click', (e) => {
      if (hasMoved) {
        hasMoved = false;
        e.stopPropagation();
        return;
      }
      this.toggleWidget();
    });
  },

  toggleWidget() {
    const widget = document.getElementById('sc-widget');
    const launcher = document.getElementById('sc-launcher');

    if (!widget.classList.contains('visible')) {
      // Position widget near launcher if no saved position
      if (!widget.style.left || widget.style.left === 'auto') {
        const rect = launcher.getBoundingClientRect();
        let leftPos = rect.left - 270;
        let topPos = rect.top - 430;

        // Keep on screen
        leftPos = Math.max(10, Math.min(leftPos, window.innerWidth - 330));
        topPos = Math.max(10, Math.min(topPos, window.innerHeight - 440));

        widget.style.left = `${leftPos}px`;
        widget.style.top = `${topPos}px`;
        widget.style.right = 'auto';
        widget.style.bottom = 'auto';
      }
    }

    widget.classList.toggle('visible');
  },

  attachListeners() {
    const widget = document.getElementById('sc-widget');
    const closeBtn = document.getElementById('sc-close');
    const minimizeBtn = document.getElementById('sc-minimize');
    const clearBtn = document.getElementById('sc-clear');
    const triggerBtn = document.getElementById('sc-trigger-btn');
    const historyDiv = document.getElementById('sc-history');

    // Close widget
    closeBtn.addEventListener('click', () => {
      widget.classList.remove('visible');
    });

    // Minimize widget
    minimizeBtn.addEventListener('click', () => {
      widget.classList.toggle('minimized');
      minimizeBtn.textContent = widget.classList.contains('minimized') ? '□' : '─';
    });

    // Clear history
    clearBtn.addEventListener('click', () => {
      historyDiv.innerHTML = `
        <div class="sc-placeholder">
          <div class="sc-placeholder-icon">🗑️</div>
          <div class="sc-placeholder-text">History cleared</div>
          <div class="sc-placeholder-hint">Ready for new conversation</div>
        </div>
      `;
    });

    // MAIN ACTION: Generate Answer
    triggerBtn.addEventListener('click', () => {
      const captions = window.captionGrabber ? window.captionGrabber.getRecentCaptions() : '';

      console.log("FINAL PROMPT SENT TO AI:\n", captions);

      if (!captions || captions.trim().length < 2) {
        this.addMessage("⚠️ Can't read captions yet. Wait for someone to speak.", "error");
        return;
      }

      triggerBtn.disabled = true;
      triggerBtn.innerHTML = '<span class="sc-spinner"></span><span>Thinking...</span>';

      chrome.runtime.sendMessage({
        action: "GENERATE_RESPONSE",
        payload: { recentCaptions: captions }
      }, (response) => {
        triggerBtn.disabled = false;
        triggerBtn.innerHTML = '<span class="btn-icon">⚡</span><span>Generate Answer</span>';

        if (chrome.runtime.lastError) {
          this.addMessage("Error: Please refresh the page.", "error");
          return;
        }

        if (response.error) {
          this.addMessage(response.error, "error");
        } else {
          // Add RAG indicator if knowledge base was used
          const prefix = response.usedRag ? '📚 ' : '';
          this.addMessage(prefix + response.text, response.usedRag ? "rag" : "normal");
        }
      });
    });

    // Update provider name display
    this.updateProviderDisplay();
  },

  async updateProviderDisplay() {
    try {
      const settings = await chrome.storage.local.get(['provider', 'model']);
      const providerName = document.getElementById('sc-provider-name');
      if (providerName && settings.provider) {
        const providers = {
          pollinations: 'Pollinations',
          openai: 'OpenAI',
          gemini: 'Gemini',
          openrouter: 'OpenRouter',
          groq: 'Groq'
        };
        providerName.textContent = providers[settings.provider] || 'Ready';
      }
    } catch (e) {
      console.log('Could not load provider:', e);
    }
  },

  addMessage(text, type = "normal") {
    const historyDiv = document.getElementById('sc-history');
    const placeholder = historyDiv.querySelector('.sc-placeholder');
    if (placeholder) placeholder.remove();

    const div = document.createElement('div');
    div.className = `sc-msg ${type}`;
    div.innerText = text;

    historyDiv.prepend(div);
  }
};

window.Sidebar = Sidebar;