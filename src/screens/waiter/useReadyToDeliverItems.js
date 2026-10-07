import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { SOCKET_URL } from "../../lib/env";
import { ordersApi } from "../../api/orders.api";
import { useAuthStore } from "../../stores/authStore";

// Flattens orders + their items into one row per still-deliverable line
// item (see .claude/skills/restaurant-workflow/skill.md — item status is
// independent per line: preparing/ready/delivered/cancelled). Delivered and
// cancelled items are both excluded — a cancelled item would otherwise sit
// in this queue forever (it never transitions to "delivered" on its own)
// and deliverOrderItem rejects it server-side anyway. Sorted oldest-order-
// first (FIFO). Skips "waiting_for_billing"/"closed" orders — once the
// waiter has requested the bill, the order is locked (deliverOrderItem
// would reject it server-side too — see order.service.js's
// assertOrderMutable), so those items shouldn't be offered as deliverable
// here either.
function buildDeliveryQueue(orders) {
  const rows = [];
  for (const order of orders) {
    if (order.status === "waiting_for_billing" || order.status === "closed") continue;
    for (const item of order.items ?? []) {
      if (item.status === "delivered" || item.status === "cancelled") continue;
      rows.push({
        key: item._id,
        orderId: order._id,
        orderItemId: item._id,
        orderNumber: order.orderNumber,
        tableNumber: order.tableId?.tableNumber,
        customerName: order.customerId?.name,
        seatNumber: order.seatNumber,
        itemName: item.menuItemId?.name,
        quantity: item.quantity,
        orderedAt: order.orderedAt,
      });
    }
  }
  return rows.sort((a, b) => new Date(a.orderedAt) - new Date(b.orderedAt));
}

// Real-time "ready to deliver" queue for the waiter dashboard: a REST
// snapshot for the initial load, then Socket.IO keeps it live in between —
// same pattern as the Kitchen Display's useKitchenQueue.js (see
// .claude/skills/socketio/skill.md). Every order-lifecycle event just
// triggers a fresh snapshot rather than patching state incrementally; the
// active-order volume here is small enough that correctness beats shaving
// a request, and a reconnecting client can't assume it caught every event
// it missed anyway.
export function useReadyToDeliverItems() {
  const token = useAuthStore((s) => s.token);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);

  const loadSnapshot = useCallback(async () => {
    try {
      const { data: orders } = await ordersApi.list({
        excludeClosed: true,
        includeItems: true,
        sort: "asc",
        limit: 200,
      });
      setRows(buildDeliveryQueue(orders));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!token) return undefined;
    let cancelled = false;
    loadSnapshot();

    const socket = io(SOCKET_URL, { auth: { channel: "dashboard", token } });
    socketRef.current = socket;

    const refresh = () => {
      if (!cancelled) loadSnapshot();
    };
    socket.on("connect", () => {
      setConnected(true);
      refresh();
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on("order:created", refresh);
    socket.on("order:updated", refresh);
    socket.on("order:item-delivered", refresh);
    socket.on("order:status-changed", refresh);

    return () => {
      cancelled = true;
      socket.disconnect();
    };
  }, [token, loadSnapshot]);

  // Optimistic: the tapped row disappears immediately rather than waiting
  // on the API round-trip + socket-triggered refetch. On failure, the
  // snapshot reload puts it back.
  async function deliverItem(row) {
    setRows((prev) => prev.filter((r) => r.key !== row.key));
    try {
      await ordersApi.deliverItem(row.orderId, row.orderItemId);
    } catch (err) {
      await loadSnapshot();
      throw err;
    }
  }

  return { rows, loading, connected, deliverItem, refetch: loadSnapshot };
}
