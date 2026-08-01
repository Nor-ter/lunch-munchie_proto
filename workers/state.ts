// Durable Objects must be deployed by a Worker, not by a Pages project.
// Pages Functions bind to this script through `script_name` in wrangler.toml.
export { UserDurableObject } from "../server/do/UserDurableObject";
export { SessionDurableObject } from "../server/do/SessionDurableObject";

export default {
  fetch(): Response {
    return new Response("Lunchie state worker", { status: 404 });
  },
};
