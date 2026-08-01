/**
 * SessionDurableObject — Cloudflare Durable Object for Group Decision Sessions
 * Manages group room state, member joins, swipe collecting, and Least-Misery consensus
 * in a single thread-safe edge actor, eliminating memory loss on server restarts.
 */

export interface SessionMemberState {
  id: string;
  user_id: string;
  user_name: string;
  emoji: string;
  is_ready: boolean;
}

export interface SwipeState {
  id: string;
  user_id: string;
  restaurant_id: string;
  round: number;
  swipe_action: "LIKE" | "SUPER_LIKE" | "NOPE";
}

export class SessionDurableObject {
  state: any;
  env: any;

  constructor(state: any, env: any) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;

    if (method === "GET" && url.pathname === "/info") {
      const members: SessionMemberState[] = (await this.state.storage.get("members")) ?? [];
      const swipes: SwipeState[] = (await this.state.storage.get("swipes")) ?? [];
      const status: string = (await this.state.storage.get("status")) ?? "WAITING";

      return new Response(
        JSON.stringify({ members, swipes, status }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    if (method === "POST" && url.pathname === "/join") {
      const body: SessionMemberState = await request.json();
      const members: SessionMemberState[] = (await this.state.storage.get("members")) ?? [];
      
      const existingIdx = members.findIndex((m) => m.user_id === body.user_id);
      if (existingIdx >= 0) {
        members[existingIdx] = { ...members[existingIdx], ...body };
      } else {
        members.push(body);
      }

      await this.state.storage.put("members", members);
      return new Response(JSON.stringify({ success: true, count: members.length }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (method === "POST" && url.pathname === "/swipe") {
      const body: SwipeState = await request.json();
      const swipes: SwipeState[] = (await this.state.storage.get("swipes")) ?? [];
      swipes.push(body);
      await this.state.storage.put("swipes", swipes);

      return new Response(JSON.stringify({ success: true, count: swipes.length }), {
        headers: { "Content-Type": "application/json" },
      });
    }
    
    // Phase 3: Algorithm Implementation (Least Misery + Dynamic Scaling)
    if (method === "GET" && url.pathname === "/result") {
      const members: SessionMemberState[] = (await this.state.storage.get("members")) ?? [];
      const swipes: SwipeState[] = (await this.state.storage.get("swipes")) ?? [];
      
      const N = members.length || 1;
      // Dynamic Scaling: N >= 6 => lambda = 0.4 (Relaxed veto), otherwise lambda = 0.8 (Strict veto)
      const lambda = N >= 6 ? 0.4 : 0.8;
      
      const scoreMap = new Map<string, number[]>();
      
      // Group swipes by restaurant
      for (const swipe of swipes) {
        if (!scoreMap.has(swipe.restaurant_id)) {
          scoreMap.set(swipe.restaurant_id, []);
        }
        let val = 0;
        if (swipe.swipe_action === "LIKE") val = 1;
        if (swipe.swipe_action === "SUPER_LIKE") val = 2;
        if (swipe.swipe_action === "NOPE") val = -1000; // Hard Veto
        
        scoreMap.get(swipe.restaurant_id)!.push(val);
      }
      
      const results = [];
      for (const [restaurant_id, scores] of Array.from(scoreMap.entries())) {
        const sum = scores.reduce((a, b) => a + b, 0);
        const min = Math.min(...scores);
        // Least Misery Algorithm
        const finalScore = ((1 - lambda) * sum) + (lambda * min);
        
        results.push({ restaurant_id, finalScore, sum, min, swipes: scores.length });
      }
      
      // Sort by descending score
      results.sort((a, b) => b.finalScore - a.finalScore);
      
      return new Response(JSON.stringify({ success: true, N, lambda, results }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("Not Found", { status: 404 });
  }
}
