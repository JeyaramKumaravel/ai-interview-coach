/* src/content/teams-captions.js */
/* Microsoft Teams Caption Grabber */

class CaptionGrabber {
    constructor() {
        this.buffer = [];
        this.isListening = false;
        this.observer = null;
        this.captionNode = null;
        this.platform = 'teams';
    }

    init() {
        console.log("Sales Coach: Initializing Teams Caption Grabber...");
        this.findCaptionContainer();
    }

    findCaptionContainer() {
        // Microsoft Teams caption selectors
        const selectors = [
            // Teams meeting captions panel
            '[data-tid="closed-caption-panel"]',
            '[data-tid="live-captions-container"]',
            '[class*="captions-container"]',
            '[class*="captionsPanel"]',
            // Teams caption text containers
            '.fui-Flex[class*="caption"]',
            '[data-tid="chat-pane-list"]',
            // Teams live captions region
            '[role="log"][aria-label*="caption"]',
            '[role="log"][aria-label*="Caption"]',
            // Fallback: any aria-live region with caption content
            '[aria-live="polite"][class*="caption"]'
        ];

        const checkInterval = setInterval(() => {
            let foundNode = null;

            // 1. Selector Search
            for (const selector of selectors) {
                const el = document.querySelector(selector);
                if (el) {
                    foundNode = el;
                    console.log(`Sales Coach: Found Teams captions via selector: ${selector}`);
                    break;
                }
            }

            // 2. Position + Attribute Search (Fallback)
            if (!foundNode) {
                const allDivs = document.querySelectorAll('div[data-tid], div[role="log"]');
                for (const div of allDivs) {
                    const tid = div.getAttribute('data-tid') || '';
                    const ariaLabel = div.getAttribute('aria-label') || '';

                    if (tid.includes('caption') || ariaLabel.toLowerCase().includes('caption')) {
                        foundNode = div;
                        console.log("Sales Coach: Found Teams captions via attribute scan.");
                        break;
                    }
                }
            }

            // 3. Deep scan for caption-like content in bottom area
            if (!foundNode) {
                const candidateDivs = document.querySelectorAll('div');
                for (const div of candidateDivs) {
                    const rect = div.getBoundingClientRect();
                    // Look for elements at the bottom of the screen
                    if (rect.bottom > window.innerHeight - 250 && rect.width > 200) {
                        const classList = Array.from(div.classList).join(' ').toLowerCase();
                        if (classList.includes('caption') || classList.includes('transcript')) {
                            foundNode = div;
                            console.log("Sales Coach: Found Teams captions via position scan.");
                            break;
                        }
                    }
                }
            }

            if (foundNode) {
                clearInterval(checkInterval);
                this.captionNode = foundNode;
                this.startObserving(foundNode);
            }
        }, 2000); // Check every 2 seconds
    }

    startObserving(targetNode) {
        console.log("Sales Coach: Locked onto Teams captions. Listening...");
        this.isListening = true;

        this.observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                // Process added nodes
                if (mutation.addedNodes.length) {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // Look for caption text elements
                            const textElements = node.querySelectorAll('[data-tid="closed-caption-text"], [class*="caption-text"], span');
                            if (textElements.length > 0) {
                                textElements.forEach(el => {
                                    this.processText(el.textContent);
                                });
                            } else {
                                this.processText(node.innerText || node.textContent);
                            }
                        } else if (node.nodeType === Node.TEXT_NODE) {
                            this.processText(node.textContent);
                        }
                    });
                }
                // Process character data changes
                else if (mutation.type === 'characterData') {
                    this.processText(mutation.target.textContent);
                }
            });
        });

        this.observer.observe(targetNode, {
            childList: true,
            subtree: true,
            characterData: true
        });

        // Also do periodic text extraction as backup
        this.startPeriodicExtraction(targetNode);
    }

    startPeriodicExtraction(targetNode) {
        // Fallback: periodically extract all visible caption text
        setInterval(() => {
            const captionTexts = targetNode.querySelectorAll(
                '[data-tid="closed-caption-text"], [class*="caption-text"], [class*="message-body"]'
            );

            captionTexts.forEach(el => {
                const text = el.textContent?.trim();
                if (text && text.length > 2) {
                    this.processText(text);
                }
            });
        }, 1000);
    }

    processText(rawText) {
        if (!rawText) return;
        const text = rawText.trim();
        if (text.length < 2) return; // Ignore single characters

        // Filter out UI text and timestamps
        if (this.isUIText(text)) return;

        // SMART DEDUPLICATION LOGIC
        if (this.buffer.length > 0) {
            const lastEntry = this.buffer[this.buffer.length - 1];
            const lastText = lastEntry.text;

            // Case A: The new text is an update of the last text
            if (text.startsWith(lastText) || text.includes(lastText)) {
                lastEntry.text = text;
                lastEntry.time = Date.now();
                return;
            }

            // Case B: The old text contains the new text (rare correction)
            if (lastText.includes(text)) {
                return;
            }

            // Case C: Exact Duplicate
            if (lastText === text) return;
        }

        // Case D: It's a brand new sentence
        console.log("Teams Captured:", text);
        this.buffer.push({
            text: text,
            time: Date.now()
        });

        // Keep buffer clean (last 25 items only)
        if (this.buffer.length > 25) this.buffer.shift();
    }

    isUIText(text) {
        // Filter out common Teams UI elements
        const uiPatterns = [
            /^[0-9]{1,2}:[0-9]{2}/, // Timestamps like "10:30"
            /^(AM|PM)$/i,
            /^(Today|Yesterday)$/i,
            /^(Turn on|Turn off|Enable|Disable)/i,
            /^(Mute|Unmute|Share|Stop|Leave|Join)/i,
            /^[A-Z]{2,3}$/, // Initials
            /^Live captions/i,
            /^\.\.\./
        ];

        return uiPatterns.some(pattern => pattern.test(text.trim()));
    }

    getRecentCaptions() {
        // Return text from last 90 seconds
        const now = Date.now();
        const activeLines = this.buffer.filter(item => now - item.time < 90000);

        // Join with newlines
        return activeLines.map(item => item.text).join("\n");
    }
}

window.captionGrabber = new CaptionGrabber();
