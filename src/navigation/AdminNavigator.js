import { useWindowDimensions } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { buildTabScreenOptions } from "./tabScreenOptions";
import { AdminShell, WIDE_BREAKPOINT } from "./AdminShell";
import { AdminDashboardScreen } from "../screens/admin/AdminDashboardScreen";
import { AdminCustomersStack } from "./AdminCustomersStack";
import { AdminUsersStack } from "./AdminUsersStack";
import { AdminTablesStack } from "./AdminTablesStack";
import { AdminMenuStack } from "./AdminMenuStack";
import { ItemAnalyticsScreen } from "../screens/admin/ItemAnalyticsScreen";

const Tab = createBottomTabNavigator();

const ICONS = {
  Dashboard: "grid-outline",
  Customers: "people-circle-outline",
  Users: "people-outline",
  Tables: "restaurant-outline",
  Menu: "book-outline",
  Analytics: "analytics-outline",
};

function DashboardWithShell({ navigation }) {
  return (
    <AdminShell activeRoute="Dashboard" navigation={navigation}>
      <AdminDashboardScreen navigation={navigation} />
    </AdminShell>
  );
}

function AnalyticsWithShell({ navigation }) {
  return (
    <AdminShell activeRoute="Analytics" navigation={navigation}>
      <ItemAnalyticsScreen navigation={navigation} />
    </AdminShell>
  );
}

// Plain bottom-tab navigator, unchanged from a phone's perspective. Wide
// (web/tablet) screens get a persistent sidebar + top bar via AdminShell —
// see AdminShell.js for why this isn't done via bottom-tabs' own row-layout APIs.
export function AdminNavigator() {
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
      <Tab.Screen name="Customers" component={AdminCustomersStack} options={{ headerShown: false }} />
      <Tab.Screen name="Users" component={AdminUsersStack} options={{ headerShown: false }} />
      <Tab.Screen name="Tables" component={AdminTablesStack} options={{ headerShown: false }} />
      <Tab.Screen name="Menu" component={AdminMenuStack} options={{ headerShown: false }} />
      <Tab.Screen name="Analytics" component={AnalyticsWithShell} options={{ headerShown: false }} />
    </Tab.Navigator>
  );
}
