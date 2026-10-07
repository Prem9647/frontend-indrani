import { useEffect } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuthStore } from "../stores/authStore";
import { LoadingIndicator } from "../components/ui";
import { LoginScreen } from "../screens/auth/LoginScreen";
import { KitchenDisplayScreen } from "../screens/kitchen/KitchenDisplayScreen";
import { AdminNavigator } from "./AdminNavigator";
import { ManagerNavigator } from "./ManagerNavigator";
import { WaiterNavigator } from "./WaiterNavigator";

const Stack = createNativeStackNavigator();

function RoleNavigator() {
  const role = useAuthStore((s) => s.user?.role);
  if (role === "admin") return <AdminNavigator />;
  if (role === "manager") return <ManagerNavigator />;
  return <WaiterNavigator />;
}

// Auth gating lives here, once: which stack renders depends only on
// authStore.status, so no individual screen needs to guard itself.
export function RootNavigator() {
  const status = useAuthStore((s) => s.status);
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (status === "idle") {
    return <LoadingIndicator fullScreen />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {status === "authenticated" ? (
        <Stack.Screen name="App" component={RoleNavigator} />
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
      <Stack.Screen name="KitchenDisplay" component={KitchenDisplayScreen} />
    </Stack.Navigator>
  );
}
