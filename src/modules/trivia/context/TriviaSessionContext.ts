import { createContext } from "react";
import type { TriviaSessionContextValue } from "../types/TriviaSessionContext";

export const TriviaSessionContext =
  createContext<TriviaSessionContextValue | null>(null);
