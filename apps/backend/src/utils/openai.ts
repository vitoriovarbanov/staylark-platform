import OpenAI from "openai";
import { env } from "../config/env.js";

export const openai = env.USE_OPENAI_MOCK
  ? (null as unknown as OpenAI) // Mock: replaced by mock utility in FEED-001
  : new OpenAI({ apiKey: env.OPENAI_API_KEY });

export const isOpenAIMocked = env.USE_OPENAI_MOCK;
