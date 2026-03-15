import type { AIRewriteInput } from "./types";

export interface AIService {
  isAvailable(): boolean | Promise<boolean>;
  rewriteStructuredAnswer(input: AIRewriteInput): Promise<string>;
  readonly serviceId: string;
}

let _service: AIService | null = null;

export function registerAIService(service: AIService): void {
  _service = service;
}

export function getAIService(): AIService | null {
  return _service;
}
