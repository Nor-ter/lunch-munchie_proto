/**
 * Legacy Express development server has no production identity provider.
 * Production authentication is implemented by the Cloudflare Pages Function
 * from the signed `lm_session` cookie. Never trust a browser Bearer token here.
 */
export type RequestAuthResult =
  | { status: "authenticated"; userId: string }
  | { status: "missing_authorization" | "malformed_authorization"; userId: null };

export type RequestAuthVerifier = (authorizationHeader: string | undefined) => Promise<RequestAuthResult>;

export const verifyRequestAuth: RequestAuthVerifier = async (authorizationHeader) => {
  if (authorizationHeader === undefined) return { status: "missing_authorization", userId: null };
  return { status: "malformed_authorization", userId: null };
};
