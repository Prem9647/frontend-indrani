import { useCallback } from "react";
import { View, Text, Pressable } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Card, Badge, LoadingIndicator, ErrorBanner, EmptyState, PageHeader } from "../../components/ui";
import { useAsync } from "../../lib/useAsync";
import { ordersApi } from "../../api/orders.api";
import { getOrderStatusMeta } from "../../theme/status";
import { colors } from "../../theme/colors";
import { InlineOrderManager, InlineNewOrderForm } from "./InlineOrderPanels";
import { LayoutAnimation, UIManager, Platform } from "react-native";

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function formatMoney(value) {
  return `₹${(value ?? 0).toFixed(2)}`;
}

function formatTime(value) {
  return new Date(value).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

// Hub screen for an occupied table — a table can now carry several
// concurrent orders (multiple customers sharing/splitting the table, see
// .claude/skills/restaurant-workflow), so tapping an occupied table on
// WaiterTablesScreen lands here instead of jumping straight into a single
// order. Each row opens that customer's OrderDetail; "Add New Customer"
// starts a fresh order on the same table without disturbing the others.
export function TableOrdersScreen({ route, navigation }) {
  const { tableId, tableNumber, capacity } = route.params;
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [addingCustomer, setAddingCustomer] = useState(false);

  const toggleExpand = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedOrderId((prev) => (prev === id ? null : id));
    setAddingCustomer(false);
  };

  const toggleAddingCustomer = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setAddingCustomer((prev) => !prev);
    setExpandedOrderId(null);
  };

  const {
    data: orders,
    loading,
    error,
    refetch,
  } = useAsync(async () => {
    const { data } = await ordersApi.list({ tableId, excludeClosed: true, sort: "asc" });
    return data;
  }, [tableId]);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  return (
    <Screen>
      <PageHeader
        left={
          <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
            <Ionicons name="arrow-back" size={20} color={colors.brand[700]} />
          </Pressable>
        }
        title={`Table ${tableNumber}`}
        badge={<Badge label="Occupied" tone="danger" />}
        subtitle={capacity ? `${capacity} Seats` : null}
      />

      {loading ? <LoadingIndicator /> : null}
      <ErrorBanner message={error} />

      {!loading && orders?.length === 0 ? (
        <EmptyState title="No active orders" subtitle="Add a customer to start an order at this table." />
      ) : null}

      <View className="gap-3 max-w-[560px]">
        {(orders ?? []).map((order) => {
          const statusMeta = getOrderStatusMeta(order.status);
          const isExpanded = expandedOrderId === order._id;
          return (
            <View key={order._id} className="relative">
              <Pressable
                onPress={() => toggleExpand(order._id)}
              >
                <Card className={`gap-2 ${isExpanded ? "border-b-0 rounded-b-none" : ""}`}>
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm font-bold text-primary-700">#{order.orderNumber}</Text>
                    <Badge label={statusMeta.label} tone={statusMeta.tone} />
                  </View>
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      <Ionicons name="person-outline" size={14} color={colors.brand[400]} />
                      <Text className="text-sm font-semibold text-brand-900">
                        {order.customerId?.name ?? "—"}
                        {order.seatNumber ? ` (Seat ${order.seatNumber})` : ""}
                      </Text>
                    </View>
                    <Text className="text-xs text-brand-400">{formatTime(order.orderedAt)}</Text>
                  </View>
                  <View className="flex-row items-center justify-between mt-1">
                    <Text className="text-sm font-bold text-brand-900">{formatMoney(order.totalAmount)}</Text>
                    <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color={colors.brand[400]} />
                  </View>
                </Card>
              </Pressable>
              {isExpanded ? (
                <View className="px-4 py-3 bg-white border border-t-0 border-brand-200 rounded-b-xl overflow-hidden">
                  <InlineOrderManager orderId={order._id} onChanged={refetch} />
                </View>
              ) : null}
            </View>
          );
        })}

        {addingCustomer ? (
          <View className="bg-white border border-brand-200 rounded-xl px-4 py-3">
            <InlineNewOrderForm
              tableId={tableId}
              onCancel={toggleAddingCustomer}
              onCreated={(newOrderId) => {
                refetch();
                toggleExpand(newOrderId);
              }}
            />
          </View>
        ) : (
          <Pressable
            onPress={toggleAddingCustomer}
            className="border border-dashed border-brand-300 rounded-lg py-3.5 flex-row items-center justify-center gap-2"
          >
            <Ionicons name="person-add-outline" size={16} color={colors.primary[700]} />
            <Text className="text-sm font-semibold text-primary-700">Add New Customer</Text>
          </Pressable>
        )}
      </View>
    </Screen>
  );
}
