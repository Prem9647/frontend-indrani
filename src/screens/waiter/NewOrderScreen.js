import { useCallback } from "react";
import { View, Text, Pressable } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Card, Badge, LoadingIndicator, ErrorBanner, EmptyState, PageHeader } from "../../components/ui";
import { useAsync } from "../../lib/useAsync";
import { tablesApi } from "../../api/tables.api";
import { colors } from "../../theme/colors";

// Table picker for starting a brand new order — deliberately shows only
// "available" tables (an occupied/reserved/maintenance table can't seat a
// new walk-in), unlike WaiterTablesScreen's full floor map. Tapping a table
// pushes the same OrderDetail (no orderId) new-order flow as tapping an
// available table there. See .claude/skills/restaurant-workflow/skill.md.
export function NewOrderScreen({ navigation }) {
  const {
    data: tables,
    loading,
    error,
    refetch,
  } = useAsync(async () => {
    const { data } = await tablesApi.list();
    return data;
  }, []);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  // Exclude the dedicated parcel table — it is started via the "Take Parcel"
  // button in WaiterTablesScreen, not from this dining-table picker.
  const availableTables = (tables ?? []).filter(
    (t) => t.status === "available" && t.tableNumber !== "parcel"
  );

  return (
    <Screen>
      <PageHeader
        left={
          <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
            <Ionicons name="arrow-back" size={20} color={colors.brand[700]} />
          </Pressable>
        }
        title="New Order"
        subtitle="Pick an available table to seat."
      />

      {loading ? <LoadingIndicator /> : null}
      <ErrorBanner message={error} />

      {!loading && availableTables.length === 0 ? (
        <EmptyState title="No available tables" subtitle="Every table is currently occupied, reserved, or under maintenance." />
      ) : (
        <View className="flex-row flex-wrap gap-3">
          {availableTables.map((table) => (
            <Pressable
              key={table._id}
              onPress={() =>
                navigation.navigate("OrderDetail", {
                  tableId: table._id,
                  tableNumber: table.tableNumber,
                  capacity: table.capacity,
                })
              }
              className="flex-1 min-w-[150px] max-w-[220px]"
            >
              <Card>
                <View className="flex-row items-start justify-between">
                  <Badge label="Available" tone="success" />
                  <View className="items-end">
                    <View className="flex-row items-center gap-1">
                      <Ionicons name="people-outline" size={12} color={colors.brand[400]} />
                      <Text className="text-xs font-bold text-brand-700">{table.capacity}</Text>
                    </View>
                    <Text className="text-[10px] text-brand-400">Seats</Text>
                  </View>
                </View>
                <View className="items-center justify-center py-5">
                  <View className="w-16 h-16 rounded-full bg-info-50 border-2 border-info-200 items-center justify-center">
                    <Text className="text-sm font-bold text-info-700">
                      T-{table.tableNumber}
                    </Text>
                  </View>
                </View>
              </Card>
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
}
