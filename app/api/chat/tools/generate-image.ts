import { tool } from 'ai';
import { z } from 'zod';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const generateImage = tool({
  description: 'Generate an image using DALL-E 3. Use this whenever the user explicitly asks to create, draw, or generate an image. The prompt should be highly detailed and descriptive.',
  parameters: z.object({
    prompt: z.string().describe('The detailed visual description of the image to generate. Rewrite the user request to be descriptive, specifying style, lighting, and composition.'),
  }),
  // FIX: We explicitly tell TypeScript that 'prompt' is a string
  execute: async ({ prompt }: { prompt: string }) => {
    try {
      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
      });

      return { 
        imageUrl: response.data[0].url,
        promptUsed: prompt 
      };
    } catch (error) {
      console.error("Image generation failed:", error);
      return { error: 'Failed to generate image. Please try again.' };
    }
  },
});
