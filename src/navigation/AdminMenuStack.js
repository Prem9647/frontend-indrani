import { useWindowDimensions } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { LogoutButton } from "../components/LogoutButton";
import { AdminShell, WIDE_BREAKPOINT } from "./AdminShell";
import { PAGE_HEADER_SCREEN_OPTIONS } from "./headerOptions";
import { MenuScreen } from "../screens/admin/MenuScreen";

const Stack = createNativeStackNavigator();

function MenuScreenWithShell({ navigation, route }) {
  return (
    <AdminShell activeRoute="Menu" navigation={navigation}>
      <MenuScreen navigation={navigation} route={route} />
    </AdminShell>
  );
}

// Single-screen stack (Add/Edit are modal cards, not routed pages — see
// AddCategoryCard.js/EditCategoryCard.js/AddMenuItemCard.js/EditMenuItemCard.js).
// On narrow, the native header (title + Log out, styled to match every
// other page — see headerOptions.js) is the only header; on wide,
// AdminShell's persistent Sidebar/TopBar replaces it.
export function AdminMenuStack() {
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
