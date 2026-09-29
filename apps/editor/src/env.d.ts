// SANITY_APP_* variables are inlined at build time by the App SDK toolchain.
interface ImportMetaEnv {
  readonly SANITY_APP_PROJECT_ID?: string
  readonly SANITY_APP_DATASET?: string
  readonly SANITY_APP_TOKEN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
