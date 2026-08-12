"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type MenuItem = {
  id: string;
  name: string;
  category: string;
  price: number;
  available: boolean;
};

type Order = {
  id: string;
  tableNumber: number;
  items: Array<{ menuItemId: string; quantity: number }>;
  status: "pending" | "preparing" | "ready" | "served";
  createdAt: string;
};

export default function Home() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tableNumber, setTableNumber] = useState("1");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [dishQuery, setDishQuery] = useState("Margherita Pizza");
  const [suggestion, setSuggestion] = useState("");
  const [message, setMessage] = useState("");

  const loadData = useCallback(async () => {
    const [menuResponse, ordersResponse] = await Promise.all([
      fetch("/api/menu"),
      fetch("/api/orders"),
    ]);
    const menuData = (await menuResponse.json()) as { items: MenuItem[] };
    const ordersData = (await ordersResponse.json()) as { orders: Order[] };
    setMenu(menuData.items);
    setOrders(ordersData.orders);
    return menuData.items;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const items = await loadData();
      if (!cancelled && items[0]) {
        setSelectedItemId((current) => current || items[0].id);
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [loadData]);

  async function handleCreateOrder(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tableNumber: Number(tableNumber),
        items: [{ menuItemId: selectedItemId, quantity: Number(quantity) }],
      }),
    });

    if (!response.ok) {
      setMessage("Failed to create order.");
      return;
    }

    setMessage("Order created successfully.");
    await loadData();
  }

  async function handleAdvance(orderId: string, status: Order["status"]) {
    await fetch("/api/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, status }),
    });
    await loadData();
  }

  async function handleSuggest(event: FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/ai/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dish: dishQuery }),
    });
    const data = (await response.json()) as { suggestion: string };
    setSuggestion(data.suggestion);
  }

  const menuById = new Map(menu.map((item) => [item.id, item]));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10">
        <header className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-400">
            RestaurantOS AI
          </p>
          <h1 className="text-4xl font-semibold tracking-tight">
            Smart restaurant operations dashboard
          </h1>
          <p className="max-w-2xl text-slate-300">
            Manage menu items, create table orders, and get AI pairing suggestions
            for your service team.
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <h2 className="mb-4 text-xl font-semibold">Create order</h2>
            <form className="space-y-4" onSubmit={handleCreateOrder}>
              <label className="block space-y-2">
                <span className="text-sm text-slate-300">Table number</span>
                <input
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
                  value={tableNumber}
                  onChange={(event) => setTableNumber(event.target.value)}
                  type="number"
                  min="1"
                  required
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm text-slate-300">Menu item</span>
                <select
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
                  value={selectedItemId}
                  onChange={(event) => setSelectedItemId(event.target.value)}
                  required
                >
                  {menu.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} (${item.price.toFixed(2)})
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-2">
                <span className="text-sm text-slate-300">Quantity</span>
                <input
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  type="number"
                  min="1"
                  required
                />
              </label>
              <button
                className="rounded-lg bg-emerald-500 px-4 py-2 font-medium text-slate-950 hover:bg-emerald-400"
                type="submit"
              >
                Place order
              </button>
            </form>
            {message ? <p className="mt-4 text-sm text-emerald-300">{message}</p> : null}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <h2 className="mb-4 text-xl font-semibold">AI pairing assistant</h2>
            <form className="space-y-4" onSubmit={handleSuggest}>
              <label className="block space-y-2">
                <span className="text-sm text-slate-300">Guest dish preference</span>
                <input
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
                  value={dishQuery}
                  onChange={(event) => setDishQuery(event.target.value)}
                  required
                />
              </label>
              <button
                className="rounded-lg border border-emerald-500 px-4 py-2 font-medium text-emerald-300 hover:bg-emerald-500/10"
                type="submit"
              >
                Get suggestion
              </button>
            </form>
            {suggestion ? (
              <p className="mt-4 rounded-lg bg-slate-950 p-4 text-sm text-slate-200">
                {suggestion}
              </p>
            ) : null}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <h2 className="mb-4 text-xl font-semibold">Active orders</h2>
          {orders.length === 0 ? (
            <p className="text-slate-400">No orders yet. Create one to get started.</p>
          ) : (
            <ul className="space-y-3">
              {orders.map((order) => (
                <li
                  key={order.id}
                  className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-medium">
                      Table {order.tableNumber} · {order.status}
                    </p>
                    <p className="text-sm text-slate-400">
                      {order.items
                        .map((item) => {
                          const menuItem = menuById.get(item.menuItemId);
                          return `${item.quantity}x ${menuItem?.name ?? item.menuItemId}`;
                        })
                        .join(", ")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {order.status === "pending" ? (
                      <button
                        className="rounded-lg bg-amber-500 px-3 py-1 text-sm font-medium text-slate-950"
                        onClick={() => void handleAdvance(order.id, "preparing")}
                        type="button"
                      >
                        Start preparing
                      </button>
                    ) : null}
                    {order.status === "preparing" ? (
                      <button
                        className="rounded-lg bg-sky-500 px-3 py-1 text-sm font-medium text-slate-950"
                        onClick={() => void handleAdvance(order.id, "ready")}
                        type="button"
                      >
                        Mark ready
                      </button>
                    ) : null}
                    {order.status === "ready" ? (
                      <button
                        className="rounded-lg bg-emerald-500 px-3 py-1 text-sm font-medium text-slate-950"
                        onClick={() => void handleAdvance(order.id, "served")}
                        type="button"
                      >
                        Mark served
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
