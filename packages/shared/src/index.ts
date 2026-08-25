export type APIResponse<T = undefined> = {
  success: boolean;
  message?: string;
  data?: T;
  error?: any;
};

// Add more shared types as needed
