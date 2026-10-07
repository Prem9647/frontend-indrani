import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { SOCKET_URL } from "../../lib/env";
import { kitchenApi } from "../../api/kitchen.api";
import { announceKitchenOrder } from "../../lib/kitchenAudio";

// (No automatic removal of entire orders so cancelled items remain visible)
function upsert(list, payload) {
  const withoutExisting = list.filter((order) => order.orderId !== payload.orderId);
  return [...withoutExisting, payload].sort(
    (a, b) => new Date(a.orderedAt) - new Date(b.orderedAt)
  );
}

function markItemDelivered(list, orderId, itemId) {
  return list.map((order) => {
    if (order.orderId !== orderId) return order;
    return {
      ...order,
      items: order.items.map((item) => (item.itemId === itemId ? { ...item, status: "delivered" } : item)),
    };
  });
}

// Real-time Kitchen Display feed: REST snapshot for the initial FIFO queue
// (and on every reconnect, since a reconnecting client can't assume it
// caught every event it missed), then Socket.IO keeps it live in between.
// See .claude/skills/socketio/skill.md.
export function useKitchenQueue() {
  const [orders, setOrders] = useState([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef(null);
  const ordersRef = useRef([]);

  ordersRef.current = orders;

  useEffect(() => {
    let cancelled = false;

    async function loadSnapshot() {
      try {
        const { data } = await kitchenApi.getQueue();
        if (!cancelled) setOrders(data);
      } catch {
        // The socket connection below still drives live state even if this
        // initial/reconnect snapshot fetch fails on a transient blip.
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadSnapshot();

    const socket = io(SOCKET_URL, { auth: { channel: "kitchen" } });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      loadSnapshot();
    });
    socket.on("disconnect", () => setConnected(false));

    socket.on("order:created", (payload) => {
      announceKitchenOrder(payload, false);
      setOrders((prev) => upsert(prev, payload));
    });

    socket.on("order:updated", (payload) => {
      const existingOrder = ordersRef.current.find((o) => o.orderId === payload.orderId);
      if (existingOrder) {
        // Find only newly added items or items whose quantity increased
        const oldItemsMap = new Map((existingOrder.items || []).map((i) => [i.itemId || i._id, i]));
        const newOrAddedItems = [];

        for (const item of payload.items || []) {
          if (item.status === "cancelled") continue;
          const oldItem = oldItemsMap.get(item.itemId || item._id);
          if (!oldItem) {
            newOrAddedItems.push(item);
          } else if (item.quantity > oldItem.quantity) {
            newOrAddedItems.push({
              ...item,
              quantity: item.quantity - oldItem.quantity,
            });
          }
        }

        if (newOrAddedItems.length > 0) {
          announceKitchenOrder({ ...payload, items: newOrAddedItems }, true);
        }
      } else {
        announceKitchenOrder(payload, false);
      }

      setOrders((prev) => upsert(prev, payload));
    });

    socket.on("order:item-delivered", ({ orderId, itemId }) => {
      setOrders((prev) => markItemDelivered(prev, orderId, itemId));
    });

    return () => {
      cancelled = true;
      socket.disconnect();
    };
  }, []);

  return { orders, connected, loading };
}
