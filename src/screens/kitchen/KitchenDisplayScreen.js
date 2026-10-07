import { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, FlatList, ScrollView, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useKitchenQueue } from "./useKitchenQueue";
import { getSoundEnabled, setSoundEnabled, testKitchenAudio } from "../../lib/kitchenAudio";


// Public, unauthenticated, no interaction — a live FIFO queue meant to run
// unattended on a kitchen screen for a whole shift. Split into Dining and
// Parcel columns so the kitchen team can instantly tell which items go to
// the table vs the takeaway counter.
export function KitchenDisplayScreen({ navigation }) {
  const { orders, connected, loading } = useKitchenQueue();
  const { width } = useWindowDimensions();
  const [soundOn, setSoundOn] = useState(() => getSoundEnabled());
  const [now, setNow] = useState(Date.now());
  const isWide = width >= 700;

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(interval);
  }, []);

  // Separate orders into dining (table > 0) and parcel (table 0)
  const { diningItems, parcelItems } = useMemo(() => {
    const toItems = (orderList) =>
      orderList
        .flatMap((order) =>
          order.items
            .filter((item) => item.status !== "delivered")
            .map((item) => ({
              ...item,
              orderId: order.orderId,
              orderNumber: order.orderNumber,
              orderedAt: item.orderedAt || item.createdAt || order.orderedAt,
              tableNumber: order.tableNumber,
            }))
        )
        .sort((a, b) => new Date(a.orderedAt) - new Date(b.orderedAt));

    const dining = orders.filter((o) => o.tableNumber !== "parcel");
    const parcel = orders.filter((o) => o.tableNumber === "parcel");

    return { diningItems: toItems(dining), parcelItems: toItems(parcel) };
  }, [orders]);

  const renderColumn = ({ title, items, accent, icon }) => (
    <View style={{ flex: 1, minWidth: isWide ? 0 : "100%" }}>
      {/* Column Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: accent.headerBg,
          borderBottomWidth: 1,
          borderBottomColor: accent.border,
        }}
      >
        <Text style={{ fontSize: 18 }}>{icon}</Text>
        <Text style={{ color: accent.titleColor, fontWeight: "700", fontSize: 15, flex: 1 }}>
          {title}
        </Text>
        <View
          style={{
            backgroundColor: accent.badgeBg,
            paddingHorizontal: 10,
            paddingVertical: 3,
            borderRadius: 20,
          }}
        >
          <Text style={{ color: accent.badgeText, fontWeight: "700", fontSize: 12 }}>
            {items.length} item{items.length === 1 ? "" : "s"}
          </Text>
        </View>
      </View>

      {/* Item list */}
      {items.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 40 }}>
          <Text style={{ color: "#6b7280", fontSize: 14, textAlign: "center" }}>
            All clear — no items waiting.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => `${item.orderId}-${item.itemId}`}
          contentContainerStyle={{ padding: 12, gap: 10 }}
          renderItem={({ item }) => (
            <KitchenItemCard item={item} accent={accent} now={now} />
          )}
        />
      )}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#111827" }}>
      {/* Top bar */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: "#1f2937",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          {navigation.canGoBack() ? (
            <Pressable onPress={navigation.goBack} hitSlop={8}>
              <Text style={{ color: "#9ca3af", fontSize: 14 }}>← Exit</Text>
            </Pressable>
          ) : null}
          <Text style={{ color: "#fff", fontSize: 20, fontWeight: "600" }}>🍳 Kitchen Display</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Pressable
            onPress={() => {
              testKitchenAudio();
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
              backgroundColor: "#1f2937",
              borderWidth: 1,
              borderColor: "#374151",
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 8,
            }}
          >
            <Text style={{ fontSize: 13 }}>🔔</Text>
            <Text style={{ color: "#d1d5db", fontSize: 12, fontWeight: "600" }}>குரல் சோதனை (Test)</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              const next = !soundOn;
              setSoundOn(next);
              setSoundEnabled(next);
              if (next) {
                testKitchenAudio();
              }
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
              backgroundColor: soundOn ? "#064e3b" : "#450a0a",
              borderWidth: 1,
              borderColor: soundOn ? "#059669" : "#dc2626",
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 8,
            }}
          >
            <Text style={{ fontSize: 13 }}>{soundOn ? "🔊" : "🔇"}</Text>
            <Text style={{ color: soundOn ? "#6ee7b7" : "#fca5a5", fontSize: 12, fontWeight: "600" }}>
              {soundOn ? "குரல் ஆன் (ON)" : "மியூட் (Muted)"}
            </Text>
          </Pressable>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginLeft: 4 }}>
            <View
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: connected ? "#22c55e" : "#ef4444",
              }}
            />
            <Text style={{ color: "#9ca3af", fontSize: 13 }}>
              {connected ? "Live" : "Reconnecting…"}
            </Text>
          </View>
        </View>
      </View>

      {/* Two-column split */}
      {loading && diningItems.length === 0 && parcelItems.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: "#6b7280", fontSize: 16 }}>Loading orders…</Text>
        </View>
      ) : (
        <View style={{ flex: 1, flexDirection: isWide ? "row" : "column" }}>
          {/* Dining Column */}
          {renderColumn({
            title: "Dining",
            items: diningItems,
            icon: "🍽️",
            accent: {
              headerBg: "#1e3a5f",
              border: "#1e40af",
              titleColor: "#93c5fd",
              badgeBg: "#1d4ed8",
              badgeText: "#eff6ff",
            },
          })}

          {/* Divider */}
          {isWide && (
            <View style={{ width: 2, backgroundColor: "#374151" }} />
          )}

          {/* Parcel Column */}
          {renderColumn({
            title: "Parcel / Takeaway",
            items: parcelItems,
            icon: "📦",
            accent: {
              headerBg: "#3b1a00",
              border: "#92400e",
              titleColor: "#fcd34d",
              badgeBg: "#b45309",
              badgeText: "#fffbeb",
            },
          })}
        </View>
      )}
    </SafeAreaView>
  );
}

