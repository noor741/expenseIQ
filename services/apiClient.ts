import { supabase } from '@/lib/supabase';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface ReadyReceiptsResponse {
  receipts: any[];
  count: number;
}

class ExpenseIQApiClient {
  private baseUrl: string;

  constructor() {
    // Use your Supabase project URL + /functions/v1/
    this.baseUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1`;
  }

  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          ...options.headers,
        },
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('API Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  // ==================== GENERIC HTTP METHODS ====================
  
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint);
  }

  async post<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'DELETE',
    });
  }

  // ==================== RECEIPTS API ====================
  
  async getReceipts(params: {
    page?: number;
    limit?: number;
    status?: string;
  } = {}) {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.status) searchParams.set('status', params.status);

    const query = searchParams.toString();
    return this.makeRequest(`/receipts${query ? `?${query}` : ''}`);
  }

  async getReceipt(id: string) {
    return this.makeRequest(`/receipts/${id}`);
  }

  async createReceipt(data: {
    file_url: string;
    status?: string;
    raw_ocr_json?: any;
  }) {
    return this.makeRequest('/receipts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateReceipt(id: string, data: {
    status?: string;
    raw_ocr_json?: any;
    processed_at?: string;
  }) {
    return this.makeRequest(`/receipts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteReceipt(id: string) {
    return this.makeRequest(`/receipts/${id}`, {
      method: 'DELETE',
    });
  }

  // ==================== EXPENSES API ====================
  
  async getExpenses(params: {
    page?: number;
    limit?: number;
    category_id?: string;
    start_date?: string;
    end_date?: string;
    merchant_name?: string;
  } = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) searchParams.set(key, value.toString());
    });

    const query = searchParams.toString();
    return this.makeRequest(`/expenses${query ? `?${query}` : ''}`);
  }

  async getExpense(id: string) {
    return this.makeRequest(`/expenses/${id}`);
  }

  async createExpense(data: {
    receipt_id: string;
    merchant_name?: string;
    transaction_date: string;
    currency?: string; // Default: CAD
    subtotal?: number;
    tax?: number;
    total: number;
    payment_method?: string;
    items?: Array<{
      item_name: string;
      quantity: number;
      unit_price?: number;
      total_price: number;
      category?: string;
    }>;
  }) {
    return this.makeRequest('/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateExpense(id: string, data: {
    merchant_name?: string;
    transaction_date?: string;
    currency?: string;
    subtotal?: number;
    tax?: number;
    total?: number;
    payment_method?: string;
  }) {
    return this.makeRequest(`/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteExpense(id: string) {
    return this.makeRequest(`/expenses/${id}`, {
      method: 'DELETE',
    });
  }

  // ==================== CATEGORIES API ====================
  
  async getCategories() {
    return this.makeRequest('/categories');
  }

  async getCategory(id: string) {
    return this.makeRequest(`/categories/${id}`);
  }

  async createCategory(data: {
    name: string;
    description?: string;
    color?: string;
  }) {
    return this.makeRequest('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCategory(id: string, data: {
    name?: string;
    description?: string;
  }) {
    return this.makeRequest(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCategory(id: string) {
    return this.makeRequest(`/categories/${id}`, {
      method: 'DELETE',
    });
  }

  // ==================== USERS API ====================
  
  async getUserProfile() {
    return this.makeRequest('/users/profile');
  }

  async getUserStats() {
    return this.makeRequest('/users');
  }

  async createUser(data: {
    full_name?: string;
    preferred_name?: string;
    email?: string;
  }) {
    return this.makeRequest('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateUser(data: {
    full_name?: string;
    preferred_name?: string;
    email?: string;
  }) {
    return this.makeRequest('/users', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteUser() {
    return this.makeRequest('/users', {
      method: 'DELETE',
    });
  }

  // ==================== EXPENSE PROCESSING API ====================
  
  async getReceiptsReadyForExpenses(): Promise<ApiResponse<ReadyReceiptsResponse>> {
    return this.makeRequest<ReadyReceiptsResponse>('/expense-processing/ready-receipts');
  }

  async createExpenseFromReceipt(receiptId: string) {
    return this.makeRequest('/expense-processing/create-from-receipt', {
      method: 'POST',
      body: JSON.stringify({ receiptId }),
    });
  }

  async bulkCreateExpenses(receiptIds: string[]) {
    return this.makeRequest('/expense-processing/bulk-create', {
      method: 'POST',
      body: JSON.stringify({ receiptIds }),
    });
  }

  async getExpenseStats(startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    const query = params.toString();
    return this.makeRequest(`/expense-processing/stats${query ? `?${query}` : ''}`);
  }
}

export const apiClient = new ExpenseIQApiClient();
