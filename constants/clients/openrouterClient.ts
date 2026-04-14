import Constants from 'expo-constants';

type OpenRouterMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type OpenRouterChatParams = {
  model: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  maxTokens?: number;
  
};

const getExpoExtra = () => {
  return (
    Constants.expoConfig?.extra || {}
  );
};

const reconstructKey = (parts: string[]) => {
  return parts.join('');
};

const getOpenRouterKey = () => {
  const extra = getExpoExtra();

  const part1 =
    extra.OPENROUTER_API_KEY_1 ||
    process.env.EXPO_PUBLIC_OPENROUTER_API_KEY_1 ||
    process.env.OPENROUTER_API_KEY_1;
  const part2 =
    extra.OPENROUTER_API_KEY_2 ||
    process.env.EXPO_PUBLIC_OPENROUTER_API_KEY_2 ||
    process.env.OPENROUTER_API_KEY_2;

  if (!part1 || !part2) {
    throw new Error('OpenRouter credentials not found in expo config');
  }

  return reconstructKey([String(part1).trim(), String(part2).trim()]);
};

export const openRouterChat = async ({
  model,
  messages,
  temperature = 0.4,
  maxTokens = 120000,
}: OpenRouterChatParams) => {
  const openRouterApiKey = getOpenRouterKey();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60_000);

  let response: Response;
  try {
    response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
        'X-Title': 'SchoolKompass',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
    });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new Error('Request timed out. The AI is taking too long — try again.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  return typeof content === 'string' ? content : '';
};
