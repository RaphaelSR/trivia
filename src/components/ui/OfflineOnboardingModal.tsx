import { useState } from "react";
import { Button } from "./Button";
import { Modal } from "./Modal";
import { Palette, Lock, Users, Check, CheckCircle, Edit, Film, Plus, Trash2, X, Info } from "lucide-react";
import { useThemeMode } from "../../app/providers/useThemeMode";

interface OfflineOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (config: OfflineConfig) => void;
  onSkip?: () => void;
}

interface OfflineConfig {
  theme: string;
  pin: string;
  sessionTitle: string;
  sessionDate: string;
  customFilms: Array<{
    name: string;
    year?: number;
    genre?: string;
    streaming?: string;
    link?: string;
    notes?: string;
  }>;
  teams: Array<{
    name: string;
    color: string;
    members: string[];
  }>;
}

const themeOptions = [
  { id: "dark", name: "Tema Escuro", description: "Cores escuras e elegantes" },
  { id: "light", name: "Tema Claro", description: "Cores claras e vibrantes" },
  { id: "cinema", name: "Tema Cinema", description: "Atmosfera cinematográfica" },
  { id: "retro", name: "Tema Retro 80s", description: "Cores neon e nostalgia dos anos 80" },
  { id: "matrix", name: "Tema Matrix", description: "Verde digital e efeito terminal" },
  { id: "brazil", name: "Tema Brasil 🇧🇷", description: "Cores verde e amarelo da bandeira brasileira" },
];

const teamColors = [
  "#4f46e5", "#22d3ee", "#f97316", "#ef4444", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899"
];

const filmGenres = [
  "Ação", "Aventura", "Comédia", "Drama", "Ficção Científica", "Terror", 
  "Romance", "Animação", "Documentário", "Musical", "Suspense", "Fantasia"
];

const streamingPlatforms = [
  "Netflix", "Amazon Prime", "Disney+", "HBO Max", "Apple TV+", "Paramount+", 
  "Globoplay", "Star+", "Crunchyroll", "Outro"
];

