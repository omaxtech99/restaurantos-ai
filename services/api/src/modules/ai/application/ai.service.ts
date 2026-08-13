import { BadGatewayException, Injectable } from '@nestjs/common';
import type { AiSuggestDishResponse, NutritionInfo, TasteProfile } from '@restaurantos/types';
import { DIETARY_TAGS } from '@restaurantos/shared';
import { AppConfigService } from '../../config/app-config.service';

interface OpenAiChatCompletion {
  choices: { message: { content: string } }[];
}

interface RawSuggestion {
  description?: string;
  tasteProfile?: TasteProfile;
  nutritionInfo?: NutritionInfo;
  dietaryTags?: string[];
}

/**
 * Turns just a dish name into a draft description, taste profile, nutrition
 * estimate, and dietary tags — staff review and edit before saving anything
 * (see menu.controller.ts's create/update-item endpoints), this only ever
 * returns a suggestion, never writes to the menu itself.
 */
@Injectable()
export class AiService {
  constructor(private readonly config: AppConfigService) {}

  async suggestDishContent(name: string): Promise<AiSuggestDishResponse> {
    if (!this.config.openaiConfigured) {
      return {
        configured: false,
        description: null,
        tasteProfile: null,
        nutritionInfo: null,
        dietaryTags: [],
      };
    }

    const prompt = `You are a menu content assistant for a restaurant. A staff member is adding a dish called "${name}" to the menu. Based on the dish name alone, provide your best estimate of its content for a typical restaurant serving. Respond with strict JSON only, no markdown, matching this shape exactly:
{
  "description": "one or two sentence appetizing description, under 200 characters",
  "tasteProfile": { "spicy": 0-5, "sweet": 0-5, "sour": 0-5, "salty": 0-5, "umami": 0-5 },
  "nutritionInfo": { "calories": integer, "proteinG": number, "carbsG": number, "fatG": number },
  "dietaryTags": array of zero or more from ${JSON.stringify(DIETARY_TAGS)}
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.openaiModel,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new BadGatewayException(`Unable to generate dish content: ${body}`);
    }

    const data = (await response.json()) as OpenAiChatCompletion;
    const raw = data.choices[0]?.message?.content ?? '{}';

    let parsed: RawSuggestion;
    try {
      parsed = JSON.parse(raw) as RawSuggestion;
    } catch {
      throw new BadGatewayException('AI returned an unparseable response');
    }

    return {
      configured: true,
      description: parsed.description ?? null,
      tasteProfile: parsed.tasteProfile ?? null,
      nutritionInfo: parsed.nutritionInfo ?? null,
      dietaryTags: (parsed.dietaryTags ?? []).filter((tag): tag is (typeof DIETARY_TAGS)[number] =>
        (DIETARY_TAGS as readonly string[]).includes(tag),
      ),
    };
  }
}
