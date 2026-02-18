export {};

declare global {
  interface CustomJwtSessionClaims {
    metadata?: {
      role?: "admin" | "kasir" | "dapur";
    };
  }
}
