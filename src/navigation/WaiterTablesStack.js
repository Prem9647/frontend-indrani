import { useWindowDimensions } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { LogoutButton } from "../components/LogoutButton";
import { WaiterShell } from "./WaiterShell";
import { WIDE_BREAKPOINT } from "./AdminShell";
import { PAGE_HEADER_SCREEN_OPTIONS } from "./headerOptions";
import { WaiterTablesScreen } from "../screens/waiter/WaiterTablesScreen";
import { TableOrdersScreen } from "../screens/waiter/TableOrdersScreen";
import { OrderDetailScreen } from "../screens/waiter/OrderDetailScreen";
import { AddOrderItemsScreen } from "../screens/waiter/AddOrderItemsScreen";
import { NewOrderScreen } from "../screens/waiter/NewOrderScreen";

const Stack = createNativeStackNavigator();

function TablesListWithShell({ navigation, route }) {
  return (
    <WaiterShell activeRoute="Tables" navigation={navigation}>
      <WaiterTablesScreen navigation={navigation} route={route} />
    </WaiterShell>
  );
}

// Nested inside the "Tables" tab so tapping a table can push the order
// screen without leaving the Waiter tab bar. See WaiterNavigator.js. On
// narrow, the root (list) screen's native header (title + Log out, styled to
// match every other page — see headerOptions.js) is the only header; on
// wide, WaiterShell's persistent Sidebar/TopBar replaces it, matching
// Admin/Manager's stacks. OrderDetail draws its own back button + title (see
// OrderDetailScreen.js) so its native header is hidden to avoid a duplicate
// one.
export function WaiterTablesStack() {
  const { width } = useWindowDimensions();
  const isWide = width >= WIDE_BREAKPOINT;

  return (
    <Stack.Navigator screenOptions={{ ...PAGE_HEADER_SCREEN_OPTIONS, headerRight: () => <LogoutButton /> }}>
      <Stack.Screen
        name="TablesList"
        component={TablesListWithShell}
        options={isWide ? { headerShown: false } : { title: "Tables" }}
      />
      <Stack.Screen name="TableOrders" component={TableOrdersScreen} options={{ title: "Table Orders", headerShown: !isWide }} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ title: "Order", headerShown: !isWide }} />
      <Stack.Screen name="NewOrder" component={NewOrderScreen} options={{ title: "New Order", headerShown: !isWide }} />
      <Stack.Screen
        name="AddOrderItems"
        component={AddOrderItemsScreen}
        options={{ title: "Add Items", headerShown: !isWide }}
      />
    </Stack.Navigator>
  );
}
