declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_API_URL?: string;
    EXPO_PUBLIC_WEB_URL?: string;
  }
}

declare const process: {
  env: NodeJS.ProcessEnv;
};
