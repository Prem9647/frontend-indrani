import { useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen, PageHeader, Card, LoadingIndicator, ErrorBanner } from "../../components/ui";
import { useAsync } from "../../lib/useAsync";
import { reportsApi } from "../../api/reports.api";
import { menuItemsApi } from "../../api/menuItems.api";
import { colors } from "../../theme/colors";

function formatMoney(value) {
  return `₹${(value ?? 0).toFixed(2)}`;
}

export function ItemAnalyticsScreen() {
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [period, setPeriod] = useState("daily");
  
  const { data: menuData, loading: menuLoading, error: menuError } = useAsync(async () => {
    const res = await menuItemsApi.list();
    return res.data;
  }, []);
  
  const menuItems = menuData || [];

  const { data: popularData } = useAsync(async () => {
    const res = await reportsApi.popularItems(1);
    return res.data;
  }, []);
  
  const mostOrderedItem = popularData?.[0];

  const { data: trendData, loading: trendLoading, error: trendError } = useAsync(async () => {
    if (!selectedItemId) return [];
    const res = await reportsApi.itemSales(selectedItemId, period);
    return res.data;
  }, [selectedItemId, period]);

  const maxSales = useMemo(() => {
    if (!trendData || trendData.length === 0) return 1;
    return Math.max(1, ...trendData.map((d) => d.totalQuantity));
  }, [trendData]);

  const selectedItemName = useMemo(() => {
    return menuItems.find((m) => m._id === selectedItemId)?.name ?? "Select an item";
  }, [menuItems, selectedItemId]);

  return (
    <Screen>
      <PageHeader 
        title="Item Analytics" 
        subtitle="Track day-wise and month-wise sales for specific items." 
      />
      
      {mostOrderedItem && (
        <Card className="mb-6 bg-primary-50 border-primary-200">
          <View className="flex-row items-center gap-4 p-2">
            <View className="w-12 h-12 bg-primary-100 rounded-full items-center justify-center">
              <Ionicons name="trophy-outline" size={24} color={colors.primary[700]} />
            </View>
            <View>
              <Text className="text-sm font-semibold text-primary-700 uppercase tracking-widest">Most Ordered All-Time</Text>
              <Text className="text-xl font-bold text-primary-900 mt-1">{mostOrderedItem.name}</Text>
              <Text className="text-sm text-primary-600">{mostOrderedItem.totalQuantity} total orders</Text>
            </View>
          </View>
        </Card>
      )}

      {menuLoading ? <LoadingIndicator /> : null}
      <ErrorBanner message={menuError} />

      <View className="flex-row flex-wrap gap-5">
        <View style={{ flexGrow: 1, flexShrink: 1, flexBasis: 300 }}>
          <Card className="!p-0 h-[600px] overflow-hidden">
            <View className="p-4 border-b border-brand-100 bg-brand-50">
              <Text className="text-base font-semibold text-brand-900">Menu Items</Text>
              <Text className="text-sm text-brand-500">Select an item to view its trend</Text>
            </View>
            <ScrollView>
              {menuItems.map(item => (
                <Pressable
                  key={item._id}
                  onPress={() => setSelectedItemId(item._id)}
                  className={`px-4 py-3 border-b border-brand-50 flex-row items-center justify-between ${
                    selectedItemId === item._id ? 'bg-primary-50' : 'bg-white'
                  }`}
                >
                  <Text className={`text-sm font-medium ${selectedItemId === item._id ? 'text-primary-800' : 'text-brand-700'}`}>
                    {item.name}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={selectedItemId === item._id ? colors.primary[400] : colors.brand[300]} />
                </Pressable>
              ))}
            </ScrollView>
          </Card>
        </View>
        
        <View style={{ flexGrow: 2, flexShrink: 1, flexBasis: 500 }}>
          <Card className="h-[600px] p-5">
            {!selectedItemId ? (
              <View className="flex-1 items-center justify-center">
                <Ionicons name="analytics-outline" size={48} color={colors.brand[200]} />
                <Text className="text-brand-500 mt-4 text-center">Select an item from the list to see its sales history.</Text>
              </View>
            ) : (
              <View className="flex-1">
                <View className="flex-row items-center justify-between mb-6">
                  <View>
                    <Text className="text-xl font-bold text-brand-900">{selectedItemName}</Text>
                    <Text className="text-sm text-brand-500">Sales Trend</Text>
                  </View>
                  <View className="flex-row bg-brand-100 rounded-lg p-1">
                    {["daily", "monthly"].map((p) => {
                      const isActive = period === p;
                      return (
                        <Pressable
                          key={p}
                          onPress={() => setPeriod(p)}
                          style={[
                            { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 6 },
                            isActive ? { backgroundColor: "#ffffff" } : { backgroundColor: "transparent" },
                          ]}
                        >
                          <Text
                            style={[
                              { fontSize: 12, fontWeight: "600" },
                              isActive ? { color: colors.primary[700] } : { color: colors.brand[500] },
                            ]}
                          >
                            {p === "daily" ? "Day-wise" : "Month-wise"}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {trendLoading ? <LoadingIndicator /> : null}
                <ErrorBanner message={trendError} />

                {!trendLoading && !trendError && trendData && trendData.length === 0 ? (
                  <View className="flex-1 items-center justify-center">
                    <Text className="text-brand-500">No sales recorded in this period.</Text>
                  </View>
                ) : null}

                {!trendLoading && !trendError && trendData && trendData.length > 0 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4">
                    <View className="flex-row items-end gap-3 px-2 h-[400px]">
                      {trendData.map((d, i) => {
                        const barHeight = Math.max(10, Math.round((d.totalQuantity / maxSales) * 300));
                        let dateLabel = d.date;
                        if (d.date) {
                          const parts = String(d.date).split("-");
                          if (parts.length === 3) {
                            dateLabel = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])).toLocaleDateString(undefined, { month: "short", day: "numeric" });
                          } else if (parts.length === 2) {
                            dateLabel = new Date(Number(parts[0]), Number(parts[1]) - 1, 1).toLocaleDateString(undefined, { month: "short", year: "2-digit" });
                          }
                        }
                        return (
                          <View key={d.date || i} className="items-center justify-end" style={{ width: 48, height: '100%' }}>
                            <Text className="text-[10px] font-semibold text-brand-700 mb-1">{d.totalQuantity}</Text>
                            <View
                              style={{
                                height: barHeight,
                                width: 32,
                                borderTopLeftRadius: 4,
                                borderTopRightRadius: 4,
                                backgroundColor: colors.primary[500],
                              }}
                            />
                            <Text className="text-[10px] text-brand-500 mt-2 text-center" style={{ width: 60 }}>
                              {dateLabel}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </ScrollView>
                ) : null}
              </View>
            )}
          </Card>
        </View>
      </View>
    </Screen>
  );
}
