// Default category colors for modern left border styling
export const defaultCategoryColors: { [key: string]: string } = {
  // Food & Dining
  'food': '#FF6B35',
  'restaurant': '#FF6B35', 
  'dining': '#FF6B35',
  'groceries': '#4ECDC4',
  'grocery': '#4ECDC4',
  
  // Transportation
  'transportation': '#45B7D1',
  'gas': '#45B7D1',
  'parking': '#45B7D1',
  'uber': '#45B7D1',
  'taxi': '#45B7D1',
  
  // Shopping
  'shopping': '#F7DC6F',
  'retail': '#F7DC6F',
  'clothing': '#F7DC6F',
  'electronics': '#BB8FCE',
  
  // Entertainment
  'entertainment': '#F1948A',
  'movies': '#F1948A',
  'games': '#F1948A',
  'music': '#F1948A',
  
  // Health & Fitness
  'health': '#82E0AA',
  'medical': '#82E0AA',
  'pharmacy': '#82E0AA',
  'fitness': '#82E0AA',
  
  // Travel
  'travel': '#85C1E9',
  'hotel': '#85C1E9',
  'flight': '#85C1E9',
  
  // Utilities
  'utilities': '#D7DBDD',
  'internet': '#D7DBDD',
  'phone': '#D7DBDD',
  
  // Default fallback
  'default': '#BDC3C7',
  'uncategorized': '#BDC3C7'
};

export function getCategoryColor(category?: string): string {
  if (!category) return defaultCategoryColors.default;
  
  const normalizedCategory = category.toLowerCase();
  
  // Try exact match first
  if (defaultCategoryColors[normalizedCategory]) {
    return defaultCategoryColors[normalizedCategory];
  }
  
  // Try partial matches
  for (const [key, color] of Object.entries(defaultCategoryColors)) {
    if (normalizedCategory.includes(key) || key.includes(normalizedCategory)) {
      return color;
    }
  }
  
  return defaultCategoryColors.default;
}
