import { View, Text, Image } from "react-native";
import { useAuthStore } from "../stores/authStore";

// Persistent app-shell header for wide (web/tablet) screens, shared by every
// role's Shell (AdminShell.js, ManagerShell.js) — content is entirely
// derived from authStore (name/role), so nothing here is role-specific.
export function TopBar() {
  const user = useAuthStore((s) => s.user);
  const initial = user?.name?.[0]?.toUpperCase() ?? "A";

  return (
    <View
      className="w-full bg-brand-50 border-b border-brand-200 flex-row items-center justify-between px-6 h-16 shadow-md shadow-brand-900/15"
      style={{ elevation: 4 }}
    >
      <View className="flex-row items-center gap-4">
        <Image source={require("../../assets/logo.png")} style={{ width: 65, height: 65 }} resizeMode="contain" />
      </View>

      <View className="flex-row items-center gap-4">
        <View className="h-8 w-px bg-brand-200" />
        <View className="flex-row items-center gap-3">
          <View className="items-end">
            <Text className="text-sm font-semibold text-brand-900 leading-none">{user?.name ?? "Admin"}</Text>
            <Text className="text-xs font-medium text-brand-500 mt-1 capitalize">{user?.role ?? "admin"}</Text>
          </View>
          <View className="w-9 h-9 rounded-full bg-primary-100 border-2 border-primary-200 items-center justify-center">
            <Text className="text-sm font-bold text-primary-700">{initial}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
