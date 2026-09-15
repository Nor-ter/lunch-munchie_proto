// Display labels only. Persisted dietary values and API contracts stay unchanged.
const LABELS: Record<string, string> = {
  '비건': 'Vegan',
  '채식': 'Vegetarian',
  '글루텐프리': 'Gluten-free',
  '할랄': 'Halal',
  '유제품 제외': 'No dairy',
  '견과류 알러지': 'Nut allergy',
  '해산물 제외': 'No seafood',
};

export function dietaryLabel(value: string): string {
  return LABELS[value] ?? value;
}
