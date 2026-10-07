import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { LogoutButton } from "../components/LogoutButton";
import { PAGE_HEADER_SCREEN_OPTIONS } from "./headerOptions";

// Shared bottom-tab chrome for every role navigator — keeps Admin/Manager/
// Waiter visually identical apart from which tabs they expose, per the
// "shared component library, not forked per role" rule in ui-design skill.
export function buildTabScreenOptions(iconByRouteName) {
  return ({ route }) => ({
    headerShown: true,
    headerRight: () => <LogoutButton />,
    ...PAGE_HEADER_SCREEN_OPTIONS,
    tabBarActiveTintColor: colors.primary[700],
    tabBarInactiveTintColor: colors.brand[400],
    tabBarStyle: { borderTopColor: colors.brand[200], backgroundColor: colors.white },
    tabBarLabelStyle: { fontSize: 12, fontWeight: "500" },
    tabBarIcon: ({ color, size }) => (
      <Ionicons name={iconByRouteName[route.name]} size={size} color={color} />
    ),
  });
}
