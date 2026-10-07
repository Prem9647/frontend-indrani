import { View } from "react-native";

export function Card({ children, className = "" }) {
  return (
    <View
      className={`bg-white border border-brand-200 rounded-xl p-4 shadow-md shadow-brand-900/15 ${className}`}
      style={{ elevation: 4 }}
    >
      {children}
    </View>
  );
}
