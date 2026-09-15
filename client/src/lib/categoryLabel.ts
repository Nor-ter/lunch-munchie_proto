// Display-only labels. Keep the original category in data and API requests.
const CATEGORY_LABELS: Record<string, string> = {
  '이탈리안': 'Italian',
  '이탈리아': 'Italian',
  '한식': 'Korean',
  '일식': 'Japanese',
  '중식': 'Chinese',
  '양식': 'Western',
  '분식': 'Korean street food',
  '멕시칸': 'Mexican',
  '태국': 'Thai',
  '베트남': 'Vietnamese',
  '카페': 'Café',
  '커피': 'Coffee',
  '디저트': 'Dessert',
  '베이커리': 'Bakery',
  '피자': 'Pizza',
  '치킨': 'Chicken',
  '버거': 'Burgers',
  '술집': 'Bar',
};

export function categoryLabel(category: string | null | undefined): string {
  if (!category) return '';
  return CATEGORY_LABELS[category] ?? category;
}
