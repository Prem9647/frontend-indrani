import { useWindowDimensions } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { LogoutButton } from "../components/LogoutButton";
import { AdminShell, WIDE_BREAKPOINT } from "./AdminShell";
import { PAGE_HEADER_SCREEN_OPTIONS } from "./headerOptions";
import { TablesListScreen } from "../screens/admin/TablesListScreen";

const Stack = createNativeStackNavigator();

function TablesListWithShell({ navigation, route }) {
  return (
    <AdminShell activeRoute="Tables" navigation={navigation}>
      <TablesListScreen navigation={navigation} route={route} />
    </AdminShell>
  );
}

// Single-screen stack (Add/Edit are modal cards, not routed pages — see
// AddTableCard.js/EditTableCard.js). On narrow, the native header (title +
// Log out, styled to match every other page — see headerOptions.js) is the
// only header; on wide, AdminShell's persistent Sidebar/TopBar replaces it,
// so it's hidden there instead.
export function AdminTablesStack() {
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
