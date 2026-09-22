// Translate known catalogue labels at the presentation boundary only.
// Unknown labels (including user-created tags) remain unchanged.
const LABELS: Record<string, string> = {
  '맛집': 'Food spots', '데이트코스': 'Date night', '데이트 코스': 'Date night',
  '혼밥': 'Dining alone', '카페': 'Cafe', '펍나이트': 'Pub night',
  '브런치': 'Brunch', '디저트': 'Dessert', '가성비': 'Budget friendly',
  '한식': 'Korean', '일식': 'Japanese', '중식': 'Chinese', '태국': 'Thai',
  '베트남': 'Vietnamese', '이탈리안': 'Italian', '멕시칸': 'Mexican',
  '베이커리': 'Bakery', '기타': 'Other', '전체': 'All',
  '채식': 'Vegetarian', '베지테리언': 'Vegetarian', '비건': 'Vegan',
  '페스코 채식': 'Pescatarian', '할랄': 'Halal', '코셔': 'Kosher',
  '글루텐프리': 'Gluten-free', '글루텐 프리': 'Gluten-free',
  '유제품프리': 'Dairy-free', '넛프리': 'Nut-free',
  '돼지고기': 'Pork', '소고기': 'Beef', '양고기': 'Lamb',
  '해산물': 'Seafood', '갑각류·조개류': 'Shellfish', '견과류': 'Nuts',
  '유제품': 'Dairy', '달걀': 'Eggs', '해산물 제외': 'No seafood',
};

export function displayLabel(value: string): string {
  return LABELS[value] ?? value;
}

export function countLabel(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
