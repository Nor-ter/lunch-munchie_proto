import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';

serve(async (req) => {
  const { courseId, authorId } = await req.json();
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: source, error } = await supabase.from('courses').select('*').eq('id', courseId).single();
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  const { id: _id, created_at: _createdAt, ...copy } = source;
  const { data: forked, error: insertError } = await supabase.from('courses').insert({ ...copy, author_id: authorId, title: `${source.title} copy`, likes_count: 0, saves_count: 0, comments_count: 0 }).select('*').single();
  if (insertError) return new Response(JSON.stringify({ error: insertError.message }), { status: 400 });
  return new Response(JSON.stringify({ course: forked }), { headers: { 'content-type': 'application/json' } });
});
