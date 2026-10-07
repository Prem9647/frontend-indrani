// EXPO_PUBLIC_* vars are inlined into the client bundle by Expo — never put
// secrets here (see .claude/skills/project-rules/skill.md). The default
// assumes the API is reachable at localhost, which only works for web/
// simulator; a physical device needs EXPO_PUBLIC_API_URL set to your
// machine's LAN IP (e.g. http://192.168.1.20:4000/api).
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000/api";
export const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL ?? "http://localhost:4000";
