import { View, useWindowDimensions } from "react-native";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { WIDE_BREAKPOINT } from "./AdminShell";

const MANAGER_ROUTES = [
  { name: "Dashboard", icon: "grid-outline" },
  { name: "Customers", icon: "people-outline" },
  { name: "Tables", icon: "restaurant-outline" },
  { name: "Menu", icon: "book-outline" },
  { name: "Billing", icon: "receipt-outline" },
  { name: "Analytics", icon: "analytics-outline" },
];

// Manager equivalent of AdminShell.js — same persistent sidebar + top bar on
// wide (web/tablet) viewports, same Sidebar.js/TopBar.js, just Manager's own
// route list: no Users — that stays Admin-only.
export function ManagerShell({ activeRoute, navigation, children }) {
  const { width } = useWindowDimensions();
  const isWide = width >= WIDE_BREAKPOINT;

  if (!isWide) return children;

  return (
    <View style={{ flex: 1, flexDirection: "column" }}>
      <TopBar />
      <View style={{ flex: 1, flexDirection: "row" }}>
        <Sidebar routes={MANAGER_ROUTES} activeRoute={activeRoute} navigation={navigation} />
        <View style={{ flex: 1 }}>{children}</View>
      </View>
    </View>
  );
}
