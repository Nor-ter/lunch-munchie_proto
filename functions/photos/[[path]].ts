interface Env {
  PHOTOS_R2: R2Bucket;
}

/** Serve private R2 catalogue images through the same `/photos/*` URLs used locally. */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const key = context.params.path;
  const path = Array.isArray(key) ? key.join("/") : key;
  if (!path || path.includes("..")) return new Response("Not Found", { status: 404 });

  const object = await context.env.PHOTOS_R2.get(`photos/${path}`);
  if (!object) return new Response("Not Found", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("Cache-Control", "public, max-age=604800, immutable");
  return new Response(object.body, { headers });
};
