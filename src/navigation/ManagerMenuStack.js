import { useWindowDimensions } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { LogoutButton } from "../components/LogoutButton";
import { ManagerShell } from "./ManagerShell";
import { WIDE_BREAKPOINT } from "./AdminShell";
import { PAGE_HEADER_SCREEN_OPTIONS } from "./headerOptions";
import { MenuScreen } from "../screens/admin/MenuScreen";

const Stack = createNativeStackNavigator();

// Reuses the exact same MenuScreen (and its Add/EditCategoryCard,
// Add/EditMenuItemCard modals) as AdminMenuStack.js — the screen has no
// admin-specific logic, and the backend already authorizes "manager" for
// category/menu-item CRUD (menu management has always been a Manager
// capability, see CLAUDE.md). Only the Shell wrapper differs (ManagerShell
// vs AdminShell) so Manager gets its own sidebar/topbar instead of Admin's.
function MenuScreenWithShell({ navigation, route }) {
  return (
    <ManagerShell activeRoute="Menu" navigation={navigation}>
      <MenuScreen navigation={navigation} route={route} />
    </ManagerShell>
  );
}

// On narrow, the native header (title + Log out, styled to match every
// other page — see headerOptions.js) is the only header; on wide,
// ManagerShell's persistent Sidebar/TopBar replaces it.
export function ManagerMenuStack() {
  const { width } = useWindowDimensions();
  const isWide = width >= WIDE_BREAKPOINT;

  return (
    <Stack.Navigator screenOptions={{ ...PAGE_HEADER_SCREEN_OPTIONS, headerRight: () => <LogoutButton /> }}>
      <Stack.Screen
        name="MenuHome"
        component={MenuScreenWithShell}
        options={isWide ? { headerShown: false } : { title: "Menu" }}
      />
    </Stack.Navigator>
  );
}
