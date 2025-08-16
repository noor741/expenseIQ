export const formatCurrency = (amount: number, currency: string = 'CAD') => {
  try {
    const validAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
    const validCurrency = currency && currency.length === 3 ? currency : 'CAD';
    
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: validCurrency
    }).format(validAmount);
  } catch (error) {
    const validAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
    return `-$${validAmount.toFixed(2)}`;
  }
};

export const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};
