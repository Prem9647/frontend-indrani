import { colors } from "../theme/colors";

// Shared native-header chrome for every top-level page (Dashboard, Tables,
// Customers, Menu, Billing, Users): a plain bold left-aligned title + Log
// out, nothing else. This is the *only* header on narrow screens — pages no
// longer duplicate the title in their own body (see PageHeader.js) — so
// every page reads identically to the Dashboard tab.
export const PAGE_HEADER_SCREEN_OPTIONS = {
  headerTitleStyle: { fontSize: 22, fontWeight: "700", color: colors.brand[900] },
  headerTitleAlign: "left",
  headerStyle: { backgroundColor: colors.white },
};
