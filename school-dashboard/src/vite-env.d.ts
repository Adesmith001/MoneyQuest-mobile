/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APPWRITE_ENDPOINT: string;
  readonly VITE_APPWRITE_PROJECT_ID: string;
  readonly VITE_APPWRITE_DATABASE_ID: string;
  readonly VITE_KORAPAY_PUBLIC_KEY: string;
  readonly VITE_KORAPAY_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
