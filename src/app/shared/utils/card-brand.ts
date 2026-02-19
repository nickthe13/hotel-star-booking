export function getCardBrandIcon(brand: string): string {
  const icons: Record<string, string> = {
    visa: '💳',
    mastercard: '💳',
    amex: '💳',
    discover: '💳',
    diners: '💳',
    jcb: '💳',
    unionpay: '💳'
  };
  return icons[brand.toLowerCase()] || '💳';
}
