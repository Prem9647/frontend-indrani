import { View, Text } from "react-native";

export function EmptyState({ title, subtitle }) {
  return (
    <View className="items-center justify-center py-16 px-6">
      <Text className="text-base font-semibold text-brand-700 text-center">{title}</Text>
      {subtitle ? (
        <Text className="text-sm text-brand-500 text-center mt-1.5">{subtitle}</Text>
      ) : null}
    </View>
  );
}
