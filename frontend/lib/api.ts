// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// WebSocket Configuration
const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';

// API Service Class
class HydraSkriptAPI {
  private token: string | null = null;
  private ws: WebSocket | null = null;
  private wsReconnectInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.loadToken();
    this.setupWebSocket();
  }

  // Authentication
  private loadToken() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('hydraToken');
    }
  }

  private setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('hydraToken', token);
    }
  }

  private removeToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('hydraToken');
    }
  }

  // HTTP Requests
  private async request(endpoint: string, options: RequestInit = {}) {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers
    });

    if (!response.ok) {
      if (response.status === 401) {
        this.removeToken();
        this.disconnectWebSocket();
        throw new Error('Authentication required');
      }
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  }

  // Authentication Methods
  async register(email: string, password: string, name: string) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name })
    });
    
    if (data.token) {
      this.setToken(data.token);
      this.setupWebSocket();
    }
    
    return data;
  }

  async login(email: string, password: string) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    
    if (data.token) {
      this.setToken(data.token);
      this.setupWebSocket();
    }
    
    return data;
  }

  async getProfile() {
    return this.request('/auth/profile');
  }

  async logout() {
    this.removeToken();
    this.disconnectWebSocket();
  }

  // Generation Methods
  async generateBook(params: {
    title: string;
    genre: string;
    targetLength: number;
    universeId: string;
    styleId?: string;
  }) {
    return this.request('/generate/book', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  }

  async generateChapter(params: {
    bookId: string;
    chapterIndex: number;
    prompt: string;
    context?: string;
  }) {
    return this.request('/generate/chapter', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  }

  async trainStyle(params: {
    trainingData: string;
  }) {
    return this.request('/generate/style', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  }

  // Queue Methods
  async getQueueStatus(taskId: string) {
    return this.request(`/queue/status/${taskId}`);
  }

  async getActiveTasks() {
    return this.request('/queue/active');
  }

  async getQueueHistory(page: number = 1, limit: number = 10) {
    return this.request(`/queue/history?page=${page}&limit=${limit}`);
  }

  async cancelTask(taskId: string) {
    return this.request(`/queue/cancel/${taskId}`, {
      method: 'POST'
    });
  }

  // Credit Methods
  async getCreditBalance() {
    return this.request('/credits/balance');
  }

  async purchaseCredits(amount: number, paymentMethodId: string) {
    return this.request('/credits/purchase', {
      method: 'POST',
      body: JSON.stringify({ amount, paymentMethodId })
    });
  }

  async getSubscriptionTiers() {
    return this.request('/credits/tiers');
  }

  async upgradeSubscription(tier: string) {
    return this.request('/credits/upgrade', {
      method: 'POST',
      body: JSON.stringify({ tier })
    });
  }

  // Media Methods
  async generateAudiobook(params: {
    bookId: string;
    voice: string;
    speed: number;
  }) {
    return this.request('/media/audiobook', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  }

  async generateCoverArt(params: {
    bookId: string;
    style: string;
    prompt?: string;
  }) {
    return this.request('/media/cover-art', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  }

  async downloadBook(bookId: string, format: 'pdf' | 'epub' | 'audiobook') {
    return this.request(`/media/download/${bookId}/${format}`);
  }

  // WebSocket Methods
  private setupWebSocket() {
    if (!this.token) return;

    try {
      this.ws = new WebSocket(WS_BASE_URL);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected');
        if (this.ws && this.token) {
          this.ws.send(JSON.stringify({
            type: 'authenticate',
            token: this.token
          }));
        }
        
        // Clear reconnection interval if connected
        if (this.wsReconnectInterval) {
          clearInterval(this.wsReconnectInterval);
          this.wsReconnectInterval = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleWebSocketMessage(data);
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.ws = null;
        
        // Attempt reconnection every 5 seconds
        if (!this.wsReconnectInterval) {
          this.wsReconnectInterval = setInterval(() => {
            if (this.token) {
              this.setupWebSocket();
            }
          }, 5000);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

    } catch (error) {
      console.error('WebSocket setup error:', error);
    }
  }

  private disconnectWebSocket() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    if (this.wsReconnectInterval) {
      clearInterval(this.wsReconnectInterval);
      this.wsReconnectInterval = null;
    }
  }

  private handleWebSocketMessage(data: any) {
    // Dispatch custom events for frontend components
    if (data.type === 'generation_update') {
      window.dispatchEvent(new CustomEvent('generationUpdate', { detail: data }));
    } else if (data.type === 'generation_completed') {
      window.dispatchEvent(new CustomEvent('generationCompleted', { detail: data }));
    } else if (data.type === 'generation_failed') {
      window.dispatchEvent(new CustomEvent('generationFailed', { detail: data }));
    }
  }

  // Utility Methods
  isAuthenticated() {
    return !!this.token;
  }

  getToken() {
    return this.token;
  }
}

// Create singleton instance
export const hydraAPI = new HydraSkriptAPI();

// Export for use in components
export default hydraAPI;