// Update the existing HTML to integrate with backend
// This script should be added to the existing code.html files

// Add this to the head section of existing HTML files
const backendIntegrationScript = `
<script>
// Backend Integration Script
const API_BASE_URL = 'http://localhost:3001/api';
const WS_BASE_URL = 'ws://localhost:3001';

class HydraSkriptFrontend {
  constructor() {
    this.token = localStorage.getItem('hydraToken');
    this.ws = null;
    this.setupWebSocket();
    this.setupEventListeners();
  }

  setupWebSocket() {
    if (!this.token) return;
    
    try {
      this.ws = new WebSocket(WS_BASE_URL);
      
      this.ws.onopen = () => {
        this.ws.send(JSON.stringify({
          type: 'authenticate',
          token: this.token
        }));
      };

      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        this.handleWebSocketMessage(data);
      };

      this.ws.onclose = () => {
        setTimeout(() => this.setupWebSocket(), 5000);
      };
    } catch (error) {
      console.error('WebSocket setup error:', error);
    }
  }

  handleWebSocketMessage(data) {
    if (data.type === 'generation_update') {
      this.updateProgressBar(data);
    } else if (data.type === 'generation_completed') {
      this.showCompletionNotification(data);
    }
  }

  setupEventListeners() {
    // Generate button integration
    document.addEventListener('click', (e) => {
      if (e.target.closest('button')?.textContent?.includes('Generate')) {
        e.preventDefault();
        this.handleGenerateClick(e.target.closest('button'));
      }
    });

    // Credit display updates
    this.updateCreditDisplay();
  }

  async handleGenerateClick(button) {
    const buttonText = button.textContent;
    const originalText = button.innerHTML;
    
    try {
      button.innerHTML = '<span class="material-symbols-outlined animate-spin">refresh</span> Generating...';
      button.disabled = true;

      let result;
      
      if (buttonText.includes('Ask AI to Write')) {
        result = await this.generateChapterContinuation();
      } else if (buttonText.includes('New Chapter')) {
        result = await this.generateNewChapter();
      } else if (buttonText.includes('Continue')) {
        result = await this.continueStory();
      }

      if (result) {
        this.showSuccessMessage(result.message || 'Generation started!');
        this.updateCreditDisplay();
      }

    } catch (error) {
      this.showErrorMessage(error.message || 'Generation failed');
    } finally {
      button.innerHTML = originalText;
      button.disabled = false;
    }
  }

  async generateChapterContinuation() {
    const response = await fetch(\`\${API_BASE_URL}/generate/chapter\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${this.token}\`
      },
      body: JSON.stringify({
        bookId: this.getCurrentBookId(),
        chapterIndex: this.getCurrentChapterIndex(),
        prompt: 'Continue the current chapter with engaging narrative progression',
        context: this.getCurrentContext()
      })
    });

    if (!response.ok) throw new Error('Failed to generate chapter continuation');
    return response.json();
  }

  async generateNewChapter() {
    const response = await fetch(\`\${API_BASE_URL}/generate/chapter\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${this.token}\`
      },
      body: JSON.stringify({
        bookId: this.getCurrentBookId(),
        chapterIndex: this.getNextChapterIndex(),
        prompt: 'Create a new chapter that advances the story naturally',
        context: this.getStoryContext()
      })
    });

    if (!response.ok) throw new Error('Failed to generate new chapter');
    return response.json();
  }

  async continueStory() {
    const response = await fetch(\`\${API_BASE_URL}/generate/chapter\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${this.token}\`
      },
      body: JSON.stringify({
        bookId: this.getCurrentBookId(),
        chapterIndex: this.getCurrentChapterIndex(),
        prompt: 'Continue the story from where it left off, maintaining narrative flow',
        context: this.getCurrentParagraph()
      })
    });

    if (!response.ok) throw new Error('Failed to continue story');
    return response.json();
  }

  // Helper methods
  getCurrentBookId() {
    // Extract from URL or page data
    return 'book_123'; // Placeholder
  }

  getCurrentChapterIndex() {
    // Extract from current chapter display
    return 2; // Placeholder
  }

  getNextChapterIndex() {
    return this.getCurrentChapterIndex() + 1;
  }

  getCurrentContext() {
    // Extract context from current page content
    return 'Current chapter context';
  }

  getStoryContext() {
    // Extract story-wide context
    return 'Story context from universe';
  }

  getCurrentParagraph() {
    // Get the last paragraph or current selection
    return 'Current paragraph content';
  }

  async updateCreditDisplay() {
    if (!this.token) return;

    try {
      const response = await fetch(\`\${API_BASE_URL}/credits/balance\`, {
        headers: {
          'Authorization': \`Bearer \${this.token}\`
        }
      });

      if (response.ok) {
        const data = await response.json();
        this.displayCreditBalance(data.balance);
      }
    } catch (error) {
      console.error('Failed to update credit display:', error);
    }
  }

  displayCreditBalance(balance) {
    // Update credit display in the UI
    const creditElements = document.querySelectorAll('[data-credit-balance]');
    creditElements.forEach(el => {
      el.textContent = \`Credits: \${balance}\`;
    });
  }

  showSuccessMessage(message) {
    this.showNotification(message, 'success');
  }

  showErrorMessage(message) {
    this.showNotification(message, 'error');
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = \`fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 \${
      type === 'success' ? 'bg-green-500 text-white' :
      type === 'error' ? 'bg-red-500 text-white' :
      'bg-blue-500 text-white'
    }\`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 5000);
  }

  updateProgressBar(data) {
    // Update progress bar in the UI
    const progressBar = document.querySelector('[data-generation-progress]');
    if (progressBar) {
      progressBar.style.width = \`\${data.progress || 0}%\`;
      progressBar.textContent = \`\${data.progress || 0}%\`;
    }
  }

  showCompletionNotification(data) {
    this.showSuccessMessage(\`Generation completed: \${data.taskType}\`);
  }

  // Logic Guard Integration
  async checkLogicGuard() {
    if (!this.token) return;

    try {
      // This would integrate with logic guard API
      const alerts = await this.getLogicGuardAlerts();
      this.displayLogicGuardAlerts(alerts);
    } catch (error) {
      console.error('Logic Guard check failed:', error);
    }
  }

  async getLogicGuardAlerts() {
    // Mock logic guard alerts for now
    return [
      {
        id: '1',
        type: 'Lore Conflict',
        message: 'Character location inconsistency detected',
        severity: 'high'
      }
    ];
  }

  displayLogicGuardAlerts(alerts) {
    // Update logic guard display
    const alertContainer = document.querySelector('[data-logic-guard-alerts]');
    if (alertContainer) {
      alertContainer.innerHTML = alerts.map(alert => \`
        <div class="bg-accent-cyan/5 p-4 rounded-xl border border-accent-cyan/20">
          <div class="flex items-start gap-3">
            <span class="material-symbols-outlined text-accent-cyan">error_outline</span>
            <div class="flex-1">
              <h4 class="text-xs font-bold text-text-light dark:text-white mb-1">\${alert.type}</h4>
              <p class="text-[11px] leading-relaxed text-[#618975] dark:text-[#8ba797]">\${alert.message}</p>
            </div>
          </div>
        </div>
      \`).join('');
    }
  }
}

// Initialize when DOM is ready
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    window.hydraSkript = new HydraSkriptFrontend();
  });
}
</script>
`;

// Export for use in Next.js components
export default backendIntegrationScript;