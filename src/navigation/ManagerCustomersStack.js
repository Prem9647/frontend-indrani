import { useWindowDimensions } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { LogoutButton } from "../components/LogoutButton";
import { ManagerShell } from "./ManagerShell";
import { WIDE_BREAKPOINT } from "./AdminShell";
import { PAGE_HEADER_SCREEN_OPTIONS } from "./headerOptions";
import { CustomersListScreen } from "../screens/admin/CustomersListScreen";

const Stack = createNativeStackNavigator();

function CustomersListWithShell({ navigation, route }) {
  return (
    <ManagerShell activeRoute="Customers" navigation={navigation}>
      <CustomersListScreen navigation={navigation} route={route} />
    </ManagerShell>
  );
}

// Single-screen stack (Add/Edit/History are modal cards, not routed pages —
// see AddCustomerCard.js/EditCustomerCard.js/CustomerHistoryCard.js).
// On narrow, the native header (title + Log out, styled to match every
// other page — see headerOptions.js) is the only header; on wide,
// ManagerShell's persistent Sidebar/TopBar replaces it.
export function ManagerCustomersStack() {
  const { width } = useWindowDimensions();
  const isWide = width >= WIDE_BREAKPOINT;

  return (
    <Stack.Navigator screenOptions={{ ...PAGE_HEADER_SCREEN_OPTIONS, headerRight: () => <LogoutButton /> }}>
      <Stack.Screen
        name="CustomersList"
        component={CustomersListWithShell}
        options={isWide ? { headerShown: false } : { title: "Customers" }}
      />
    </Stack.Navigator>
  );
}
