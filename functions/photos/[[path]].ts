interface Env {
  PHOTOS_R2: R2Bucket;
  /** Local development only: a public, read-only media service. */
  MEDIA_ORIGIN?: string;
}

/**
 * Serve private R2 catalogue images through stable `/photos/*` URLs. A local
 * Pages runtime may use MEDIA_ORIGIN to read the deployed public media service
 * instead of cloning the complete R2 bucket into its emulator.
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const key = context.params.path;
  const path = Array.isArray(key) ? key.join("/") : key;
  if (!path || path.includes("..")) return new Response("Not Found", { status: 404 });

  if (context.env.MEDIA_ORIGIN) {
    try {
      const origin = new URL(context.env.MEDIA_ORIGIN);
      if (origin.protocol === "https:") {
        const encodedPath = path.split("/").map(encodeURIComponent).join("/");
        const response = await fetch(new URL(`/photos/${encodedPath}`, origin));
        if (response.ok) {
          const headers = new Headers(response.headers);
          headers.set("Cache-Control", "public, max-age=604800, immutable");
          return new Response(response.body, { headers });
        }
      }
    } catch {
      // An absent or invalid local-only origin must not break production R2.
    }
  }

  const object = await context.env.PHOTOS_R2.get(`photos/${path}`);
  if (!object) return new Response("Not Found", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("Cache-Control", "public, max-age=604800, immutable");
  return new Response(object.body, { headers });
};
