import { toast } from "sonner";
import type { TriviaColumn, TriviaQuestionTile } from "@/modules/trivia/types";
import type { ParsedImport } from "@/components/ui/QuestionImportModal";
import {
  processQuestionImports,
  countImportedQuestions,
  createQuestionTileId
} from "../utils/questionUtils";

/**
 * Hook para gerenciar perguntas e board
 */
export function useQuestionManagement(
  addQuestionTile: (
    columnId: string,
    tile: Partial<TriviaQuestionTile> & {
      points: number;
      question: string;
      answer?: string;
    }
  ) => void,
  removeQuestionTile: (columnId: string, tileId: string) => void,
  addFilmColumn: (displayName?: string) => string,
  removeFilmColumn: (columnId: string) => void
) {
  const importQuestions = (imports: ParsedImport[]) => {
    try {
      const tiles = processQuestionImports(imports);
      let totalImported = 0;

      tiles.forEach(({ columnId, tile }) => {
        const tileId = createQuestionTileId(columnId, tile.points);
        addQuestionTile(columnId, {
          id: tileId,
          ...tile
        });
        totalImported++;
      });

      console.log(
        `[✅ IMPORT] ${totalImported} perguntas importadas para ${imports.length} filmes`
      );
      toast.success(`${totalImported} perguntas importadas com sucesso!`);
    } catch (error) {
      console.error("Erro ao importar perguntas:", error);
      toast.error("Erro ao importar perguntas");
    }
  };

  const addQuestion = (columnId: string) => {
    addQuestionTile(columnId, {
      points: 10,
      question: "Nova pergunta",
      answer: ""
    });
    toast.success("Pergunta adicionada");
  };

  const removeQuestion = (columnId: string, tileId: string) => {
    if (window.confirm("Remover esta pergunta?")) {
      removeQuestionTile(columnId, tileId);
      toast.success("Pergunta removida");
    }
  };

  const addFilm = () => {
    addFilmColumn("Novo Filme");
    toast.success("Filme adicionado");
  };

  const removeFilm = (columnId: string, filmName: string) => {
    if (
      window.confirm(`Remover o filme "${filmName}" e todas as suas perguntas?`)
    ) {
      removeFilmColumn(columnId);
      toast.success("Filme removido da biblioteca");
    }
  };

  return {
    importQuestions,
    addQuestion,
    removeQuestion,
    addFilm,
    removeFilm
  };
}
