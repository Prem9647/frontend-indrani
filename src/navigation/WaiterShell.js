import { View, useWindowDimensions } from "react-native";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { WIDE_BREAKPOINT } from "./AdminShell";

const WAITER_ROUTES = [
  { name: "Dashboard", icon: "grid-outline" },
  { name: "Tables", icon: "restaurant-outline" },
];

// Waiter equivalent of AdminShell.js/ManagerShell.js — same persistent
// sidebar + top bar on wide (web/tablet) viewports, same Sidebar.js/TopBar.js,
// just Waiter's own (shortest) route list.
export function WaiterShell({ activeRoute, navigation, children }) {
  const { width } = useWindowDimensions();
  const isWide = width >= WIDE_BREAKPOINT;

  if (!isWide) return children;

  return (
    <View style={{ flex: 1, flexDirection: "column" }}>
      <TopBar />
      <View style={{ flex: 1, flexDirection: "row" }}>
        <Sidebar routes={WAITER_ROUTES} activeRoute={activeRoute} navigation={navigation} />
        <View style={{ flex: 1 }}>{children}</View>
      </View>
    </View>
  );
}
