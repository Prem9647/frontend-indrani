import { useWindowDimensions } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { buildTabScreenOptions } from "./tabScreenOptions";
import { ManagerShell } from "./ManagerShell";
import { WIDE_BREAKPOINT } from "./AdminShell";
import { ManagerDashboardScreen } from "../screens/manager/ManagerDashboardScreen";
import { ManagerCustomersStack } from "./ManagerCustomersStack";
import { ManagerTablesStack } from "./ManagerTablesStack";
import { ManagerMenuStack } from "./ManagerMenuStack";
import { ManagerBillingStack } from "./ManagerBillingStack";
import { ItemAnalyticsScreen } from "../screens/admin/ItemAnalyticsScreen";

const Tab = createBottomTabNavigator();

const ICONS = {
  Dashboard: "grid-outline",
  Customers: "people-outline",
  Tables: "restaurant-outline",
  Menu: "book-outline",
  Billing: "receipt-outline",
  Analytics: "analytics-outline",
};

function DashboardWithShell({ navigation }) {
  return (
    <ManagerShell activeRoute="Dashboard" navigation={navigation}>
      <ManagerDashboardScreen navigation={navigation} />
    </ManagerShell>
  );
}

function AnalyticsWithShell({ navigation }) {
  return (
    <ManagerShell activeRoute="Analytics" navigation={navigation}>
      <ItemAnalyticsScreen navigation={navigation} />
    </ManagerShell>
  );
}

// Plain bottom-tab navigator, unchanged from a phone's perspective. Wide
// (web/tablet) screens get a persistent sidebar + top bar via ManagerShell —
// mirrors AdminNavigator.js exactly, just with Manager's route list (no
// Users — see ManagerShell.js). Customers/Tables/Menu/Billing each reuse or
// own their screen via a ManagerXStack.js wrapper — see those files. Billing
// is Manager-only and deliberately not wired into AdminNavigator.js at all.
export function ManagerNavigator() {
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
      {/* headerShown: false — each nested stack manages its own header/back nav */}
      <Tab.Screen name="Customers" component={ManagerCustomersStack} options={{ headerShown: false }} />
      <Tab.Screen name="Tables" component={ManagerTablesStack} options={{ headerShown: false }} />
      <Tab.Screen name="Menu" component={ManagerMenuStack} options={{ headerShown: false }} />
      <Tab.Screen name="Billing" component={ManagerBillingStack} options={{ headerShown: false }} />
      <Tab.Screen name="Analytics" component={AnalyticsWithShell} options={{ headerShown: false }} />
    </Tab.Navigator>
  );
}
