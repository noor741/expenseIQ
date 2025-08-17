// Azure OpenAI service for intelligent receipt categorization
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface CategorySuggestion {
  category: string;
  confidence: number;
  reasoning: string;
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface ReceiptData {
  description?: string;
  vendor?: string;
  items: Array<{
    description?: string;
    category?: string;
    amount?: number;
  }>;
  total: number;
}

export class AzureOpenAIService {
  private endpoint: string;
  private apiKey: string;
  private deploymentName: string;
  private supabase: any;

  constructor() {
    this.endpoint = Deno.env.get('AZURE_OPENAI_ENDPOINT') || '';
    this.apiKey = Deno.env.get('AZURE_OPENAI_API_KEY') || '';
    this.deploymentName = Deno.env.get('AZURE_OPENAI_DEPLOYMENT') || 'gpt-4';
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  /**
   * Analyzes receipt data and suggests the most appropriate category
   */
  async categorizeReceipt(receiptData: ReceiptData): Promise<CategorySuggestion> {
    try {
      const prompt = this.buildCategorizationPrompt(receiptData);
      
            const response = await fetch(`${this.endpoint}/openai/deployments/${this.deploymentName}/chat/completions?api-version=2024-02-15-preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.apiKey,
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: 'You are an expert expense categorization assistant. Analyze receipts and suggest the most appropriate expense category.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 200,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        throw new Error(`Azure OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data: OpenAIResponse = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No response from Azure OpenAI');
      }

      return this.parseCategorizationResponse(content);
    } catch (error) {
      console.error('Azure OpenAI categorization error:', error);
      // Fallback to default category
      return {
        category: 'Other',
        confidence: 0.5,
        reasoning: 'Failed to categorize, using default category'
      };
    }
  }

  /**
   * Checks if category exists, creates if needed, and returns category ID
   * Categories are global - not user-specific
   */
  async ensureCategoryExists(categoryName: string, userId: string): Promise<string> {
    try {
      // First, check if category exists globally (no user_id needed)
      const { data: existingCategory, error: searchError } = await this.supabase
        .from('categories')
        .select('id')
        .eq('name', categoryName)
        .single();

      if (searchError && searchError.code !== 'PGRST116') { // PGRST116 is "not found"
        throw new Error(`Error searching for category: ${searchError.message}`);
      }

      if (existingCategory) {
        console.log(`Category "${categoryName}" already exists with ID: ${existingCategory.id}`);
        return existingCategory.id;
      }

      // Category doesn't exist, create it globally
      const { data: newCategory, error: createError } = await this.supabase
        .from('categories')
        .insert([
          {
            name: categoryName,
            color: this.getDefaultColorForCategory(categoryName)
          }
        ])
        .select('id')
        .single();

      if (createError) {
        throw new Error(`Error creating category: ${createError.message}`);
      }

      console.log(`Created new category "${categoryName}" with ID: ${newCategory.id}`);
      return newCategory.id;
    } catch (error) {
      console.error('Error ensuring category exists:', error);
      throw error;
    }
  }

  private buildCategorizationPrompt(receiptData: ReceiptData): string {
    const vendorInfo = receiptData.vendor ? `Vendor: ${receiptData.vendor}` : '';
    const descriptionInfo = receiptData.description ? `Description: ${receiptData.description}` : '';
    
    const itemsInfo = receiptData.items.length > 0 
      ? `Items: ${receiptData.items.map(item => `${item.description || 'Unknown item'} ($${item.amount || 0})`).join(', ')}`
      : '';

    return `Please analyze this receipt and suggest the most appropriate expense category:

${vendorInfo}
${descriptionInfo}
${itemsInfo}
Total Amount: $${receiptData.total}

Based on this information, suggest a category name that would be suitable for expense tracking. 
Consider common business expense categories like:
- Food & Dining, Office Supplies, Travel, Transportation, Utilities, Entertainment, 
- Healthcare, Insurance, Professional Services, Marketing, Equipment, Software, etc.

Please respond in this exact JSON format:
{
  "category": "suggested category name",
  "confidence": confidence_score_0_to_1,
  "reasoning": "brief explanation for the categorization"
}`;
  }

  private parseCategorizationResponse(content: string): CategorySuggestion {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        category: parsed.category || 'Other',
        confidence: Math.min(Math.max(parsed.confidence || 0.5, 0), 1), // Clamp between 0-1
        reasoning: parsed.reasoning || 'AI categorization'
      };
    } catch (error) {
      console.error('Error parsing categorization response:', error);
      console.log('Raw response:', content);
      
      // Fallback parsing - try to extract category name from text
      const fallbackCategory = this.extractCategoryFromText(content);
      return {
        category: fallbackCategory,
        confidence: 0.6,
        reasoning: 'Parsed from AI response text'
      };
    }
  }

  private extractCategoryFromText(text: string): string {
    // Common category patterns to look for
    const categories = [
      'Food & Dining', 'Office Supplies', 'Travel', 'Transportation', 'Utilities',
      'Entertainment', 'Healthcare', 'Insurance', 'Professional Services', 
      'Marketing', 'Equipment', 'Software', 'Groceries', 'Gas', 'Restaurants',
      'Hotels', 'Clothing', 'Education', 'Books', 'Electronics'
    ];

    const lowerText = text.toLowerCase();
    
    for (const category of categories) {
      if (lowerText.includes(category.toLowerCase())) {
        return category;
      }
    }

    // Look for common keywords
    if (lowerText.includes('food') || lowerText.includes('restaurant') || lowerText.includes('dining')) {
      return 'Food & Dining';
    }
    if (lowerText.includes('office') || lowerText.includes('supplies')) {
      return 'Office Supplies';
    }
    if (lowerText.includes('travel') || lowerText.includes('hotel')) {
      return 'Travel';
    }
    if (lowerText.includes('gas') || lowerText.includes('fuel') || lowerText.includes('transportation')) {
      return 'Transportation';
    }

    return 'Other';
  }

  private getDefaultColorForCategory(categoryName: string): string {
    // Simple color assignment based on category type
    const colorMap: Record<string, string> = {
      'Food & Dining': '#FF6B6B',
      'Office Supplies': '#4ECDC4',
      'Travel': '#45B7D1',
      'Transportation': '#96CEB4',
      'Utilities': '#FFEAA7',
      'Entertainment': '#DDA0DD',
      'Healthcare': '#98D8C8',
      'Insurance': '#F7DC6F',
      'Professional Services': '#BB8FCE',
      'Marketing': '#85C1E9',
      'Equipment': '#82E0AA',
      'Software': '#F8C471',
      'Groceries': '#FF6B6B',
      'Gas': '#96CEB4',
      'Other': '#BDC3C7'
    };

    return colorMap[categoryName] || colorMap['Other'];
  }
}
