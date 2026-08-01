/** Real-world geographic coordinate */
export interface LatLng {
  lat: number;
  lng: number;
}

export interface CoursePlace {
  id: string;
  name: string;
  rating: number;       // 0.0 – 5.0
  distance: string;     // e.g. "120m"
  category: string;
  priceLevel: number;   // 1 – 3
  imageUrl?: string;
  coords: LatLng;
}

export interface Course {
  id: string;
  authorHandle: string;
  authorBadge?: string;
  followerCount: string;
  title: string;
  hashtags: string[];
  distanceKm: number;
  durationHours: number;
  saveCount: number;
  places: CoursePlace[];
}

// ── Edit reducer types ────────────────────────────────────────────────────────

export type EditAction =
  | { type: 'REORDER'; places: CoursePlace[] }
  | { type: 'REMOVE'; id: string }
  | { type: 'ADD'; place: CoursePlace }
  | { type: 'SET_TITLE'; title: string }
  | { type: 'TOGGLE_TAG'; tag: string }
  | { type: 'RESET'; original: Course };

export interface EditState {
  title: string;
  hashtags: string[];
  places: CoursePlace[];
  isDirty: boolean;
}

export function editReducer(state: EditState, action: EditAction): EditState {
  switch (action.type) {
    case 'REORDER':
      return { ...state, places: action.places, isDirty: true };
    case 'REMOVE':
      return { ...state, places: state.places.filter(p => p.id !== action.id), isDirty: true };
    case 'ADD':
      return { ...state, places: [...state.places, action.place], isDirty: true };
    case 'SET_TITLE':
      return { ...state, title: action.title, isDirty: true };
    case 'TOGGLE_TAG': {
      const has = state.hashtags.includes(action.tag);
      return {
        ...state,
        hashtags: has
          ? state.hashtags.filter(t => t !== action.tag)
          : [...state.hashtags, action.tag],
        isDirty: true,
      };
    }
    case 'RESET':
      return {
        title: action.original.title,
        hashtags: [...action.original.hashtags],
        places: action.original.places.map(p => ({ ...p })),
        isDirty: false,
      };
    default:
      return state;
  }
}
