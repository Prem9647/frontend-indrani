import { useWindowDimensions } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { LogoutButton } from "../components/LogoutButton";
import { AdminShell, WIDE_BREAKPOINT } from "./AdminShell";
import { PAGE_HEADER_SCREEN_OPTIONS } from "./headerOptions";
import { UsersListScreen } from "../screens/admin/UsersListScreen";
import { UserDetailsScreen } from "../screens/admin/UserDetailsScreen";

const Stack = createNativeStackNavigator();

function UsersListWithShell({ navigation, route }) {
  return (
    <AdminShell activeRoute="Users" navigation={navigation}>
      <UsersListScreen navigation={navigation} route={route} />
    </AdminShell>
  );
}

// Nested inside the "Users" tab so List -> Details can push without leaving
// the Admin tab bar. See WaiterTablesStack.js for the pattern this mirrors.
// Add/Edit are no longer routed screens — they're modal cards (AddUserCard/
// EditUserCard) rendered directly inside UsersListScreen/UserDetailsScreen.
// On narrow, UsersList's native header (title + Log out, styled to match
// every other page — see headerOptions.js) is the only header; on wide,
// AdminShell's persistent Sidebar/TopBar replaces it. UserDetails keeps its
// native header (with back button) on every width since it's a pushed
// screen, not a tab root.
export function AdminUsersStack() {
  const { width } = useWindowDimensions();
  const isWide = width >= WIDE_BREAKPOINT;

  return (
    <Stack.Navigator screenOptions={{ ...PAGE_HEADER_SCREEN_OPTIONS, headerRight: () => <LogoutButton /> }}>
      <Stack.Screen
        name="UsersList"
        component={UsersListWithShell}
        options={isWide ? { headerShown: false } : { title: "Users" }}
      />
      <Stack.Screen name="UserDetails" component={UserDetailsScreen} options={{ title: "User Details", headerShown: !isWide }} />
    </Stack.Navigator>
  );
}
