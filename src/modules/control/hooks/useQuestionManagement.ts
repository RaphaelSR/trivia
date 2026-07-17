import { toast } from "sonner";
import type { TriviaQuestionTile } from "@/modules/trivia/types";
import type { ParsedImport } from "@/components/ui/QuestionImportModal";
import {
  processQuestionImports,
  createQuestionTileId
} from "../utils/questionUtils";
import { useTranslation } from '@/shared/i18n'

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
  const { t } = useTranslation('game')
  const { t: tCommon } = useTranslation('common')

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
      toast.success(t('library.notifications.imported', {
        questions: tCommon('entities.question', { count: totalImported }),
      }));
    } catch (error) {
      console.error("Erro ao importar perguntas:", error);
      toast.error(t('library.notifications.importError'));
    }
  };

  const addQuestion = (columnId: string) => {
    addQuestionTile(columnId, {
      points: 10,
      question: t('library.defaults.question'),
      answer: ""
    });
    toast.success(t('library.notifications.questionAdded'));
  };

  const removeQuestion = (columnId: string, tileId: string) => {
    if (window.confirm(t('library.confirmations.removeQuestion'))) {
      removeQuestionTile(columnId, tileId);
      toast.success(t('library.notifications.questionRemoved'));
    }
  };

  const addFilm = () => {
    addFilmColumn(t('library.defaults.film'));
    toast.success(t('library.notifications.filmAdded'));
  };

  const removeFilm = (columnId: string, filmName: string) => {
    if (
      window.confirm(t('library.confirmations.removeFilm', { film: filmName }))
    ) {
      removeFilmColumn(columnId);
      toast.success(t('library.notifications.filmRemoved'));
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
