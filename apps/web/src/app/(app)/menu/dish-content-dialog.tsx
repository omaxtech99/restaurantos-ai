'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  AiSuggestDishResponse,
  MenuItem,
  NutritionInfo,
  PresignMediaUploadResponse,
  TasteProfile,
} from '@restaurantos/types';
import { DIETARY_TAGS } from '@restaurantos/shared';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@restaurantos/ui';
import { apiRequest } from '@/lib/api';

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

const DEFAULT_TASTE: TasteProfile = { spicy: 0, sweet: 0, sour: 0, salty: 0, umami: 0 };
const DEFAULT_NUTRITION: NutritionInfo = { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 };

export function DishContentDialog({ item, onClose }: { item: MenuItem; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [description, setDescription] = useState(item.description ?? '');
  const [taste, setTaste] = useState<TasteProfile>(item.tasteProfile ?? DEFAULT_TASTE);
  const [nutrition, setNutrition] = useState<NutritionInfo>(item.nutritionInfo ?? DEFAULT_NUTRITION);
  const [tags, setTags] = useState<string[]>(item.dietaryTags);
  const [photoUrl, setPhotoUrl] = useState(item.photoUrl ?? '');
  const [videoUrl, setVideoUrl] = useState(item.videoUrl ?? '');
  const [aiNotConfigured, setAiNotConfigured] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<'photo' | 'video' | null>(null);

  const aiSuggest = useMutation({
    mutationFn: () =>
      apiRequest<AiSuggestDishResponse>('/menu/ai-suggest', {
        method: 'POST',
        auth: true,
        body: JSON.stringify({ name: item.name }),
      }),
    onSuccess: (suggestion) => {
      if (!suggestion.configured) {
        setAiNotConfigured(true);
        return;
      }
      setAiNotConfigured(false);
      if (suggestion.description) setDescription(suggestion.description);
      if (suggestion.tasteProfile) setTaste(suggestion.tasteProfile);
      if (suggestion.nutritionInfo) setNutrition(suggestion.nutritionInfo);
      if (suggestion.dietaryTags.length > 0) setTags(suggestion.dietaryTags);
    },
  });

  const save = useMutation({
    mutationFn: () =>
      apiRequest(`/menu/items/${item.id}`, {
        method: 'PATCH',
        auth: true,
        body: JSON.stringify({
          description: description.trim() || undefined,
          tasteProfile: taste,
          nutritionInfo: nutrition,
          dietaryTags: tags,
          photoUrl: photoUrl || undefined,
          videoUrl: videoUrl || undefined,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu'] });
      onClose();
    },
  });

  async function handleFileSelect(kind: 'photo' | 'video', file: File) {
    setUploadError(null);
    setUploading(kind);
    try {
      const presign = await apiRequest<PresignMediaUploadResponse>('/menu/media/presign', {
        method: 'POST',
        auth: true,
        body: JSON.stringify({ kind, contentType: file.type }),
      });

      if (!presign.configured || !presign.uploadUrl || !presign.publicUrl) {
        setUploadError("Media storage isn't set up yet — ask the owner to configure Cloudflare R2.");
        return;
      }

      const putResponse = await fetch(presign.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      if (!putResponse.ok) {
        setUploadError('Upload failed. Please try again.');
        return;
      }

      if (kind === 'photo') setPhotoUrl(presign.publicUrl);
      else setVideoUrl(presign.publicUrl);
    } catch {
      setUploadError('Upload failed. Please try again.');
    } finally {
      setUploading(null);
    }
  }

  function toggleTag(tag: string) {
    setTags((current) => (current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag]));
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item.name} — dish content</DialogTitle>
          <DialogDescription>
            Help customers unfamiliar with this dish understand it before they order.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-1.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => aiSuggest.mutate()}
              disabled={aiSuggest.isPending}
            >
              {aiSuggest.isPending ? 'Asking AI…' : 'Auto-fill with AI'}
            </Button>
            {aiNotConfigured ? (
              <p className="text-sm text-muted-foreground">
                AI auto-fill isn&apos;t set up yet — ask the owner to add an OpenAI API key. You can
                still fill this in by hand.
              </p>
            ) : null}
            {aiSuggest.isError ? (
              <p className="text-sm text-destructive">
                {aiSuggest.error instanceof Error
                  ? aiSuggest.error.message
                  : 'Unable to generate a suggestion — you can still fill this in by hand.'}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="dish-description">Description</Label>
            <Input
              id="dish-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Taste profile (0 = none, 5 = very)</p>
            {TASTE_DIMENSIONS.map((dimension) => (
              <div key={dimension} className="flex items-center justify-between gap-2">
                <span className="w-14 text-sm capitalize text-muted-foreground">{dimension}</span>
                <div className="flex gap-1">
                  {[0, 1, 2, 3, 4, 5].map((level) => (
                    <Button
                      key={level}
                      type="button"
                      size="sm"
                      variant={taste[dimension] === level ? 'default' : 'outline'}
                      className="h-7 w-7 p-0"
                      onClick={() => setTaste((current) => ({ ...current, [dimension]: level }))}
                    >
                      {level}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Nutrition (estimated per serving)</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="nutrition-calories" className="text-xs text-muted-foreground">
                  Calories
                </Label>
                <Input
                  id="nutrition-calories"
                  type="number"
                  min={0}
                  value={nutrition.calories}
                  onChange={(event) =>
                    setNutrition((current) => ({ ...current, calories: Number(event.target.value) || 0 }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="nutrition-protein" className="text-xs text-muted-foreground">
                  Protein (g)
                </Label>
                <Input
                  id="nutrition-protein"
                  type="number"
                  min={0}
                  value={nutrition.proteinG}
                  onChange={(event) =>
                    setNutrition((current) => ({ ...current, proteinG: Number(event.target.value) || 0 }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="nutrition-carbs" className="text-xs text-muted-foreground">
                  Carbs (g)
                </Label>
                <Input
                  id="nutrition-carbs"
                  type="number"
                  min={0}
                  value={nutrition.carbsG}
                  onChange={(event) =>
                    setNutrition((current) => ({ ...current, carbsG: Number(event.target.value) || 0 }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="nutrition-fat" className="text-xs text-muted-foreground">
                  Fat (g)
                </Label>
                <Input
                  id="nutrition-fat"
                  type="number"
                  min={0}
                  value={nutrition.fatG}
                  onChange={(event) =>
                    setNutrition((current) => ({ ...current, fatG: Number(event.target.value) || 0 }))
                  }
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Dietary tags</p>
            <div className="flex flex-wrap gap-2">
              {DIETARY_TAGS.map((tag) => (
                <Button
                  key={tag}
                  type="button"
                  size="sm"
                  variant={tags.includes(tag) ? 'default' : 'outline'}
                  onClick={() => toggleTag(tag)}
                >
                  {DIETARY_LABEL[tag]}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Photo</Label>
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt={item.name} className="h-32 w-32 rounded-lg border object-cover" />
            ) : null}
            <input
              type="file"
              accept="image/*"
              disabled={uploading === 'photo'}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleFileSelect('photo', file);
              }}
              className="text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label>Short prep video</Label>
            {videoUrl ? (
              <video src={videoUrl} controls className="h-32 w-auto rounded-lg border" />
            ) : null}
            <input
              type="file"
              accept="video/*"
              disabled={uploading === 'video'}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleFileSelect('video', file);
              }}
              className="text-sm"
            />
          </div>

          {uploadError ? <p className="text-sm text-destructive">{uploadError}</p> : null}
          {save.isError ? (
            <p className="text-sm text-destructive">
              {save.error instanceof Error ? save.error.message : 'Unable to save dish content'}
            </p>
          ) : null}

          <Button className="w-full" onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save dish content'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
