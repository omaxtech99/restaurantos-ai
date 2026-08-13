'use client';

import type { MenuItem, TasteProfile } from '@restaurantos/types';
import { Badge, Dialog, DialogContent, DialogHeader, DialogTitle } from '@restaurantos/ui';

const TASTE_DIMENSIONS: (keyof TasteProfile)[] = ['spicy', 'sweet', 'sour', 'salty', 'umami'];

const DIETARY_LABEL: Record<string, string> = {
  vegetarian: 'Vegetarian',
  vegan: 'Vegan',
  jain: 'Jain',
  gluten_free: 'Gluten-free',
  dairy_free: 'Dairy-free',
  nut_free: 'Nut-free',
  halal: 'Halal',
  spicy: 'Spicy',
};

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function DishDetailDialog({ item, onClose }: { item: MenuItem; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto">
        {item.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.photoUrl}
            alt={item.name}
            className="-mx-6 -mt-6 mb-1 h-48 w-[calc(100%+3rem)] object-cover"
          />
        ) : null}
        <DialogHeader>
          <DialogTitle>{item.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {item.description ? (
            <p className="text-sm text-muted-foreground">{item.description}</p>
          ) : null}

          {item.videoUrl ? (
            <video src={item.videoUrl} controls className="w-full rounded-lg border" />
          ) : null}

          {item.dietaryTags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {item.dietaryTags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {DIETARY_LABEL[tag] ?? tag}
                </Badge>
              ))}
            </div>
          ) : null}

          {item.tasteProfile ? (
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Taste profile</p>
              {TASTE_DIMENSIONS.map((dimension) => (
                <div key={dimension} className="flex items-center gap-2">
                  <span className="w-14 text-xs capitalize text-muted-foreground">{dimension}</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <span
                        key={level}
                        className={`h-2 w-5 rounded-full ${
                          item.tasteProfile![dimension] >= level ? 'bg-primary' : 'bg-muted'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {item.nutritionInfo ? (
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Nutrition (estimated)</p>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div>
                  <p className="font-medium">{item.nutritionInfo.calories}</p>
                  <p className="text-muted-foreground">kcal</p>
                </div>
                <div>
                  <p className="font-medium">{item.nutritionInfo.proteinG}g</p>
                  <p className="text-muted-foreground">protein</p>
                </div>
                <div>
                  <p className="font-medium">{item.nutritionInfo.carbsG}g</p>
                  <p className="text-muted-foreground">carbs</p>
                </div>
                <div>
                  <p className="font-medium">{item.nutritionInfo.fatG}g</p>
                  <p className="text-muted-foreground">fat</p>
                </div>
              </div>
            </div>
          ) : null}

          <p className="text-sm font-semibold">{formatPrice(item.priceCents)}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
