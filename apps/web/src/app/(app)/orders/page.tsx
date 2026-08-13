'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ORDER_STATUS_TRANSITIONS, type OrderStatusValue } from '@restaurantos/shared';
import type {
  BranchWithTables,
  CreateOrderRequest,
  MenuCategoryWithItems,
  OrderItemInput,
  OrderWithItems,
} from '@restaurantos/types';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  EmptyState,
  Input,
  Label,
  Skeleton,
} from '@restaurantos/ui';
import { apiRequest, useAuthStore } from '@/lib/api';
import { useOrderUpdates } from '@/lib/use-order-updates';

const STATUS_LABEL: Record<OrderStatusValue, string> = {
  open: 'Open',
  in_kitchen: 'In kitchen',
  ready: 'Ready',
  served: 'Served',
  paid: 'Paid',
  cancelled: 'Cancelled',
};

const TRANSITION_LABEL: Record<OrderStatusValue, string> = {
  open: 'Reopen',
  in_kitchen: 'Send to kitchen',
  ready: 'Mark ready',
  served: 'Mark served',
  paid: 'Mark paid',
  cancelled: 'Cancel order',
};

const STATUS_BADGE_VARIANT: Record<OrderStatusValue, 'default' | 'secondary' | 'outline'> = {
  open: 'outline',
  in_kitchen: 'secondary',
  ready: 'secondary',
  served: 'default',
  paid: 'default',
  cancelled: 'outline',
};

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

interface CartLine extends OrderItemInput {
  name: string;
  unitPriceCents: number;
}

function ItemPicker({
  menuItems,
  onAdd,
}: {
  menuItems: { id: string; name: string; priceCents: number }[];
  onAdd: (line: CartLine) => void;
}) {
  const [menuItemId, setMenuItemId] = useState(menuItems[0]?.id ?? '');
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');

  if (menuItems.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No available menu items. Add some in the Menu page first.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex-1 min-w-[10rem] space-y-1">
        <Label htmlFor="picker-item">Item</Label>
        <select
          id="picker-item"
          className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={menuItemId}
          onChange={(event) => setMenuItemId(event.target.value)}
        >
          {menuItems.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} ({formatPrice(item.priceCents)})
            </option>
          ))}
        </select>
      </div>
      <div className="w-20 space-y-1">
        <Label htmlFor="picker-qty">Qty</Label>
        <Input
          id="picker-qty"
          type="number"
          min={1}
          max={99}
          value={quantity}
          onChange={(event) => setQuantity(Number(event.target.value) || 1)}
        />
      </div>
      <div className="flex-1 min-w-[8rem] space-y-1">
        <Label htmlFor="picker-notes">Notes</Label>
        <Input
          id="picker-notes"
          placeholder="optional"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          const item = menuItems.find((candidate) => candidate.id === menuItemId);
          if (!item) return;
          onAdd({
            menuItemId: item.id,
            name: item.name,
            unitPriceCents: item.priceCents,
            quantity,
            notes: notes || undefined,
          });
          setQuantity(1);
          setNotes('');
        }}
      >
        Add
      </Button>
    </div>
  );
}

