export type MenuItem = {
  id: string;
  name: string;
  category: string;
  price: number;
  available: boolean;
};

export type Order = {
  id: string;
  tableNumber: number;
  items: Array<{ menuItemId: string; quantity: number }>;
  status: "pending" | "preparing" | "ready" | "served";
  createdAt: string;
};

const menuItems: MenuItem[] = [
  { id: "m1", name: "Margherita Pizza", category: "Mains", price: 14.5, available: true },
  { id: "m2", name: "Caesar Salad", category: "Starters", price: 9.0, available: true },
  { id: "m3", name: "Grilled Salmon", category: "Mains", price: 22.0, available: true },
  { id: "m4", name: "Tiramisu", category: "Desserts", price: 8.5, available: true },
  { id: "m5", name: "Sparkling Water", category: "Drinks", price: 3.5, available: true },
];

const orders: Order[] = [];

export function getMenuItems(): MenuItem[] {
  return [...menuItems];
}

export function getOrders(): Order[] {
  return [...orders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function createOrder(
  tableNumber: number,
  items: Array<{ menuItemId: string; quantity: number }>,
): Order {
  const order: Order = {
    id: `ord-${Date.now()}`,
    tableNumber,
    items,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  orders.unshift(order);
  return order;
}

export function updateOrderStatus(
  orderId: string,
  status: Order["status"],
): Order | null {
  const order = orders.find((entry) => entry.id === orderId);
  if (!order) {
    return null;
  }
  order.status = status;
  return { ...order };
}

export function suggestMenuPairing(mainDish: string): string {
  const normalized = mainDish.toLowerCase();
  if (normalized.includes("pizza") || normalized.includes("pasta")) {
    return "Pair with Sparkling Water and finish with Tiramisu for a classic Italian experience.";
  }
  if (normalized.includes("salmon") || normalized.includes("fish")) {
    return "Add Caesar Salad as a starter and Sparkling Water to balance the rich flavors.";
  }
  if (normalized.includes("salad")) {
    return "Follow with Grilled Salmon or Margherita Pizza depending on appetite.";
  }
  return "Try Caesar Salad to start, a main from our grill, and Tiramisu to finish.";
}
