import { streamText, UIMessage, convertToModelMessages, stepCountIs, createUIMessageStream, createUIMessageStreamResponse } from 'ai';
import { MODEL } from '@/config';
import { isContentFlagged } from '@/lib/moderation';
import { webSearch } from './tools/web-search';
import { vectorDatabaseSearch } from './tools/search-vector-database';

// ---------------------------------------------------------
// THIS IS THE NEW PERSONALITY (SYSTEM PROMPT)
// ---------------------------------------------------------
const SYSTEM_PROMPT = `
You are MyAI3, an expert Digital Marketing Consultant specifically designed for Small Businesses and Solopreneurs.
Your goal is to help users grow their business, increase sales, and build their brand online.

### YOUR IDENTITY
- **Role:** Senior Digital Marketing Strategist.
- **Tone:** Professional, Action-Oriented, Strategic, and slightly Witty.
- **Target Audience:** Small business owners (bakery owners, consultants, local shops) who are busy and need quick, practical results.

### YOUR CAPABILITIES (What you tell the user)
When asked "What can you do?" or "How can you help?", ALWAYS summarize your skills like this:

1. **Social Media Strategy:** I create specific content calendars for IG, LinkedIn, & Facebook.
2. **Local SEO:** I help optimize Google Business Profiles to get you more foot traffic.
3. **Paid Ads on a Budget:** I plan effective Meta/Google ad campaigns for small budgets (₹500-₹1000).
4. **Email & WhatsApp Marketing:** I write scripts that convert leads into customers.
5. **Copywriting:** I write captions, ad hooks, and website text that sells.

### STRICT RULES
1. **Stay in Lane:** If a user asks about Math, Physics, History, or general trivia unrelated to business, politely decline or pivot back to marketing.
   - *Bad Answer:* "The capital of France is Paris."
   - *Good Answer:* "I focus on growing your business! Speaking of Paris, have you thought about running a 'French-themed' promotion for your bakery?"
2. **Be Specific:** Never give generic advice like "Post more often." Give specific ideas: "Post a Reel behind-the-scenes video every Tuesday at 10 AM."
3. **Format:** Use **Bold** for key terms. Use Markdown tables for calendars/plans.

### INTERACTION STYLE
- Keep answers concise (under 200 words unless asked for a full plan).
- End every response with a **Call to Action** or a question to keep them moving forward (e.g., "Shall we draft that email now?").
`;
// ---------------------------------------------------------

export const maxDuration = 30;

export async function POST(req: Request) {
    const { messages }: { messages: UIMessage[] } = await req.json();

    const latestUserMessage = messages
        .filter(msg => msg.role === 'user')
        .pop();

    if (latestUserMessage) {
        const textParts = latestUserMessage.parts
            .filter(part => part.type === 'text')
            .map(part => 'text' in part ? part.text : '')
            .join('');

        if (textParts) {
            const moderationResult = await isContentFlagged(textParts);

            if (moderationResult.flagged) {
                const stream = createUIMessageStream({
                    execute({ writer }) {
                        const textId = 'moderation-denial-text';

                        writer.write({ type: 'start' });
                        writer.write({ type: 'text-start', id: textId });
                        writer.write({
                            type: 'text-delta',
                            id: textId,
                            delta: moderationResult.denialMessage || "Your message violates our guidelines. I can't answer that.",
                        });
                        writer.write({ type: 'text-end', id: textId });
                        writer.write({ type: 'finish' });
                    },
                });

                return createUIMessageStreamResponse({ stream });
            }
        }
    }

    const result = streamText({
        model: MODEL,
        system: SYSTEM_PROMPT, // Uses the constant we defined above
        messages: convertToModelMessages(messages),
        tools: {
            webSearch,
            vectorDatabaseSearch,
        },
        stopWhen: stepCountIs(10),
        providerOptions: {
            openai: {
                reasoningSummary: 'auto',
                reasoningEffort: 'low',
                parallelToolCalls: false,
            }
        }
    });

    return result.toUIMessageStreamResponse({
        sendReasoning: true,
    });
}
