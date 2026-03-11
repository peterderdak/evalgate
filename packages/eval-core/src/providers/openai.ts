import type { ModelProvider } from "../types.js";
import { parseStructuredOutput } from "../validators/output.js";

export const openAIProvider: ModelProvider = {
  async invokeStructured(params) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${params.apiKey}`
      },
      body: JSON.stringify({
        model: params.model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You must return only valid JSON matching this schema: ${JSON.stringify(params.schema)}`
          },
          {
            role: "user",
            content: `Input payload:\n${JSON.stringify(params.input, null, 2)}\n\nPrompt:\n${params.prompt}`
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI request failed: ${response.status} ${await response.text()}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };

    const rawText = data.choices?.[0]?.message?.content ?? "";
    return {
      rawText,
      parsedJson: parseStructuredOutput(rawText),
      usage: {
        inputTokens: data.usage?.prompt_tokens,
        outputTokens: data.usage?.completion_tokens
      }
    };
  }
};
