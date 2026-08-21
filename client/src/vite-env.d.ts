/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional browser-visible origin used only for cross-device session invitations. */
  readonly VITE_INVITE_ORIGIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
