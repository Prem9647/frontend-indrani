import kurals from "../constants/thirukkural.json";

/**
 * Returns a Thirukkural from the complete 1330 Kurals collection.
 * Uses order ID / order number to deterministically select a unique Kural per bill.
 */
export function getKuralForOrder(order) {
  if (!Array.isArray(kurals) || kurals.length === 0) {
    return {
      Number: 1,
      Line1: "அகர முதல எழுத்தெல்லாம் ஆதி",
      Line2: "பகவன் முதற்றே உலகு.",
      sp: "எழுத்துக்கள் எல்லாம் அகரத்தில் தொடங்குகின்றன; உலகம் கடவுளில் தொடங்குகிறது.",
    };
  }

  if (!order) {
    const randIndex = Math.floor(Math.random() * kurals.length);
    return kurals[randIndex];
  }

  const seed = `${order._id || ""}-${order.orderNumber || ""}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }

  const index = Math.abs(hash) % kurals.length;
  return kurals[index];
}
