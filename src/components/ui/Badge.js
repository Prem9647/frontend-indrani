import { View, Text } from "react-native";

// Tone → full static class strings (not interpolated) so Tailwind's content
// scanner picks every one up regardless of which tone is used at runtime.
const TONE_STYLES = {
  brand: { container: "bg-brand-100 border-brand-200", text: "text-brand-700" },
  primary: { container: "bg-primary-100 border-primary-200", text: "text-primary-700" },
  secondary: { container: "bg-secondary-100 border-secondary-200", text: "text-secondary-700" },
  success: { container: "bg-success-100 border-success-100", text: "text-success-700" },
  warning: { container: "bg-warning-100 border-warning-100", text: "text-warning-700" },
  danger: { container: "bg-danger-100 border-danger-100", text: "text-danger-700" },
  info: { container: "bg-info-100 border-info-100", text: "text-info-700" },
};

export function Badge({ label, tone = "brand" }) {
  const styles = TONE_STYLES[tone] ?? TONE_STYLES.brand;

  return (
    <View className={`self-start px-2.5 py-1 rounded-full border ${styles.container}`}>
      <Text className={`text-xs font-medium ${styles.text}`}>{label}</Text>
    </View>
  );
}
