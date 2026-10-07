import { View, ActivityIndicator, Text } from "react-native";
import { colors } from "../../theme/colors";

export function LoadingIndicator({ label, fullScreen = false }) {
  return (
    <View className={`items-center justify-center ${fullScreen ? "flex-1 bg-brand-50" : "py-10"}`}>
      <ActivityIndicator size="large" color={colors.primary[700]} />
      {label ? <Text className="text-sm text-brand-500 mt-3">{label}</Text> : null}
    </View>
  );
}
