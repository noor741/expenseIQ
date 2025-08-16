export const determineCategoryFromMerchant = (merchantName: string): string => {
  const name = merchantName.toLowerCase();
  
  if (name.includes('starbucks') || name.includes('coffee') || name.includes('cafe')) return 'Coffee';
  if (name.includes('whole foods') || name.includes('grocery') || name.includes('supermarket')) return 'Groceries';
  if (name.includes('uber') || name.includes('lyft') || name.includes('taxi')) return 'Transportation';
  if (name.includes('restaurant') || name.includes('pizza') || name.includes('italian')) return 'Dining';
  if (name.includes('cinema') || name.includes('movie') || name.includes('theater')) return 'Entertainment';
  if (name.includes('amazon') || name.includes('shop') || name.includes('store')) return 'Shopping';
  if (name.includes('electric') || name.includes('utility') || name.includes('bill')) return 'Utilities';
  if (name.includes('doctor') || name.includes('hospital') || name.includes('clinic')) return 'Healthcare';
  if (name.includes('flight') || name.includes('airline') || name.includes('hotel')) return 'Travel';
  if (name.includes('streaming') || name.includes('netflix') || name.includes('subscription')) return 'Subscription';
  
  return 'default';
};
