import { Pressable, Text, ActivityIndicator } from "react-native";
import { colors } from "../../theme/colors";

// Variant → full static class strings so Tailwind's content scanner sees
// every combination regardless of which variant a screen actually uses.
const VARIANTS = {
  primary: {
    container: "bg-primary-700 active:bg-primary-800",
    text: "text-white",
    spinner: colors.white,
  },
  secondary: {
    container: "bg-secondary-700 active:bg-secondary-800",
    text: "text-white",
    spinner: colors.white,
  },
  outline: {
    container: "bg-white border border-brand-300 active:bg-brand-50",
    text: "text-brand-800",
    spinner: colors.brand[700],
  },
  danger: {
    container: "bg-danger-600 active:bg-danger-700",
    text: "text-white",
    spinner: colors.white,
  },
};

export function Button({
  label,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  className = "",
}) {
  const styles = VARIANTS[variant] ?? VARIANTS.primary;
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className={`flex-row items-center justify-center rounded-lg px-4 py-3 ${styles.container} ${
        isDisabled ? "opacity-50" : ""
      } ${className}`}
    >
      {loading ? (
        <ActivityIndicator size="small" color={styles.spinner} />
      ) : (
        <Text className={`text-base font-semibold ${styles.text}`}>{label}</Text>
      )}
    </Pressable>
  );
}
