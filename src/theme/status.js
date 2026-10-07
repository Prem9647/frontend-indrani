// Single source of truth for order/table status → label + color tone.
// Reused by every screen that renders a status so the mapping never drifts
// between the waiter table grid, manager dashboard, and order detail views.
// See .claude/skills/ui-design/skill.md and .claude/skills/restaurant-workflow/skill.md.

// Order status (aside from waiting_for_billing/closed) is derived from item
// statuses, not manually set — see server/src/constants/orderStatus.js.
export const ORDER_STATUS_META = {
  created: { label: "Created", tone: "brand" },
  preparing: { label: "Preparing", tone: "warning" },
  partially_delivered: { label: "Partially Delivered", tone: "info" },
  delivered: { label: "Delivered", tone: "success" },
  waiting_for_billing: { label: "Waiting for Billing", tone: "primary" },
  closed: { label: "Closed", tone: "brand" },
};

// Per-item delivery status — independent per line, distinct from the
// order's own status above. "ready" isn't set by anything yet (no
// kitchen-side actor exists to set it) but stays in the palette so the
// badge is ready the moment that trigger gets added.
export const ITEM_STATUS_META = {
  preparing: { label: "Preparing", tone: "warning" },
  ready: { label: "Ready", tone: "info" },
  delivered: { label: "Delivered", tone: "success" },
  cancelled: { label: "Cancelled", tone: "danger" },
};

export const TABLE_STATUS_META = {
  available: { label: "Available", tone: "success" },
  occupied: { label: "Occupied", tone: "danger" },
  reserved: { label: "Reserved", tone: "warning" },
  maintenance: { label: "Maintenance", tone: "secondary" },
};

export function getOrderStatusMeta(status) {
  return ORDER_STATUS_META[status] ?? { label: status, tone: "brand" };
}

export function getItemStatusMeta(status) {
  return ITEM_STATUS_META[status] ?? { label: status, tone: "brand" };
}

export function getTableStatusMeta(status) {
  return TABLE_STATUS_META[status] ?? { label: status, tone: "brand" };
}
