import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../stores/authStore";
import { colors } from "../theme/colors";

// Persistent left rail for wide (web/tablet) screens, shared by every role's
// Shell (AdminShell.js, ManagerShell.js) — parameterized by `routes` since
// each role sees a different set of tabs. Deliberately not a bottom-tabs
// custom `tabBar` (that combination collapses the scene container's height
// to 0 on web — see AdminShell.js for the full explanation); just plain
// navigation.navigate() calls, the same ones Quick Actions already use for
// cross-tab navigation.
export function Sidebar({ routes, activeRoute, navigation }) {
  const logout = useAuthStore((s) => s.logout);

  return (
    <View className="w-[260px] bg-brand-50 border-r border-brand-200 h-full">
      <View className="flex-1 p-4 gap-1">
        {routes.map((route) => {
          const isActive = activeRoute === route.name;
          return (
            <Pressable
              key={route.name}
              onPress={() => navigation.navigate(route.name)}
              className={`flex-row items-center gap-4 px-4 py-3 rounded-lg ${isActive ? "bg-primary-100" : ""}`}
            >
              <Ionicons name={route.icon} size={20} color={isActive ? colors.primary[700] : colors.brand[500]} />
              <Text className={`text-sm font-semibold ${isActive ? "text-primary-700" : "text-brand-600"}`}>
                {route.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View className="p-4">
        <Pressable
          onPress={logout}
          className="w-full flex-row items-center justify-center gap-2 px-4 py-3 rounded-lg"
        >
          <Ionicons name="log-out-outline" size={18} color={colors.danger[600]} />
          <Text className="text-sm font-semibold text-danger-600">Sign Out</Text>
        </Pressable>
      </View>
    </View>
  );
}
