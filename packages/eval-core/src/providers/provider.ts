import { mockProvider } from "./mock.js";
import { openAIProvider } from "./openai.js";

import type { ModelProvider } from "../types.js";

export type { ModelProvider };

const providers: Record<string, ModelProvider> = {
  openai: openAIProvider,
  mock: mockProvider
};

export function getModelProvider(name: string): ModelProvider {
  const provider = providers[name];
  if (!provider) {
    throw new Error(`Unsupported model provider: ${name}`);
  }
  return provider;
}
