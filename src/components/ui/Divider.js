import { View } from "react-native";

export function Divider({ className = "" }) {
  return <View className={`h-px bg-brand-200 ${className}`} />;
}
