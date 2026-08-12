import { NextResponse } from "next/server";

import { createOrder, getOrders, updateOrderStatus } from "@/lib/store";

export async function GET() {
  return NextResponse.json({ orders: getOrders() });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    tableNumber?: number;
    items?: Array<{ menuItemId: string; quantity: number }>;
  };

  if (!body.tableNumber || !body.items?.length) {
    return NextResponse.json(
      { error: "tableNumber and items are required" },
      { status: 400 },
    );
  }

  const order = createOrder(body.tableNumber, body.items);
  return NextResponse.json({ order }, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as {
    orderId?: string;
    status?: "pending" | "preparing" | "ready" | "served";
  };

  if (!body.orderId || !body.status) {
    return NextResponse.json(
      { error: "orderId and status are required" },
      { status: 400 },
    );
  }

  const order = updateOrderStatus(body.orderId, body.status);
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json({ order });
}
