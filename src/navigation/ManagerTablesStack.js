import { useWindowDimensions } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { LogoutButton } from "../components/LogoutButton";
import { ManagerShell } from "./ManagerShell";
import { WIDE_BREAKPOINT } from "./AdminShell";
import { PAGE_HEADER_SCREEN_OPTIONS } from "./headerOptions";
import { TablesListScreen } from "../screens/admin/TablesListScreen";

const Stack = createNativeStackNavigator();

// Reuses the exact same TablesListScreen (and its AddTableCard/EditTableCard
// modals) as AdminTablesStack.js — the screen itself has no admin-specific
// logic, only the Shell wrapper differs (ManagerShell vs AdminShell) so
// Manager gets its own sidebar/topbar instead of Admin's.
function TablesListWithShell({ navigation, route }) {
  return (
    <ManagerShell activeRoute="Tables" navigation={navigation}>
      <TablesListScreen navigation={navigation} route={route} />
    </ManagerShell>
  );
}

// On narrow, the native header (title + Log out, styled to match every
// other page — see headerOptions.js) is the only header; on wide,
// ManagerShell's persistent Sidebar/TopBar replaces it.
export function ManagerTablesStack() {
  const { width } = useWindowDimensions();
  const isWide = width >= WIDE_BREAKPOINT;

  return (
    <Stack.Navigator screenOptions={{ ...PAGE_HEADER_SCREEN_OPTIONS, headerRight: () => <LogoutButton /> }}>
      <Stack.Screen
        name="TablesList"
        component={TablesListWithShell}
        options={isWide ? { headerShown: false } : { title: "Tables" }}
      />
    </Stack.Navigator>
  );
}
