import { View, useWindowDimensions } from "react-native";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

const WIDE_BREAKPOINT = 768;

const ADMIN_ROUTES = [
  { name: "Dashboard", icon: "grid-outline" },
  { name: "Customers", icon: "people-circle-outline" },
  { name: "Users", icon: "people-outline" },
  { name: "Tables", icon: "restaurant-outline" },
  { name: "Menu", icon: "book-outline" },
  { name: "Analytics", icon: "analytics-outline" },
];

// Wraps each Admin tab's root screen with the persistent sidebar + top bar
// on wide (web/tablet) viewports. On phones it's a no-op passthrough — the
// normal bottom tab bar and native per-screen header take over instead (see
// AdminNavigator.js). See ManagerShell.js for the Manager equivalent — both
// share Sidebar.js/TopBar.js, just with a different route list.
//
// This is deliberately NOT built on bottom-tabs' tabBarPosition="left" +
// custom tabBar — that combination renders correctly but the scene
// container's height resolves to 0 on web (the column-flex chain that
// works in the default "bottom" layout doesn't carry over to row mode,
// and `sceneStyle: {flex:1}` doesn't fix it either). Plain navigation.navigate()
// calls sidestep the whole area, same as the existing cross-tab Quick Actions.
export function AdminShell({ activeRoute, navigation, children }) {
  const { width } = useWindowDimensions();
  const isWide = width >= WIDE_BREAKPOINT;

  if (!isWide) return children;

  return (
    <View style={{ flex: 1, flexDirection: "column" }}>
      <TopBar />
      <View style={{ flex: 1, flexDirection: "row" }}>
        <Sidebar routes={ADMIN_ROUTES} activeRoute={activeRoute} navigation={navigation} />
        <View style={{ flex: 1 }}>{children}</View>
      </View>
    </View>
  );
}

export { WIDE_BREAKPOINT };
