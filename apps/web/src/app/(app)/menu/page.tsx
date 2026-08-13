'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createMenuCategorySchema } from '@restaurantos/shared';
import type { CreateMenuItemRequest, MenuCategoryWithItems } from '@restaurantos/types';
import { z } from 'zod';
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  EmptyState,
  Input,
  Label,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@restaurantos/ui';
import { ThemeToggle } from '@/components/theme-toggle';
import { apiRequest, useAuthStore } from '@/lib/api';
import { DishContentDialog } from './dish-content-dialog';

type CategoryForm = z.infer<typeof createMenuCategorySchema>;

const itemFormSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
  price: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, 'Enter a price like 12.50'),
});
type ItemForm = z.infer<typeof itemFormSchema>;

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function MenuPage() {
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (hasHydrated && !accessToken) {
      router.replace('/login');
    }
  }, [hasHydrated, accessToken, router]);

  const menuQuery = useQuery({
    queryKey: ['menu'],
    queryFn: () => apiRequest<MenuCategoryWithItems[]>('/menu', { auth: true }),
    enabled: Boolean(accessToken),
  });

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [itemDialogCategoryId, setItemDialogCategoryId] = useState<string | null>(null);
  const [contentDialogItemId, setContentDialogItemId] = useState<string | null>(null);

  const categoryForm = useForm<CategoryForm>({
    resolver: zodResolver(createMenuCategorySchema),
    defaultValues: { name: '', description: '' },
  });

  const createCategory = useMutation({
    mutationFn: (values: CategoryForm) =>
      apiRequest('/menu/categories', {
        method: 'POST',
        auth: true,
        body: JSON.stringify(values),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu'] });
      categoryForm.reset();
      setCategoryDialogOpen(false);
    },
  });

  const deleteCategory = useMutation({
    mutationFn: (categoryId: string) =>
      apiRequest(`/menu/categories/${categoryId}`, { method: 'DELETE', auth: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['menu'] }),
  });

  const itemForm = useForm<ItemForm>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: { name: '', description: '', price: '' },
  });

  const createItem = useMutation({
    mutationFn: (values: ItemForm & { categoryId: string }) => {
      const payload: CreateMenuItemRequest = {
        categoryId: values.categoryId,
        name: values.name,
        description: values.description || undefined,
        priceCents: Math.round(Number.parseFloat(values.price) * 100),
      };
      return apiRequest('/menu/items', {
        method: 'POST',
        auth: true,
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu'] });
      itemForm.reset();
      setItemDialogCategoryId(null);
    },
  });

  const deleteItem = useMutation({
    mutationFn: (itemId: string) =>
      apiRequest(`/menu/items/${itemId}`, { method: 'DELETE', auth: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['menu'] }),
  });

  const toggleAvailability = useMutation({
    mutationFn: ({ itemId, isAvailable }: { itemId: string; isAvailable: boolean }) =>
      apiRequest(`/menu/items/${itemId}`, {
        method: 'PATCH',
        auth: true,
        body: JSON.stringify({ isAvailable }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['menu'] }),
  });

  if (!hasHydrated || !accessToken) {
    return null;
  }

  const categories = menuQuery.data ?? [];
  const contentDialogItem = categories
    .flatMap((category) => category.items)
    .find((item) => item.id === contentDialogItemId);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.06),_transparent_40%),hsl(var(--background))]">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-8">
        <div>
          <Link
            href="/app"
            className="font-display text-2xl font-semibold tracking-tight hover:underline"
          >
            RestaurantOS
          </Link>
          <p className="text-sm text-muted-foreground">Menu</p>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
            <DialogTrigger asChild>
              <Button>New category</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New category</DialogTitle>
                <DialogDescription>
                  Group menu items, e.g. Starters, Mains, Desserts.
                </DialogDescription>
              </DialogHeader>
              <form
                className="space-y-4"
                onSubmit={categoryForm.handleSubmit((values) => createCategory.mutate(values))}
              >
                <div className="space-y-2">
                  <Label htmlFor="category-name">Name</Label>
                  <Input id="category-name" {...categoryForm.register('name')} />
                  {categoryForm.formState.errors.name ? (
                    <p className="text-sm text-destructive">
                      {categoryForm.formState.errors.name.message}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category-description">Description (optional)</Label>
                  <Input id="category-description" {...categoryForm.register('description')} />
                </div>
                {createCategory.isError ? (
                  <p className="text-sm text-destructive">
                    {createCategory.error instanceof Error
                      ? createCategory.error.message
                      : 'Unable to create category'}
                  </p>
                ) : null}
                <Button className="w-full" type="submit" disabled={createCategory.isPending}>
                  {createCategory.isPending ? 'Creating…' : 'Create category'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl space-y-6 px-6 pb-16">
        {menuQuery.isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : categories.length === 0 ? (
          <EmptyState
            title="No menu categories yet"
            description="Create your first category to start adding menu items."
          />
        ) : (
          categories.map((category) => (
            <Card key={category.id} className="animate-fade-in">
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle>{category.name}</CardTitle>
                  {category.description ? (
                    <CardDescription>{category.description}</CardDescription>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <Dialog
                    open={itemDialogCategoryId === category.id}
                    onOpenChange={(open) => setItemDialogCategoryId(open ? category.id : null)}
                  >
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        Add item
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>New item in {category.name}</DialogTitle>
                      </DialogHeader>
                      <form
                        className="space-y-4"
                        onSubmit={itemForm.handleSubmit((values) =>
                          createItem.mutate({ ...values, categoryId: category.id }),
                        )}
                      >
                        <div className="space-y-2">
                          <Label htmlFor="item-name">Name</Label>
                          <Input id="item-name" {...itemForm.register('name')} />
                          {itemForm.formState.errors.name ? (
                            <p className="text-sm text-destructive">
                              {itemForm.formState.errors.name.message}
                            </p>
                          ) : null}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="item-description">Description (optional)</Label>
                          <Input id="item-description" {...itemForm.register('description')} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="item-price">Price</Label>
                          <Input
                            id="item-price"
                            placeholder="12.50"
                            {...itemForm.register('price')}
                          />
                          {itemForm.formState.errors.price ? (
                            <p className="text-sm text-destructive">
                              {itemForm.formState.errors.price.message}
                            </p>
                          ) : null}
                        </div>
                        {createItem.isError ? (
                          <p className="text-sm text-destructive">
                            {createItem.error instanceof Error
                              ? createItem.error.message
                              : 'Unable to create item'}
                          </p>
                        ) : null}
                        <Button className="w-full" type="submit" disabled={createItem.isPending}>
                          {createItem.isPending ? 'Adding…' : 'Add item'}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteCategory.mutate(category.id)}
                    disabled={deleteCategory.isPending}
                  >
                    Delete category
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {category.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No items yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {category.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="font-medium">{item.name}</div>
                            {item.description ? (
                              <div className="text-sm text-muted-foreground">
                                {item.description}
                              </div>
                            ) : null}
                          </TableCell>
                          <TableCell>{formatPrice(item.priceCents)}</TableCell>
                          <TableCell>
                            <Badge variant={item.isAvailable ? 'default' : 'secondary'}>
                              {item.isAvailable ? 'Available' : 'Unavailable'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setContentDialogItemId(item.id)}
                              >
                                Dish content
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  toggleAvailability.mutate({
                                    itemId: item.id,
                                    isAvailable: !item.isAvailable,
                                  })
                                }
                                disabled={toggleAvailability.isPending}
                              >
                                {item.isAvailable ? 'Mark unavailable' : 'Mark available'}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteItem.mutate(item.id)}
                                disabled={deleteItem.isPending}
                              >
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </main>

      {contentDialogItem ? (
        <DishContentDialog item={contentDialogItem} onClose={() => setContentDialogItemId(null)} />
      ) : null}
    </div>
  );
}
