import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  autocompleteLocations,
  generateSessionToken,
  type Bias,
  type PlaceSuggestion,
} from '@/services/placesApi';

const DEBOUNCE_MS = 400;

export function useLocationSearch(bias?: Bias) {
  const [input, setInput] = useState('');
  const [debouncedInput, setDebouncedInput] = useState('');
  const [sessionToken, setSessionToken] = useState(() => generateSessionToken());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedInput(input), DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [input]);

  const trimmed = debouncedInput.trim();
  const currentInput = input.trim();
  const enabled = trimmed.length >= 2;
  const query = useQuery<PlaceSuggestion[]>({
    queryKey: ['locationAutocomplete', trimmed, sessionToken, bias?.lat, bias?.lng],
    queryFn: () => autocompleteLocations(trimmed, sessionToken, bias),
    enabled,
  });

  const reset = useCallback(() => {
    setInput('');
    setDebouncedInput('');
    setSessionToken(generateSessionToken());
  }, []);

  return {
    input,
    setInput,
    sessionToken,
    suggestions: query.data ?? [],
    isLoading: currentInput.length >= 2 && (currentInput !== trimmed || query.isLoading),
    isError: query.isError,
    reset,
  };
}
