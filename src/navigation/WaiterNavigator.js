import { useWindowDimensions } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { buildTabScreenOptions } from "./tabScreenOptions";
import { WaiterShell } from "./WaiterShell";
import { WIDE_BREAKPOINT } from "./AdminShell";
import { WaiterTablesStack } from "./WaiterTablesStack";
import { WaiterDashboardScreen } from "../screens/waiter/WaiterDashboardScreen";

const Tab = createBottomTabNavigator();

const ICONS = {
  Dashboard: "grid-outline",
  Tables: "restaurant-outline",
};

function DashboardWithShell({ navigation }) {
  return (
    <WaiterShell activeRoute="Dashboard" navigation={navigation}>
      <WaiterDashboardScreen navigation={navigation} />
    </WaiterShell>
  );
}

// Plain bottom-tab navigator, unchanged from a phone's perspective. Wide
// (web/tablet) screens get a persistent sidebar + top bar via WaiterShell —
// mirrors AdminNavigator.js/ManagerNavigator.js exactly.
export function WaiterNavigator() {
  const { width } = useWindowDimensions();
  const isWide = width >= WIDE_BREAKPOINT;

  return (
    <Tab.Navigator
      screenOptions={(props) => ({
        ...buildTabScreenOptions(ICONS)(props),
        tabBarStyle: isWide ? { display: "none" } : undefined,
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardWithShell}
        options={isWide ? { headerShown: false } : undefined}
      />
      {/* headerShown: false — the nested stack manages its own header/back nav */}
      <Tab.Screen name="Tables" component={WaiterTablesStack} options={{ headerShown: false }} />
    </Tab.Navigator>
  );
}