function CartList({ cart, onRemove }: { cart: CartLine[]; onRemove: (index: number) => void }) {
  if (cart.length === 0) {
    return <p className="text-sm text-muted-foreground">No items added yet.</p>;
  }

  const total = cart.reduce((sum, line) => sum + line.quantity * line.unitPriceCents, 0);

  return (
    <div className="space-y-2">
      {cart.map((line, index) => (
        <div key={index} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
          <div>
            <span className="font-medium">
              {line.quantity}x {line.name}
            </span>
            {line.notes ? <span className="ml-2 text-muted-foreground">({line.notes})</span> : null}
          </div>
          <div className="flex items-center gap-3">
            <span>{formatPrice(line.quantity * line.unitPriceCents)}</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => onRemove(index)}>
              Remove
            </Button>
          </div>
        </div>
      ))}
      <div className="flex justify-between border-t pt-2 text-sm font-medium">
        <span>Total</span>
        <span>{formatPrice(total)}</span>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const queryClient = useQueryClient();

  const branchesQuery = useQuery({
    queryKey: ['branches'],
    queryFn: () => apiRequest<BranchWithTables[]>('/branches', { auth: true }),
    enabled: Boolean(accessToken),
  });

  const menuQuery = useQuery({
    queryKey: ['menu'],
    queryFn: () => apiRequest<MenuCategoryWithItems[]>('/menu', { auth: true }),
    enabled: Boolean(accessToken),
  });

  const ordersQuery = useQuery({
    queryKey: ['orders'],
    queryFn: () => apiRequest<OrderWithItems[]>('/orders', { auth: true }),
    enabled: Boolean(accessToken),
    refetchInterval: 30_000,
  });

  useOrderUpdates(accessToken, () => {
    queryClient.invalidateQueries({ queryKey: ['orders'] });
  });

  const tables = useMemo(
    () =>
      (branchesQuery.data ?? []).flatMap((branch) =>
        branch.tables.map((table) => ({
          id: table.id,
          label: `${branch.name} – ${table.label}`,
        })),
      ),
    [branchesQuery.data],
  );

  const tableLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const table of tables) map.set(table.id, table.label);
    return map;
  }, [tables]);

  const availableMenuItems = useMemo(
    () =>
      (menuQuery.data ?? []).flatMap((category) =>
        category.items.filter((item) => item.isAvailable),
      ),
    [menuQuery.data],
  );

  const [newOrderOpen, setNewOrderOpen] = useState(false);
  const [tableId, setTableId] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);

  useEffect(() => {
    const firstTable = tables[0];
    if (!tableId && firstTable) {
      setTableId(firstTable.id);
    }
  }, [tables, tableId]);

  const createOrder = useMutation({
    mutationFn: (payload: CreateOrderRequest) =>
      apiRequest('/orders', { method: 'POST', auth: true, body: JSON.stringify(payload) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      setCart([]);
      setNewOrderOpen(false);
    },
  });

  const updateStatus = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: OrderStatusValue }) =>
      apiRequest(`/orders/${orderId}/status`, {
        method: 'PATCH',
        auth: true,
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['branches'] });
    },
  });

  if (!hasHydrated || !accessToken) {
    return null;
  }

  const orders = ordersQuery.data ?? [];

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Orders</h1>
        </div>
        <div className="flex items-center gap-3">
          <Dialog open={newOrderOpen} onOpenChange={setNewOrderOpen}>
            <DialogTrigger asChild>
              <Button disabled={tables.length === 0}>New order</Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>New order</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="order-table">Table</Label>
                  <select
                    id="order-table"
                    className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={tableId}
                    onChange={(event) => setTableId(event.target.value)}
                  >
                    {tables.map((table) => (
                      <option key={table.id} value={table.id}>
                        {table.label}
                      </option>
                    ))}
                  </select>
                </div>
                <ItemPicker
                  menuItems={availableMenuItems}
                  onAdd={(line) => setCart((current) => [...current, line])}
                />
                <CartList cart={cart} onRemove={(index) => setCart((current) => current.filter((_, i) => i !== index))} />
                {createOrder.isError ? (
                  <p className="text-sm text-destructive">
                    {createOrder.error instanceof Error
                      ? createOrder.error.message
                      : 'Unable to create order'}
                  </p>
                ) : null}
                <Button
                  className="w-full"
                  type="button"
                  disabled={!tableId || cart.length === 0 || createOrder.isPending}
                  onClick={() =>
                    createOrder.mutate({
                      tableId,
                      items: cart.map(({ menuItemId, quantity, notes }) => ({
                        menuItemId,
                        quantity,
                        notes,
                      })),
                    })
                  }
                >
                  {createOrder.isPending ? 'Creating…' : 'Create order'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="space-y-4">
        {ordersQuery.isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : orders.length === 0 ? (
          <EmptyState
            title="No orders yet"
            description="Create an order once you have a table and menu items ready."
          />
        ) : (
          orders.map((order) => (
            <Card key={order.id} className="animate-fade-in">
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle>{tableLabelById.get(order.tableId) ?? 'Unknown table'}</CardTitle>
                  <CardDescription>
                    {formatPrice(order.totalCents)} total
                    {order.tipCents > 0 ? ` + ${formatPrice(order.tipCents)} tip` : ''}
                    {order.paymentMethod ? ` · paid via ${order.paymentMethod}` : ''}
                  </CardDescription>
                </div>
                <Badge variant={STATUS_BADGE_VARIANT[order.status]}>
                  {STATUS_LABEL[order.status]}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1 text-sm">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-muted-foreground">
                      <span>
                        {item.quantity}x {item.name}
                        {item.notes ? ` (${item.notes})` : ''}
                      </span>
                      <span>{formatPrice(item.quantity * item.unitPriceCents)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {ORDER_STATUS_TRANSITIONS[order.status].map((next) => (
                    <Button
                      key={next}
                      variant={next === 'cancelled' ? 'destructive' : 'outline'}
                      size="sm"
                      disabled={updateStatus.isPending}
                      onClick={() => updateStatus.mutate({ orderId: order.id, status: next })}
                    >
                      {TRANSITION_LABEL[next]}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
