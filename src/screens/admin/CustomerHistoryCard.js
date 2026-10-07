import { useEffect, useState } from "react";
import { Modal, View, Text, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card, Badge, LoadingIndicator, ErrorBanner } from "../../components/ui";
import { reportsApi } from "../../api/reports.api";
import { getOrderStatusMeta } from "../../theme/status";
import { colors } from "../../theme/colors";

function formatMoney(value) {
  return `₹${(value ?? 0).toFixed(2)}`;
}

function formatDate(value) {
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// Read-only order history for one customer — reuses the existing
// GET /reports/customers/:id/orders endpoint (already built for reporting),
// just surfaced here as a quick lookup from the Customers table.
export function CustomerHistoryCard({ customer, visible, onClose }) {
  const [orders, setOrders] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (visible && customer) {
      setLoading(true);
      setError(null);
      reportsApi
        .customerOrderHistory(customer._id, 1, 20)
        .then(({ data }) => setOrders(data))
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    } else {
      setOrders(null);
    }
  }, [visible, customer]);

  if (!customer) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40 items-center justify-center p-4" onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()} className="w-full max-w-[480px]" style={{ maxHeight: "85%" }}>
          <Card className="gap-3">
            <View className="flex-row items-center justify-between mb-1">
              <View>
                <Text className="text-lg font-semibold text-brand-900">Order History</Text>
                <Text className="text-sm text-brand-500 mt-0.5">{customer.name}</Text>
              </View>
              <Pressable onPress={onClose} hitSlop={8}>
                <Ionicons name="close" size={20} color={colors.brand[500]} />
              </Pressable>
            </View>

            <ErrorBanner message={error} />
            {loading ? <LoadingIndicator /> : null}
            {!loading && orders?.length === 0 ? (
              <Text className="text-sm text-brand-500 py-4">No past orders yet.</Text>
            ) : null}

            {orders?.length ? (
              <ScrollView style={{ maxHeight: 360 }}>
                <View className="gap-2">
                  {orders.map((order) => {
                    const meta = getOrderStatusMeta(order.status);
                    return (
                      <View
                        key={order._id}
                        className="flex-row items-center justify-between px-3 py-2.5 rounded-lg bg-brand-50"
                      >
                        <View>
                          <Text className="text-sm font-bold text-primary-700">#{order.orderNumber}</Text>
                          <Text className="text-xs text-brand-500 mt-0.5">{formatDate(order.orderedAt)}</Text>
                        </View>
                        <View className="items-end gap-1">
                          <Text className="text-sm font-bold text-brand-900">
                            {formatMoney(order.finalAmount || order.totalAmount)}
                          </Text>
                          <Badge label={meta.label} tone={meta.tone} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            ) : null}
          </Card>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
