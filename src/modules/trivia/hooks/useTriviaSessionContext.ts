import { useContext } from "react";
import { TriviaSessionContext } from "../context/TriviaSessionContext";
import type { TriviaSessionContextValue } from "../types/TriviaSessionContext";

export function useTriviaSessionContext(): TriviaSessionContextValue {
  const context = useContext(TriviaSessionContext);
  if (!context) {
    throw new Error(
      "useTriviaSessionContext must be used within TriviaSessionProvider"
    );
  }
  return context;
}
