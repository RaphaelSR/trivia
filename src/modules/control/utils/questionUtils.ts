import type { ParsedImport } from "@/components/ui/QuestionImportModal";
import type { TriviaQuestionTile } from "@/modules/trivia/types";

/**
 * Gera um ID único para tile de pergunta
 */
export function createQuestionTileId(columnId: string, points: number): string {
  return `${columnId}-${points}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Processa imports de perguntas e retorna tiles formatados
 */
export function processQuestionImports(imports: ParsedImport[]): Array<{
  columnId: string;
  tile: Omit<TriviaQuestionTile, "id">;
}> {
  const tiles: Array<{
    columnId: string;
    tile: Omit<TriviaQuestionTile, "id">;
  }> = [];

  imports.forEach((imp) => {
    imp.questions.forEach((q) => {
      tiles.push({
        columnId: imp.columnId,
        tile: {
          film: imp.filmName,
          points: q.points,
          question: q.question,
          answer: q.answer,
          state: "available" as const
        }
      });
    });
  });

  return tiles;
}

/**
 * Conta total de perguntas importadas
 */
export function countImportedQuestions(imports: ParsedImport[]): number {
  return imports.reduce((total, imp) => total + imp.questions.length, 0);
}
