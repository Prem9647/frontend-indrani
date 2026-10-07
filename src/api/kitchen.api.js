import { api } from "./client";

// Public, unauthenticated snapshot endpoint — no token attached, matches
// the KDS being a login-free surface. See .claude/skills/authentication.
export const kitchenApi = {
  getQueue: () => api.get("/kitchen/queue"),
};