export function OfflineOnboardingModal({
  isOpen,
  onClose,
  onComplete,
  onSkip,
}: OfflineOnboardingModalProps) {
  const { setTheme } = useThemeMode();
  const [currentStep, setCurrentStep] = useState(1);
  const [config, setConfig] = useState<OfflineConfig>({
    theme: "dark",
    pin: "",
    sessionTitle: "Nova Sessão Offline",
    sessionDate: new Date().toISOString().split('T')[0],
    customFilms: [],
    teams: [],
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    year: "",
    genre: "",
    streaming: "",
    link: "",
    notes: ""
  });

  const handleThemeSelect = (themeId: string) => {
    setConfig((prev) => ({ ...prev, theme: themeId }));
    setTheme(themeId as "light" | "dark" | "cinema" | "retro" | "matrix" | "brazil");
  };

  const handlePinChange = (pin: string) => {
    setConfig((prev) => ({ ...prev, pin }));
  };

  const handleTitleChange = (title: string) => {
    setConfig((prev) => ({ ...prev, sessionTitle: title }));
  };

  const handleDateChange = (date: string) => {
    setConfig((prev) => ({ ...prev, sessionDate: date }));
  };

  const handleFilmAdd = (filmData: {
    name: string;
    year?: number;
    genre?: string;
    streaming?: string;
    link?: string;
    notes?: string;
  }) => {
    setConfig((prev) => ({
      ...prev,
      customFilms: [...prev.customFilms, filmData]
    }));
  };

  const handleFilmUpdate = (index: number, updates: Partial<typeof config.customFilms[0]>) => {
    setConfig((prev) => ({
      ...prev,
      customFilms: prev.customFilms.map((film, i) => i === index ? { ...film, ...updates } : film)
    }));
  };

  const handleFilmRemove = (index: number) => {
    setConfig((prev) => ({
      ...prev,
      customFilms: prev.customFilms.filter((_, i) => i !== index)
    }));
  };

  const handleTeamAdd = () => {
    const newTeam = {
      name: `Time ${config.teams.length + 1}`,
      color: teamColors[config.teams.length % teamColors.length],
      members: []
    };
    setConfig((prev) => ({ ...prev, teams: [...prev.teams, newTeam] }));
  };

  const handleTeamUpdate = (index: number, updates: Partial<typeof config.teams[0]>) => {
    setConfig((prev) => ({
      ...prev,
      teams: prev.teams.map((team, i) => i === index ? { ...team, ...updates } : team)
    }));
  };

  const handleTeamRemove = (index: number) => {
    setConfig((prev) => ({
      ...prev,
      teams: prev.teams.filter((_, i) => i !== index)
    }));
  };

  const handleMemberAdd = (teamIndex: number, memberName: string) => {
    if (memberName.trim()) {
      setConfig((prev) => ({
        ...prev,
        teams: prev.teams.map((team, i) => 
          i === teamIndex 
            ? { ...team, members: [...team.members, memberName.trim()] }
            : team
        )
      }));
    }
  };

  const handleMemberRemove = (teamIndex: number, memberIndex: number) => {
    setConfig((prev) => ({
      ...prev,
      teams: prev.teams.map((team, i) => 
        i === teamIndex 
          ? { ...team, members: team.members.filter((_, j) => j !== memberIndex) }
          : team
      )
    }));
  };

  const handleNext = () => {
    if (currentStep < 6) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete(config);
      handleClose(); // Fecha o modal após completar
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    // Reset do estado quando fechar
    setCurrentStep(1);
    setConfig({
      theme: "dark",
      pin: "",
      sessionTitle: "Nova Sessão Offline",
      sessionDate: new Date().toISOString().split('T')[0],
      customFilms: [],
      teams: [],
    });
    setShowAddForm(false);
    setEditingIndex(null);
    setFormData({ name: "", year: "", genre: "", streaming: "", link: "", notes: "" });
    onClose();
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return config.theme !== "";
      case 2:
        return config.pin.length >= 4;
      case 3:
        return config.sessionTitle.trim().length > 0;
      case 4:
        return config.customFilms.length >= 2;
      case 5:
        return config.teams.length >= 2 && config.teams.every(team => team.members.length > 0);
      case 6:
        return true; // Resumo final
      default:
        return false;
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto w-16 h-16 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center">
          <Palette className="h-8 w-8 text-[var(--color-primary)]" />
        </div>
        <h3 className="text-xl font-semibold text-[var(--color-text)]">
          Escolha o Tema Visual
        </h3>
        <p className="text-[var(--color-muted)]">
          Selecione o tema que melhor se adapta ao seu ambiente
        </p>
      </div>

      <div className="grid gap-4 max-h-[400px] overflow-y-auto pr-2">
        {themeOptions.map((theme) => (
          <button
            key={theme.id}
            onClick={() => handleThemeSelect(theme.id)}
            className={`p-4 rounded-2xl border-2 transition-all ${
              config.theme === theme.id
                ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                : "border-[var(--color-border)] hover:border-[var(--color-primary)]/50"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-4 h-4 rounded-full border-2 ${
                  config.theme === theme.id
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]"
                    : "border-[var(--color-border)]"
                }`}
              />
              <div className="text-left">
                <h4 className="font-semibold text-[var(--color-text)]">
                  {theme.name}
                </h4>
                <p className="text-sm text-[var(--color-muted)]">
                  {theme.description}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto w-16 h-16 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center">
          <Lock className="h-8 w-8 text-[var(--color-primary)]" />
        </div>
        <h3 className="text-xl font-semibold text-[var(--color-text)]">
          Configure o PIN de Acesso
        </h3>
        <p className="text-[var(--color-muted)]">
          Defina um PIN personalizado para acessar as configurações do jogo
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
            PIN de Acesso
          </label>
          <input
            type="password"
            value={config.pin}
            onChange={(e) => handlePinChange(e.target.value)}
            placeholder="Digite um PIN com pelo menos 4 dígitos"
            className="w-full px-4 py-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)] placeholder-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            maxLength={20}
          />
          <p className="text-xs text-[var(--color-muted)] mt-1">
            Mínimo 4 caracteres. Use apenas números e letras.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20">
          <div className="flex items-start gap-3">
            <Check className="h-5 w-5 text-[var(--color-primary)] mt-0.5" />
            <div>
              <h4 className="font-semibold text-[var(--color-text)] text-sm">
                Dica de Segurança
              </h4>
              <p className="text-xs text-[var(--color-muted)] mt-1">
                Escolha um PIN que você possa lembrar facilmente, mas que não seja
                óbvio para outros jogadores.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto w-16 h-16 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center">
          <Users className="h-8 w-8 text-[var(--color-primary)]" />
        </div>
        <h3 className="text-xl font-semibold text-[var(--color-text)]">
          Informações da Sessão
        </h3>
        <p className="text-[var(--color-muted)]">
          Configure o nome e data da sua sessão de trivia (opcional - pode configurar depois)
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
            Nome da Sessão
          </label>
          <input
            type="text"
            value={config.sessionTitle}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Ex: Noite de Trivia - Janeiro 2025"
            className="w-full px-4 py-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)] placeholder-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            maxLength={50}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
            Data da Sessão
          </label>
          <input
            type="date"
            value={config.sessionDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
          />
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => {

    const handleFormSubmit = () => {
      if (!formData.name.trim()) return;

      const filmData = {
        name: formData.name.trim(),
        year: formData.year ? parseInt(formData.year) : undefined,
        genre: formData.genre || undefined,
        streaming: formData.streaming || undefined,
        link: formData.link.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      };

      if (editingIndex !== null) {
        handleFilmUpdate(editingIndex, filmData);
      } else {
        handleFilmAdd(filmData);
      }

      setFormData({ name: "", year: "", genre: "", streaming: "", link: "", notes: "" });
      setShowAddForm(false);
      setEditingIndex(null);
    };

    const handleEdit = (index: number) => {
      const film = config.customFilms[index];
      setFormData({
        name: film.name,
        year: film.year?.toString() || "",
        genre: film.genre || "",
        streaming: film.streaming || "",
        link: film.link || "",
        notes: film.notes || ""
      });
      setEditingIndex(index);
      setShowAddForm(true);
    };

    const handleCancel = () => {
      setFormData({ name: "", year: "", genre: "", streaming: "", link: "", notes: "" });
      setShowAddForm(false);
      setEditingIndex(null);
    };

    if (showAddForm) {
      return (
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center">
              <Film className="h-8 w-8 text-[var(--color-primary)]" />
            </div>
            <h3 className="text-xl font-semibold text-[var(--color-text)]">
              {editingIndex !== null ? "Editar Filme" : "Adicionar Filme"}
            </h3>
            <p className="text-[var(--color-muted)]">
              {editingIndex !== null ? "Edite as informações do filme" : "Adicione um novo filme para o trivia"}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                Nome do Filme *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Vingadores: Ultimato"
                className="w-full px-4 py-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)] placeholder-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                  Ano
                </label>
                <input
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData(prev => ({ ...prev, year: e.target.value }))}
                  placeholder="2023"
                  min="1900"
                  max="2030"
                  className="w-full px-4 py-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)] placeholder-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                  Gênero
                </label>
                <select
                  value={formData.genre}
                  onChange={(e) => setFormData(prev => ({ ...prev, genre: e.target.value }))}
                  className="w-full px-4 py-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                >
                  <option value="">Selecione um gênero</option>
                  {filmGenres.map(genre => (
                    <option key={genre} value={genre}>{genre}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                Plataforma de Streaming
              </label>
              <select
                value={formData.streaming}
                onChange={(e) => setFormData(prev => ({ ...prev, streaming: e.target.value }))}
                className="w-full px-4 py-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              >
                <option value="">Selecione uma plataforma</option>
                {streamingPlatforms.map(platform => (
                  <option key={platform} value={platform}>{platform}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                Link (opcional)
              </label>
              <input
                type="url"
                value={formData.link}
                onChange={(e) => setFormData(prev => ({ ...prev, link: e.target.value }))}
                placeholder="https://..."
                className="w-full px-4 py-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)] placeholder-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                Observações (opcional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Informações adicionais sobre o filme..."
                rows={3}
                className="w-full px-4 py-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)] placeholder-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent resize-none"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={handleCancel}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleFormSubmit}
                disabled={!formData.name.trim()}
                className="flex-1"
              >
                {editingIndex !== null ? "Atualizar" : "Adicionar"} Filme
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center">
            <Film className="h-8 w-8 text-[var(--color-primary)]" />
          </div>
          <h3 className="text-xl font-semibold text-[var(--color-text)]">
            Criar Filmes
          </h3>
          <p className="text-[var(--color-muted)]">
            Adicione pelo menos 2 filmes para o tabuleiro de trivia (opcional - pode adicionar depois pela Biblioteca)
          </p>
        </div>

        <div className="space-y-4">
          {config.customFilms.length > 0 && (
            <div className="space-y-3">
              {config.customFilms.map((film, index) => (
                <div key={index} className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-[var(--color-text)]">{film.name}</h4>
                      <div className="flex flex-wrap gap-2 mt-2 text-sm text-[var(--color-muted)]">
                        {film.year && <span>• {film.year}</span>}
                        {film.genre && <span>• {film.genre}</span>}
                        {film.streaming && <span>• {film.streaming}</span>}
                      </div>
                      {film.notes && (
                        <p className="text-sm text-[var(--color-muted)] mt-2">{film.notes}</p>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(index)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleFilmRemove(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Button
            variant="outline"
            onClick={() => setShowAddForm(true)}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Filme
          </Button>

          {config.customFilms.length > 0 && (
            <div className="p-4 rounded-2xl bg-[var(--color-secondary)]/5 border border-[var(--color-secondary)]/20">
              <h4 className="font-semibold text-[var(--color-text)] text-sm mb-2">
                Filmes Criados ({config.customFilms.length})
              </h4>
              <p className="text-sm text-[var(--color-muted)]">
                {config.customFilms.length >= 2 
                  ? "✅ Mínimo de filmes atingido!" 
                  : `Adicione mais ${2 - config.customFilms.length} filme(s) para continuar.`
                }
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderStep5 = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto w-16 h-16 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center">
          <Users className="h-8 w-8 text-[var(--color-primary)]" />
        </div>
        <h3 className="text-xl font-semibold text-[var(--color-text)]">
          Configurar Times
        </h3>
        <p className="text-[var(--color-muted)]">
          Crie pelo menos 2 times com membros para começar o jogo (opcional - pode configurar depois pelo botão "Times")
        </p>
      </div>

      <div className="space-y-4">
        {config.teams.map((team, index) => (
          <div key={index} className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-6 h-6 rounded-full"
                style={{ backgroundColor: team.color }}
              />
              <input
                type="text"
                value={team.name}
                onChange={(e) => handleTeamUpdate(index, { name: e.target.value })}
                className="flex-1 px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                placeholder="Nome do time"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTeamRemove(index)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nome do membro"
                  className="flex-1 px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleMemberAdd(index, e.currentTarget.value);
                      e.currentTarget.value = '';
                    }
                  }}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={(e) => {
                    const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                    handleMemberAdd(index, input.value);
                    input.value = '';
                  }}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {team.members.map((member, memberIndex) => (
                  <span
                    key={memberIndex}
                    className="flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-sm"
                  >
                    {member}
                    <button
                      onClick={() => handleMemberRemove(index, memberIndex)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}

        <Button
          variant="outline"
          onClick={handleTeamAdd}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Time
        </Button>
      </div>
    </div>
  );

  const renderStep6 = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto w-16 h-16 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center">
          <CheckCircle className="h-8 w-8 text-[var(--color-primary)]" />
        </div>
        <h3 className="text-xl font-semibold text-[var(--color-text)]">
          Resumo da Configuração
        </h3>
        <p className="text-[var(--color-muted)]">
          Revise as configurações antes de finalizar
        </p>
      </div>

      <div className="p-4 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-[var(--color-primary)] mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-semibold text-[var(--color-text)] text-sm mb-1">
              Lembre-se
            </h4>
            <p className="text-xs text-[var(--color-muted)]">
              Você pode acessar todas essas configurações a qualquer momento pelo dashboard principal. Use o botão "Times" para gerenciar times, "Biblioteca" para filmes e perguntas, e "Tema" para alterar o visual.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="p-4 rounded-2xl bg-[var(--color-secondary)]/5 border border-[var(--color-secondary)]/20">
          <h4 className="font-semibold text-[var(--color-text)] text-sm mb-3">Configurações Gerais</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--color-muted)]">Tema:</span>
              <span className="text-[var(--color-text)]">
                {themeOptions.find((t) => t.id === config.theme)?.name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-muted)]">PIN:</span>
              <span className="text-[var(--color-text)]">
                {config.pin ? "•".repeat(config.pin.length) : "Não definido"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-muted)]">Sessão:</span>
              <span className="text-[var(--color-text)]">{config.sessionTitle}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-muted)]">Data:</span>
              <span className="text-[var(--color-text)]">
                {new Date(config.sessionDate).toLocaleDateString('pt-BR')}
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--color-secondary)]/5 border border-[var(--color-secondary)]/20">
          <h4 className="font-semibold text-[var(--color-text)] text-sm mb-3">
            Filmes Criados ({config.customFilms.length})
          </h4>
          <div className="space-y-2">
            {config.customFilms.map((film, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[var(--color-primary)]" />
                <span className="text-sm text-[var(--color-text)]">
                  {film.name}
                  {film.year && ` (${film.year})`}
                  {film.genre && ` • ${film.genre}`}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--color-secondary)]/5 border border-[var(--color-secondary)]/20">
          <h4 className="font-semibold text-[var(--color-text)] text-sm mb-3">
            Times Configurados ({config.teams.length})
          </h4>
          <div className="space-y-2">
            {config.teams.map((team, index) => (
              <div key={index} className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: team.color }}
                />
                <span className="text-sm text-[var(--color-text)]">
                  {team.name} ({team.members.length} membros)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      case 5:
        return renderStep5();
      case 6:
        return renderStep6();
      default:
        return renderStep1();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Configuração Inicial">
      <div className="p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold text-[var(--color-text)]">
              Configuração Inicial
            </h2>
            <span className="text-sm text-[var(--color-muted)]">
              Etapa {currentStep} de 6
            </span>
          </div>
          <div className="w-full bg-[var(--color-border)] rounded-full h-2">
            <div
              className="bg-[var(--color-primary)] h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 6) * 100}%` }}
            />
          </div>
        </div>

        {currentStep === 1 && (
          <div className="mb-6 p-4 rounded-2xl bg-[var(--color-secondary)]/10 border border-[var(--color-secondary)]/20">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-[var(--color-secondary)] mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-[var(--color-text)] text-sm mb-1">
                  Todos os passos são opcionais
                </h4>
                <p className="text-xs text-[var(--color-muted)]">
                  Você pode configurar tudo depois pelo dashboard principal. Este assistente apenas ajuda a configurar rapidamente na primeira vez.
                </p>
              </div>
            </div>
          </div>
        )}

        {renderCurrentStep()}

        <div className="flex justify-between mt-8">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={currentStep === 1 ? handleClose : handleBack}
            >
              {currentStep === 1 ? "Cancelar" : "Voltar"}
            </Button>
            {onSkip && currentStep === 1 && (
              <Button
                variant="ghost"
                onClick={onSkip}
                className="text-[var(--color-muted)] hover:text-[var(--color-text)]"
              >
                Pular Onboarding
              </Button>
            )}
          </div>
          <Button
            onClick={handleNext}
            disabled={!isStepValid()}
          >
            {currentStep === 6 ? "Finalizar" : "Continuar"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
