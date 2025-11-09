import { useState } from "react";
import { Button } from "./Button";
import { Modal } from "./Modal";
import { Upload, AlertCircle, CheckCircle2, FileText } from "lucide-react";
import type { TriviaColumn } from "../../modules/trivia/types";
import { toast } from "sonner";

interface QuestionImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  columns: TriviaColumn[];
  onImport: (imports: ParsedImport[]) => void;
}

export interface ParsedImport {
  filmName: string;
  columnId: string;
  questions: Array<{
    points: number;
    question: string;
    answer: string;
  }>;
}

interface ParseResult {
  success: boolean;
  imports: ParsedImport[];
  errors: string[];
  warnings: string[];
}

export function QuestionImportModal({
  isOpen,
  onClose,
  columns,
  onImport,
}: QuestionImportModalProps) {
  const [text, setText] = useState("");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const normalizeFilmName = (name: string): string => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, "")
      .trim();
  };

  const findMatchingColumn = (filmName: string): TriviaColumn | null => {
    const normalizedSearch = normalizeFilmName(filmName);
    
    return (
      columns.find((col) => normalizeFilmName(col.film) === normalizedSearch) || null
    );
  };

  const parseImportText = (importText: string): ParseResult => {
    const lines = importText.split("\n").map((line) => line.trim());
    const imports: ParsedImport[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    let currentFilm: string | null = null;
    let currentLevel: number | null = null;
    let currentColumn: TriviaColumn | null = null;
    let filmQuestions: Array<{ points: number; question: string; answer: string }> = [];

    const filmMarkers = [
      "TRÓIA", "TROIA", "LILO", "STITCH", "YOUR NAME", "CORCUNDA", "NOTRE DAME", 
      "ERA DO GELO", "ORGULHO", "PRECONCEITO"
    ];

    const levelMarkers = ["Nível 5", "Nível 10", "Nível 15", "Nível 20", "Nível 30", "Nível 50"];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (!line) continue;

      const isFilmLine = filmMarkers.some((marker) =>
        line.toUpperCase().includes(marker.toUpperCase())
      );

      if (isFilmLine) {
        if (currentFilm && currentColumn && filmQuestions.length > 0) {
          imports.push({
            filmName: currentFilm,
            columnId: currentColumn.id,
            questions: filmQuestions,
          });
        }

        const filmName = line
          .replace(/^[^\w\s]+\s*/g, "")
          .replace(/\s+$/g, "")
          .trim();
        
        const matchedColumn = findMatchingColumn(filmName);

        if (matchedColumn) {
          currentFilm = filmName;
          currentColumn = matchedColumn;
          filmQuestions = [];
        } else {
          warnings.push(`Filme não encontrado no board: "${filmName}"`);
          currentFilm = null;
          currentColumn = null;
        }
        continue;
      }

      const levelMatch = levelMarkers.find((marker) => line.includes(marker));
      if (levelMatch) {
        currentLevel = parseInt(levelMatch.replace("Nível ", ""));
        continue;
      }

      const questionMatch = line.match(/^(\d+)\.\s*⁠?\s*(.+)/);
      if (questionMatch && currentLevel && currentFilm) {
        const questionText = questionMatch[2].trim();
        
        let answerText = "";
        for (let j = i + 1; j < lines.length; j++) {
          const nextLine = lines[j];
          
          if (!nextLine) break;
          if (nextLine.match(/^(\d+)\.\s*⁠?\s*/)) break;
          if (levelMarkers.some((m) => nextLine.includes(m))) break;
          if (filmMarkers.some((m) => nextLine.toUpperCase().includes(m.toUpperCase()))) break;
          
          answerText += (answerText ? " " : "") + nextLine;
        }

        if (answerText) {
          filmQuestions.push({
            points: currentLevel,
            question: questionText,
            answer: answerText.trim(),
          });
        } else {
          warnings.push(`Pergunta sem resposta: "${questionText}" (${currentFilm}, ${currentLevel} pts)`);
        }
      }
    }

    if (currentFilm && currentColumn && filmQuestions.length > 0) {
      imports.push({
        filmName: currentFilm,
        columnId: currentColumn.id,
        questions: filmQuestions,
      });
    }
    
    return {
      success: imports.length > 0 && errors.length === 0,
      imports,
      errors,
      warnings,
    };
  };

  const handleParse = () => {
    setIsProcessing(true);
    
    try {
      const result = parseImportText(text);
      setParseResult(result);
      
      if (result.success) {
        const totalQuestions = result.imports.reduce(
          (sum, imp) => sum + imp.questions.length,
          0
        );
        toast.success(`${totalQuestions} perguntas identificadas em ${result.imports.length} filmes`);
      } else if (result.errors.length > 0) {
        toast.error("Erros encontrados no texto");
      }
    } catch (error) {
      console.error("Erro ao processar texto:", error);
      toast.error("Erro ao processar o texto");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = () => {
    if (!parseResult || !parseResult.success) return;

    onImport(parseResult.imports);
    
    const totalQuestions = parseResult.imports.reduce(
      (sum, imp) => sum + imp.questions.length,
      0
    );
    
    toast.success(`${totalQuestions} perguntas importadas com sucesso!`);
    handleClose();
  };

  const handleClose = () => {
    setText("");
    setParseResult(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Importar Perguntas"
      description="Cole o texto formatado com filmes, níveis e perguntas"
    >
      <div className="space-y-4">
        <div className="p-4 rounded-xl bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-[var(--color-primary)] mt-0.5 flex-shrink-0" />
            <div className="text-sm text-[var(--color-text)]">
              <p className="font-semibold mb-1">Formato esperado:</p>
              <ul className="text-xs text-[var(--color-muted)] space-y-1">
                <li>• Título do filme (ex: ⚔️ TRÓIA ou apenas TRÓIA)</li>
                <li>• Nível de pontuação (ex: Nível 5)</li>
                <li>• Perguntas numeradas (ex: 1. Pergunta?)</li>
                <li>• Resposta logo abaixo da pergunta</li>
              </ul>
            </div>
          </div>
        </div>

        {!parseResult ? (
          <>
            <div>
              <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                Cole o texto aqui
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Cole aqui o texto com perguntas e respostas..."
                className="w-full h-64 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] font-mono"
              />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleParse}
                disabled={!text.trim() || isProcessing}
                className="flex-1"
              >
                <Upload className="h-4 w-4 mr-2" />
                {isProcessing ? "Processando..." : "Analisar Texto"}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {parseResult.success && (
                <div className="p-4 rounded-xl bg-green-50 border border-green-200">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-green-900">
                        Análise concluída com sucesso!
                      </p>
                      <p className="text-xs text-green-700 mt-1">
                        {parseResult.imports.reduce((sum, imp) => sum + imp.questions.length, 0)}{" "}
                        perguntas encontradas em {parseResult.imports.length} filmes
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {parseResult.errors.length > 0 && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-red-900 mb-2">Erros encontrados:</p>
                      <ul className="text-xs text-red-700 space-y-1">
                        {parseResult.errors.map((error, i) => (
                          <li key={i}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {parseResult.warnings.length > 0 && (
                <div className="p-4 rounded-xl bg-yellow-50 border border-yellow-200">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-yellow-900 mb-2">Avisos:</p>
                      <ul className="text-xs text-yellow-700 space-y-1">
                        {parseResult.warnings.map((warning, i) => (
                          <li key={i}>• {warning}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {parseResult.imports.map((imp, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-sm text-[var(--color-text)]">
                      {imp.filmName}
                    </h4>
                    <span className="text-xs font-medium text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-1 rounded-full">
                      {imp.questions.length} perguntas
                    </span>
                  </div>
                  <div className="space-y-1">
                    {imp.questions.map((q, j) => (
                      <div
                        key={j}
                        className="text-xs text-[var(--color-muted)] flex items-start gap-2"
                      >
                        <span className="font-semibold text-[var(--color-primary)]">
                          {q.points}pts
                        </span>
                        <span className="flex-1 line-clamp-1">{q.question}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setParseResult(null);
                  setText("");
                }}
                className="flex-1"
              >
                Voltar
              </Button>
              <Button
                variant="primary"
                onClick={handleImport}
                disabled={!parseResult.success}
                className="flex-1"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Importar Perguntas
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

