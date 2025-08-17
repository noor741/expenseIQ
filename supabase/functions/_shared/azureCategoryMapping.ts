import { createServiceSupabaseClient } from './supabase.ts';

interface CategoryMappingResult {
  suggestedCategory: string | null;
  confidence: number;
  reasoning: string;
  azureMerchantCategory?: string;
}

interface ReceiptData {
  merchantName?: string;
  items?: Array<{
    description?: string;
    quantity?: number;
    price?: number;
    totalPrice?: number;
  }>;
  total?: number;
}

export class AzureCategoryMapper {
  private supabase;
  private textAnalyticsEndpoint: string;
  private textAnalyticsKey: string;

  constructor() {
    this.supabase = createServiceSupabaseClient();
    this.textAnalyticsEndpoint = Deno.env.get('AZURE_TEXT_ANALYTICS_ENDPOINT') || '';
    this.textAnalyticsKey = Deno.env.get('AZURE_TEXT_ANALYTICS_KEY') || '';
  }

  /**
   * Main function to suggest category for a receipt
   */
  async suggestCategory(userId: string, receiptData: ReceiptData): Promise<CategoryMappingResult> {
    console.log('🎯 Starting category suggestion for:', receiptData.merchantName);

    try {
      // Step 1: Get user's existing categories
      const userCategories = await this.getUserCategories(userId);
      
      if (userCategories.length === 0) {
        console.log('📝 No user categories found, creating default categories and using rule-based mapping');
        
        // Create default categories for the user
        await this.createDefaultCategories(userId);
        
        // Get the newly created categories
        const defaultCategories = await this.getUserCategories(userId);
        
        if (defaultCategories.length === 0) {
          console.log('❌ Failed to create default categories');
          return {
            suggestedCategory: null,
            confidence: 0,
            reasoning: 'No categories defined by user and failed to create defaults'
          };
        }
        
        // Use rule-based matching with default categories
        return await this.ruleBasedCategoryMapping(receiptData, defaultCategories);
      }

      // Step 2: Use rule-based matching (no Azure Text Analytics needed)
      const ruleBased = await this.ruleBasedCategoryMapping(receiptData, userCategories);
      console.log(`🎯 Rule-based match: ${ruleBased.suggestedCategory} (confidence: ${ruleBased.confidence})`);
      return ruleBased;

    } catch (error) {
      console.error('💥 Error in category suggestion:', error);
      return {
        suggestedCategory: null,
        confidence: 0,
        reasoning: `Error during categorization: ${error.message}`
      };
    }
  }