function KitchenItemCard({ item, accent, now }) {
  const cancelled = item.status === "cancelled";

  const currentTime = now || Date.now();
  const timeSinceMins = item.orderedAt
    ? Math.max(0, Math.floor((currentTime - new Date(item.orderedAt).getTime()) / 60000))
    : null;

  const urgencyColor =
    timeSinceMins === null
      ? "#6b7280"
      : timeSinceMins >= 15
      ? "#ef4444"
      : timeSinceMins >= 8
      ? "#f59e0b"
      : "#22c55e";

  return (
    <View
      style={{
        backgroundColor: cancelled ? "#1f2937" : "#1f2937",
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: cancelled ? "#374151" : accent.border,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        opacity: cancelled ? 0.5 : 1,
      }}
    >
      <View style={{ flex: 1, paddingRight: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {/* Urgency dot */}
          {!cancelled && (
            <View
              style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: urgencyColor }}
            />
          )}
          <Text
            style={{
              color: cancelled ? "#6b7280" : "#f9fafb",
              fontSize: 16,
              fontWeight: "600",
              textDecorationLine: cancelled ? "line-through" : "none",
              flex: 1,
            }}
          >
            {item.name}{" "}
            <Text style={{ color: cancelled ? "#4b5563" : "#9ca3af", fontWeight: "400" }}>
              ×{item.quantity}
            </Text>
          </Text>
        </View>
      </View>

      {/* Right side */}
      {cancelled ? (
        <View
          style={{
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 20,
            backgroundColor: "#450a0a",
          }}
        >
          <Text style={{ color: "#f87171", fontSize: 12, fontWeight: "700" }}>Cancelled</Text>
        </View>
      ) : (
        <View style={{ alignItems: "flex-end", gap: 4 }}>
          <Text style={{ color: urgencyColor, fontSize: 13, fontWeight: "700" }}>
            {timeSinceMins === 0 ? "just now" : `${timeSinceMins}m`}
          </Text>
          <Text style={{ color: "#4b5563", fontSize: 10 }}>waiting</Text>
        </View>
      )}
    </View>
  );
}
