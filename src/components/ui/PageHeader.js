import { View, Text, useWindowDimensions } from "react-native";
import { WIDE_BREAKPOINT } from "../../navigation/AdminShell";

// Page topic — the full name of the page (e.g. "Table Management") plus a
// one-line description, as plain body content at the top of the page, below
// the native header (see headerOptions.js), which keeps the short tab name
// (e.g. "Tables") + Log out. Rendered on every width.
export function PageHeader({ title, subtitle, left, right, badge }) {
  const { width } = useWindowDimensions();
  const isWide = width >= WIDE_BREAKPOINT;

  return (
    <View className={`flex-row items-center justify-between ${isWide ? "mb-5" : "flex-wrap gap-y-2 mb-3"}`}>
      <View className="flex-row items-center flex-1 pr-3">
        {left ? <View className="mr-3">{left}</View> : null}
        <View className="flex-1">
          <View className="flex-row items-center gap-2.5 flex-wrap">
            {typeof title === "string" ? (
              <Text className={isWide ? "text-2xl font-semibold text-brand-900" : "text-lg font-semibold text-brand-900"}>
                {title}
              </Text>
            ) : (
              title
            )}
            {badge ? badge : null}
          </View>
          {typeof subtitle === "string" ? (
            <Text className="text-sm text-brand-500 mt-1">{subtitle}</Text>
          ) : subtitle ? (
            subtitle
          ) : null}
        </View>
      </View>
      {right ? <View>{right}</View> : null}
    </View>
  );
}