  /**
   * Get user's existing categories
   */
  private async getUserCategories(userId: string): Promise<Array<{ id: string; name: string; }>> {
    const { data, error } = await this.supabase
      .from('categories')
      .select('id, name')
      .eq('user_id', userId);

    if (error) {
      console.error('❌ Error fetching user categories:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Rule-based category mapping using merchant names and item keywords
   */
  private async ruleBasedCategoryMapping(
    receiptData: ReceiptData, 
    userCategories: Array<{ id: string; name: string; }>
  ): Promise<CategoryMappingResult> {
    
    const merchantName = receiptData.merchantName?.toLowerCase() || '';
    const itemsText = receiptData.items?.map(item => item.description?.toLowerCase() || '').join(' ') || '';
    const combinedText = `${merchantName} ${itemsText}`.toLowerCase();

    // Enhanced category mapping rules
    const categoryRules = [
      // Food & Dining
      {
        keywords: ['restaurant', 'cafe', 'coffee', 'pizza', 'burger', 'food', 'dining', 'mcdonald', 'subway', 'starbucks', 'tim horton', 'a&w', 'kfc', 'wendy', 'domino', 'uber eats', 'doordash', 'skip', 'grubhub'],
        categoryNames: ['food', 'dining', 'meal', 'restaurant', 'grocery', 'groceries'],
        confidence: 0.9
      },
      // Transportation
      {
        keywords: ['gas', 'fuel', 'petrol', 'shell', 'exxon', 'chevron', 'bp', 'mobil', 'taxi', 'uber', 'lyft', 'bus', 'train', 'metro', 'transit', 'parking'],
        categoryNames: ['transportation', 'fuel', 'gas', 'travel', 'commute', 'parking'],
        confidence: 0.9
      },
      // Entertainment
      {
        keywords: ['movie', 'theater', 'cinema', 'concert', 'ticket', 'entertainment', 'netflix', 'spotify', 'game', 'bowling', 'arcade', 'amusement'],
        categoryNames: ['entertainment', 'movies', 'music', 'games', 'recreation'],
        confidence: 0.85
      },
      // Shopping & Retail
      {
        keywords: ['walmart', 'target', 'amazon', 'costco', 'store', 'shop', 'retail', 'clothing', 'shoes', 'electronics', 'best buy'],
        categoryNames: ['shopping', 'retail', 'clothing', 'electronics', 'personal'],
        confidence: 0.8
      },
      // Healthcare
      {
        keywords: ['pharmacy', 'doctor', 'hospital', 'clinic', 'medical', 'health', 'prescription', 'cvs', 'walgreens'],
        categoryNames: ['health', 'medical', 'healthcare', 'pharmacy', 'wellness'],
        confidence: 0.9
      },
      // Utilities & Bills
      {
        keywords: ['electric', 'power', 'utility', 'phone', 'internet', 'cable', 'insurance', 'rent', 'mortgage'],
        categoryNames: ['utilities', 'bills', 'insurance', 'rent', 'housing'],
        confidence: 0.9
      },
      // Home & Garden
      {
        keywords: ['home depot', 'lowes', 'hardware', 'garden', 'furniture', 'appliance', 'home improvement'],
        categoryNames: ['home', 'garden', 'hardware', 'furniture', 'improvement'],
        confidence: 0.85
      }
    ];

    // Find matching rules
    for (const rule of categoryRules) {
      const keywordMatches = rule.keywords.filter(keyword => combinedText.includes(keyword));
      
      if (keywordMatches.length > 0) {
        // Find matching user category
        const matchingCategory = userCategories.find(cat => 
          rule.categoryNames.some(ruleCat => 
            cat.name.toLowerCase().includes(ruleCat) || ruleCat.includes(cat.name.toLowerCase())
          )
        );

        if (matchingCategory) {
          const confidence = Math.min(rule.confidence, 0.7 + (keywordMatches.length * 0.1));
          return {
            suggestedCategory: matchingCategory.id,
            confidence,
            reasoning: `Rule-based match: "${keywordMatches.join(', ')}" → "${matchingCategory.name}"`
          };
        }
      }
    }

    return {
      suggestedCategory: null,
      confidence: 0.3,
      reasoning: 'No strong rule-based matches found'
    };
  }

  /**
   * Use Azure Text Analytics for semantic category matching
   */
  private async azureSemanticCategoryMapping(
    receiptData: ReceiptData,
    userCategories: Array<{ id: string; name: string; }>
  ): Promise<CategoryMappingResult> {
    
    if (!this.textAnalyticsEndpoint || !this.textAnalyticsKey) {
      return {
        suggestedCategory: null,
        confidence: 0,
        reasoning: 'Azure Text Analytics not configured'
      };
    }

    try {
      // Prepare text for analysis
      const merchantText = receiptData.merchantName || '';
      const itemsText = receiptData.items?.map(item => item.description || '').join(', ') || '';
      const analysisText = `${merchantText}. Items: ${itemsText}`.substring(0, 500); // Limit text length

      // Prepare category names for comparison
      const categoryNames = userCategories.map(cat => cat.name).join(', ');

      // Call Azure Text Analytics for key phrase extraction
      const keyPhrasesResponse = await fetch(
        `${this.textAnalyticsEndpoint}/text/analytics/v3.1/keyPhrases`,
        {
          method: 'POST',
          headers: {
            'Ocp-Apim-Subscription-Key': this.textAnalyticsKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            documents: [
              {
                id: '1',
                language: 'en',
                text: analysisText
              }
            ]
          })
        }
      );

      if (!keyPhrasesResponse.ok) {
        throw new Error(`Azure Text Analytics failed: ${keyPhrasesResponse.statusText}`);
      }

      const keyPhrasesData = await keyPhrasesResponse.json();
      const keyPhrases = keyPhrasesData.documents?.[0]?.keyPhrases || [];

      // Match key phrases with user categories
      let bestMatch: { category: { id: string; name: string; }, score: number } | null = null;

      for (const category of userCategories) {
        const categoryWords = category.name.toLowerCase().split(/\s+/);
        let matchScore = 0;

        for (const phrase of keyPhrases) {
          const phraseWords = phrase.toLowerCase().split(/\s+/);
          
          // Check for word overlaps
          const overlap = categoryWords.filter(word => 
            phraseWords.some(phraseWord => 
              phraseWord.includes(word) || word.includes(phraseWord)
            )
          ).length;
          
          matchScore += overlap * 0.3;
          
          // Check for semantic similarity (simple approach)
          if (phrase.toLowerCase().includes(category.name.toLowerCase()) || 
              category.name.toLowerCase().includes(phrase.toLowerCase())) {
            matchScore += 0.5;
          }
        }

        if (!bestMatch || matchScore > bestMatch.score) {
          bestMatch = { category, score: matchScore };
        }
      }

      if (bestMatch && bestMatch.score > 0.3) {
        return {
          suggestedCategory: bestMatch.category.id,
          confidence: Math.min(0.8, bestMatch.score),
          reasoning: `Azure semantic analysis matched key phrases: ${keyPhrases.join(', ')} → "${bestMatch.category.name}"`
        };
      }

      return {
        suggestedCategory: null,
        confidence: 0.2,
        reasoning: `Azure analysis completed but no strong matches found. Key phrases: ${keyPhrases.join(', ')}`
      };

    } catch (error) {
      console.error('🔷 Azure Text Analytics error:', error);
      return {
        suggestedCategory: null,
        confidence: 0,
        reasoning: `Azure Text Analytics error: ${error.message}`
      };
    }
  }

  /**
   * Learn from user corrections to improve future suggestions
   */
  async recordCategoryCorrection(
    userId: string, 
    receiptData: ReceiptData, 
    suggestedCategory: string | null, 
    actualCategory: string
  ): Promise<void> {
    try {
      // Store the correction for future learning
      // This could be used to improve the rule-based system over time
      const { error } = await this.supabase
        .from('category_corrections')
        .insert({
          user_id: userId,
          merchant_name: receiptData.merchantName,
          suggested_category: suggestedCategory,
          actual_category: actualCategory,
          correction_date: new Date().toISOString()
        });

      if (error) {
        console.error('❌ Error recording category correction:', error);
      } else {
        console.log('📝 Category correction recorded for learning');
      }
    } catch (error) {
      console.error('💥 Error in recordCategoryCorrection:', error);
    }
  }

  /**
   * Create default expense categories for new users
   */
  private async createDefaultCategories(userId: string): Promise<void> {
    const defaultCategories = [
      { name: 'Food & Dining', description: 'Restaurants, cafes, food delivery, groceries' },
      { name: 'Transportation', description: 'Gas, public transit, parking, taxi, car maintenance' },
      { name: 'Shopping', description: 'Clothing, electronics, general retail purchases' },
      { name: 'Entertainment', description: 'Movies, concerts, streaming services, recreation' },
      { name: 'Healthcare', description: 'Medical expenses, pharmacy, insurance copays' },
      { name: 'Utilities', description: 'Electric, gas, water, internet, phone bills' },
      { name: 'Home & Garden', description: 'Home improvement, furniture, garden supplies' },
      { name: 'Education', description: 'Books, courses, school supplies, tuition' },
      { name: 'Travel', description: 'Hotels, flights, vacation expenses' },
      { name: 'Business', description: 'Office supplies, business meals, equipment' }
    ];

    try {
      const categoriesToInsert = defaultCategories.map(category => ({
        user_id: userId,
        name: category.name,
        description: category.description,
        is_default: true
      }));

      const { error } = await this.supabase
        .from('categories')
        .insert(categoriesToInsert);

      if (error) {
        console.error('❌ Failed to create default categories:', error);
        throw error;
      }

      console.log(`✅ Created ${defaultCategories.length} default categories for user ${userId}`);
    } catch (error) {
      console.error('💥 Error creating default categories:', error);
      throw error;
    }
  }
}

export const azureCategoryMapper = new AzureCategoryMapper();
