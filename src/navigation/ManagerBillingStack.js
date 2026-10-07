import { useWindowDimensions } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { LogoutButton } from "../components/LogoutButton";
import { ManagerShell } from "./ManagerShell";
import { WIDE_BREAKPOINT } from "./AdminShell";
import { PAGE_HEADER_SCREEN_OPTIONS } from "./headerOptions";
import { BillingScreen } from "../screens/admin/BillingScreen";

const Stack = createNativeStackNavigator();

function BillingWithShell({ navigation }) {
  return (
    <ManagerShell activeRoute="Billing" navigation={navigation}>
      <BillingScreen />
    </ManagerShell>
  );
}

// Manager-only — generating a bill is restricted to the "manager" role at
// the API level (order.routes.js), and this tab is deliberately not wired
// into AdminNavigator.js at all, unlike Customers/Tables/Menu.
// On narrow, the native header (title + Log out, styled to match every
// other page — see headerOptions.js) is the only header; on wide,
// ManagerShell's persistent Sidebar/TopBar replaces it.
export function ManagerBillingStack() {
  const { width } = useWindowDimensions();
  const isWide = width >= WIDE_BREAKPOINT;

  return (
    <Stack.Navigator screenOptions={{ ...PAGE_HEADER_SCREEN_OPTIONS, headerRight: () => <LogoutButton /> }}>
      <Stack.Screen
        name="BillingHome"
        component={BillingWithShell}
        options={isWide ? { headerShown: false } : { title: "Billing" }}
      />
    </Stack.Navigator>
  );
}
