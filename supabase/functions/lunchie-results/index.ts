import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';

serve(async (req) => {
  const { sessionId, round = 1 } = await req.json();
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: swipes, error } = await supabase.from('swipes').select('restaurant_id, swipe_action').eq('session_id', sessionId).eq('round', round);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  const scores = new Map<string, { restaurantId: string; likes: number; dislikes: number; score: number }>();
  for (const swipe of swipes ?? []) {
    const current = scores.get(swipe.restaurant_id) ?? { restaurantId: swipe.restaurant_id, likes: 0, dislikes: 0, score: 0 };
    if (swipe.swipe_action === 'LIKE') current.likes += 1;
    if (swipe.swipe_action === 'DISLIKE') current.dislikes += 1;
    current.score = current.likes * 2 - current.dislikes;
    scores.set(swipe.restaurant_id, current);
  }
  return new Response(JSON.stringify({ results: [...scores.values()].sort((a, b) => b.score - a.score) }), { headers: { 'content-type': 'application/json' } });
});
