'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CallWaiterResponse,
  CreatePaymentResponse,
  MenuItem,
  OrderStatus,
  OrderWithItems,
  PublicTableContext,
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
  EmptyState,
  ErrorState,
  Input,
  Label,
  Skeleton,
} from '@restaurantos/ui';
import { ApiClientError, apiRequest } from '@/lib/api';

const STATUS_LABEL: Record<OrderStatus, string> = {
  open: 'Order received',
  in_kitchen: 'Being prepared',
  ready: 'Ready to be served',
  served: 'Served — enjoy your meal',
  paid: 'Paid — thank you!',
  cancelled: 'Cancelled',
};

const STATUS_BADGE_VARIANT: Record<OrderStatus, 'default' | 'secondary' | 'outline'> = {
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

function sessionKey(tableId: string): string {
  return `restaurantos-order-${tableId}`;
}

function waiterCallKey(tableId: string): string {
  return `restaurantos-waiter-call-${tableId}`;
}

function CallWaiterButton({ tableId }: { tableId: string }) {
  const [nextAvailableAt, setNextAvailableAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const stored = sessionStorage.getItem(waiterCallKey(tableId));
    if (stored) setNextAvailableAt(Number(stored));
  }, [tableId]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(interval);
  }, []);

  const callWaiter = useMutation({
    mutationFn: () =>
      apiRequest<CallWaiterResponse>(`/public/tables/${tableId}/call-waiter`, { method: 'POST' }),
    onSuccess: (response) => {
      const at = new Date(response.nextAvailableAt).getTime();
      sessionStorage.setItem(waiterCallKey(tableId), String(at));
      setNextAvailableAt(at);
    },
    onError: (error) => {
      // The API enforces the same 5-minute cooldown server-side even if this
      // client's local timer was cleared (new tab, cleared storage, etc.) —
      // parse the seconds back out of the 409 so the button still reflects it.
      if (error instanceof ApiClientError) {
        const match = error.message.match(/wait (\d+)s/);
        if (match) {
          const at = Date.now() + Number(match[1]) * 1000;
          sessionStorage.setItem(waiterCallKey(tableId), String(at));
          setNextAvailableAt(at);
        }
      }
    },
  });

  const remainingSeconds = nextAvailableAt ? Math.max(0, Math.ceil((nextAvailableAt - now) / 1000)) : 0;
  const onCooldown = remainingSeconds > 0;

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={onCooldown || callWaiter.isPending}
      onClick={() => callWaiter.mutate()}
    >
      {onCooldown
        ? `Waiter notified (${remainingSeconds}s)`
        : callWaiter.isPending
          ? 'Calling…'
          : 'Call waiter'}
    </Button>
  );
}

interface RazorpayCheckoutResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayCheckoutInstance {
  open: () => void;
}

interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  handler: (response: RazorpayCheckoutResponse) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayCheckoutInstance;
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

const TIP_PERCENT_OPTIONS = [0, 5, 10, 15];

function PayOnlineSection({ orderId, totalCents }: { orderId: string; totalCents: number }) {
  const queryClient = useQueryClient();
  const [tipPercent, setTipPercent] = useState(0);
  const [payError, setPayError] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);

  const tipCents = Math.round((totalCents * tipPercent) / 100);
  const totalWithTip = totalCents + tipCents;

  const payMutation = useMutation({
    mutationFn: async () => {
      setPayError(null);
      const payment = await apiRequest<CreatePaymentResponse>(
        `/public/orders/${orderId}/create-payment`,
        { method: 'POST', body: JSON.stringify({ tipCents }) },
      );

      if (!payment.configured || !payment.razorpayOrderId || !payment.keyId) {
        setNotConfigured(true);
        return;
      }

      const loaded = await loadRazorpayScript();
      if (!loaded || !window.Razorpay) {
        setPayError('Unable to load the payment form. Please try again.');
        return;
      }

      const checkout = new window.Razorpay({
        key: payment.keyId,
        amount: payment.amountCents,
        currency: payment.currency,
        order_id: payment.razorpayOrderId,
        name: 'Pay your bill',
        handler: (response) => {
          apiRequest(`/public/orders/${orderId}/verify-payment`, {
            method: 'POST',
            body: JSON.stringify({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            }),
          })
            .then(() => queryClient.invalidateQueries({ queryKey: ['public-order', orderId] }))
            .catch(() =>
              setPayError('Payment was received but we could not confirm it — please check with your waiter.'),
            );
        },
      });
      checkout.open();
    },
    onError: () => setPayError('Unable to start payment. Please try again.'),
  });

  if (notConfigured) {
    return (
      <p className="text-sm text-muted-foreground">
        Online payment isn&apos;t set up yet — please ask your waiter for the bill.
      </p>
    );
  }

  return (
    <div className="space-y-3 border-t pt-3">
      <div>
        <p className="text-sm font-medium">Add a tip?</p>
        <div className="mt-1.5 flex gap-2">
          {TIP_PERCENT_OPTIONS.map((pct) => (
            <Button
              key={pct}
              type="button"
              size="sm"
              variant={tipPercent === pct ? 'default' : 'outline'}
              onClick={() => setTipPercent(pct)}
            >
              {pct === 0 ? 'No tip' : `${pct}%`}
            </Button>
          ))}
        </div>
      </div>
      {payError ? <p className="text-sm text-destructive">{payError}</p> : null}
      <Button className="w-full" disabled={payMutation.isPending} onClick={() => payMutation.mutate()}>
        {payMutation.isPending ? 'Starting payment…' : `Pay ${formatPrice(totalWithTip)}`}
      </Button>
    </div>
  );
}

