import { View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Consistent page shell: safe-area padding, formal white/slate background,
// optional scroll. Every screen renders through this rather than a bare View.
export function Screen({ children, scroll = true, className = "" }) {
  const Container = scroll ? ScrollView : View;
  const containerProps = scroll
    ? { contentContainerStyle: { flexGrow: 1 }, keyboardShouldPersistTaps: "handled" }
    : { style: { flex: 1 } };

  return (
    <SafeAreaView className="flex-1 bg-brand-50" edges={["top", "left", "right"]}>
      <Container {...containerProps}>
        {/* flex-1 only when NOT scrolling — on a ScrollView child it forces
            content to the viewport's height instead of its natural (taller)
            height, clipping anything below the fold and breaking scrolling. */}
        <View className={`${scroll ? "" : "flex-1"} px-4 py-4 ${className}`}>{children}</View>
      </Container>
    </SafeAreaView>
  );
}
