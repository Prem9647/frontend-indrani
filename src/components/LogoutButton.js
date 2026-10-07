import { Pressable, Text } from "react-native";
import { useAuthStore } from "../stores/authStore";

export function LogoutButton() {
  const logout = useAuthStore((s) => s.logout);

  return (
    <Pressable onPress={logout} className="px-3 py-1.5" hitSlop={8}>
      <Text className="text-sm font-medium text-primary-700">Log out</Text>
    </Pressable>
  );
}
