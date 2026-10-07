import { View, Text } from "react-native";

// Inline, non-blocking error surface for form-level / request-level
// failures — the API error envelope's `error.message` is human-readable by
// design (see .claude/skills/api-design/skill.md), so it's shown as-is.
export function ErrorBanner({ message }) {
  if (!message) return null;

  return (
    <View className="bg-danger-50 border border-danger-100 rounded-lg px-3.5 py-3">
      <Text className="text-sm text-danger-700">{message}</Text>
    </View>
  );
}