export default function TableOrderPage() {
  const params = useParams<{ tableId: string }>();
  const tableId = params.tableId;
  const queryClient = useQueryClient();

  const [cart, setCart] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem(sessionKey(tableId));
    if (stored) setActiveOrderId(stored);
  }, [tableId]);

  const contextQuery = useQuery({
    queryKey: ['public-table', tableId],
    queryFn: () => apiRequest<PublicTableContext>(`/public/tables/${tableId}`),
  });

  const orderQuery = useQuery({
    queryKey: ['public-order', activeOrderId],
    queryFn: () => apiRequest<OrderWithItems>(`/public/orders/${activeOrderId}`),
    enabled: Boolean(activeOrderId),
    refetchInterval: 5_000,
  });

  const allItems = useMemo(
    () => (contextQuery.data?.categories ?? []).flatMap((category) => category.items),
    [contextQuery.data],
  );

  const cartLines = useMemo(
    () =>
      Object.entries(cart)
        .filter(([, quantity]) => quantity > 0)
        .map(([menuItemId, quantity]) => {
          const item = allItems.find((candidate) => candidate.id === menuItemId) as MenuItem;
          return { item, quantity, notes: notes[menuItemId] ?? '' };
        })
        .filter((line) => Boolean(line.item)),
    [cart, notes, allItems],
  );

  const cartCount = cartLines.reduce((sum, line) => sum + line.quantity, 0);
  const cartTotal = cartLines.reduce((sum, line) => sum + line.quantity * line.item.priceCents, 0);

  const placeOrder = useMutation({
    mutationFn: () =>
      apiRequest<OrderWithItems>(`/public/tables/${tableId}/orders`, {
        method: 'POST',
        body: JSON.stringify({
          items: cartLines.map((line) => ({
            menuItemId: line.item.id,
            quantity: line.quantity,
            notes: line.notes.trim() || undefined,
          })),
        }),
      }),
    onSuccess: (order) => {
      sessionStorage.setItem(sessionKey(tableId), order.id);
      setActiveOrderId(order.id);
      setCart({});
      setNotes({});
      setCartOpen(false);
      queryClient.invalidateQueries({ queryKey: ['public-order', order.id] });
    },
  });

  function addToCart(menuItemId: string) {
    setCart((current) => ({ ...current, [menuItemId]: (current[menuItemId] ?? 0) + 1 }));
  }

  function removeFromCart(menuItemId: string) {
    setCart((current) => {
      const next = { ...current };
      const quantity = (next[menuItemId] ?? 0) - 1;
      if (quantity <= 0) {
        delete next[menuItemId];
      } else {
        next[menuItemId] = quantity;
      }
      return next;
    });
  }

  if (contextQuery.isLoading) {
    return (
      <div className="mx-auto max-w-md space-y-4 px-5 py-10">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (contextQuery.isError || !contextQuery.data) {
    return (
      <div className="mx-auto max-w-md px-5 py-10">
        <ErrorState
          title="Table not found"
          description="This ordering link doesn't match an active table. Please ask staff for help."
        />
      </div>
    );
  }

  const { table, categories } = contextQuery.data;
  const order = orderQuery.data;

  if (activeOrderId) {
    return (
      <div className="mx-auto min-h-screen max-w-md space-y-6 px-5 py-10">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">{table.restaurantName}</p>
            <h1 className="font-display text-2xl font-semibold tracking-tight">{table.label}</h1>
          </div>
          <CallWaiterButton tableId={tableId} />
        </div>

        {orderQuery.isLoading || !order ? (
          <Skeleton className="h-56 w-full" />
        ) : (
          <Card className="animate-fade-in">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>Your order</CardTitle>
                <Badge variant={STATUS_BADGE_VARIANT[order.status]}>
                  {STATUS_LABEL[order.status]}
                </Badge>
              </div>
              <CardDescription>{formatPrice(order.totalCents)} total</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5 text-sm">
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-muted-foreground">
                    <span>
                      {item.quantity}x {item.name}
                      {item.notes ? (
                        <span className="block text-xs italic">{item.notes}</span>
                      ) : null}
                    </span>
                    <span>{formatPrice(item.quantity * item.unitPriceCents)}</span>
                  </div>
                ))}
              </div>
              {order.status === 'served' ? (
                <PayOnlineSection orderId={order.id} totalCents={order.totalCents} />
              ) : null}
              {order.status !== 'paid' && order.status !== 'cancelled' ? (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    sessionStorage.removeItem(sessionKey(tableId));
                    setActiveOrderId(null);
                  }}
                >
                  Order more
                </Button>
              ) : null}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-md pb-28">
      <header className="flex items-start justify-between gap-3 px-5 pt-10 pb-6">
        <div>
          <p className="text-sm text-muted-foreground">{table.restaurantName}</p>
          <h1 className="font-display text-2xl font-semibold tracking-tight">{table.label}</h1>
        </div>
        <CallWaiterButton tableId={tableId} />
      </header>

      <main className="space-y-6 px-5">
        {categories.length === 0 ? (
          <EmptyState
            title="Menu not available"
            description="This restaurant hasn't published any items yet."
          />
        ) : (
          categories.map((category) => (
            <section key={category.id} className="space-y-3">
              <h2 className="font-display text-lg font-semibold">{category.name}</h2>
              <div className="space-y-3">
                {category.items.map((item) => {
                  const quantity = cart[item.id] ?? 0;
                  return (
                    <Card key={item.id}>
                      <CardContent className="flex items-start justify-between gap-4 py-4">
                        <div className="min-w-0">
                          <p className="font-medium">{item.name}</p>
                          {item.description ? (
                            <p className="mt-0.5 text-sm text-muted-foreground">
                              {item.description}
                            </p>
                          ) : null}
                          <p className="mt-1.5 text-sm font-medium">
                            {formatPrice(item.priceCents)}
                          </p>
                        </div>
                        <div className="flex flex-none items-center gap-2">
                          {quantity > 0 ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                aria-label={`Remove one ${item.name}`}
                                onClick={() => removeFromCart(item.id)}
                              >
                                &minus;
                              </Button>
                              <span className="w-4 text-center text-sm font-medium">
                                {quantity}
                              </span>
                            </>
                          ) : null}
                          <Button
                            variant={quantity > 0 ? 'outline' : 'default'}
                            size="sm"
                            aria-label={`Add ${item.name}`}
                            onClick={() => addToCart(item.id)}
                          >
                            {quantity > 0 ? '+' : 'Add'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </main>

      {cartCount > 0 ? (
        <div className="fixed inset-x-0 bottom-0 border-t bg-background/95 px-5 py-4 backdrop-blur">
          <div className="mx-auto max-w-md">
            <Button className="w-full justify-between" onClick={() => setCartOpen(true)}>
              <span>
                View order &middot; {cartCount} item{cartCount === 1 ? '' : 's'}
              </span>
              <span>{formatPrice(cartTotal)}</span>
            </Button>
          </div>
        </div>
      ) : null}

      <Dialog open={cartOpen} onOpenChange={setCartOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Your order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-3">
              {cartLines.map((line) => (
                <div key={line.item.id} className="space-y-1.5 rounded-lg border px-3 py-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>
                      {line.quantity}x {line.item.name}
                    </span>
                    <div className="flex items-center gap-3">
                      <span>{formatPrice(line.quantity * line.item.priceCents)}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFromCart(line.item.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`notes-${line.item.id}`} className="text-xs text-muted-foreground">
                      Special instructions (optional)
                    </Label>
                    <Input
                      id={`notes-${line.item.id}`}
                      placeholder="e.g. less spicy, no sugar"
                      value={line.notes}
                      onChange={(event) =>
                        setNotes((current) => ({ ...current, [line.item.id]: event.target.value }))
                      }
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between border-t pt-3 text-sm font-medium">
              <span>Total</span>
              <span>{formatPrice(cartTotal)}</span>
            </div>
            {placeOrder.isError ? (
              <p className="text-sm text-destructive">
                {placeOrder.error instanceof Error
                  ? placeOrder.error.message
                  : 'Unable to place order'}
              </p>
            ) : null}
            <Button
              className="w-full"
              disabled={cartLines.length === 0 || placeOrder.isPending}
              onClick={() => placeOrder.mutate()}
            >
              {placeOrder.isPending ? 'Placing order…' : `Place order • ${formatPrice(cartTotal)}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
