/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Injected by the Aspire AppHost (AddViteApp .WithEnvironment). Falls back to a
  // hardcoded URL only when the app is run standalone outside the AppHost.
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
