export type StreamingPlatform =
  | "netflix"
  | "prime-video"
  | "disney-plus"
  | "max-hbo"
  | "youtube"
  | "outros";

export type FilmGenre =
  | "ação"
  | "aventura"
  | "comédia"
  | "drama"
  | "terror"
  | "ficção-científica"
  | "romance"
  | "thriller"
  | "documentário"
  | "animação"
  | "fantasia"
  | "suspense"
  | "crime"
  | "guerra"
  | "biografia"
  | "história"
  | "música"
  | "família"
  | "western"
  | "outros";

export type CustomFilm = {
  id: string;
  name: string;
  year?: number;
  genre?: FilmGenre;
  streaming?: StreamingPlatform;
  link?: string;
  notes?: string;
  addedBy?: string;
  addedAt: string;
};

export const streamingPlatforms: Array<{
  id: StreamingPlatform;
  name: string;
  color: string;
}> = [
  { id: "netflix", name: "Netflix", color: "#E50914" },
  { id: "prime-video", name: "Prime Video", color: "#00A8E1" },
  { id: "disney-plus", name: "Disney+", color: "#113CCF" },
  { id: "max-hbo", name: "Max (HBO)", color: "#8B5CF6" },
  { id: "youtube", name: "YouTube", color: "#FF0000" },
  { id: "outros", name: "Outros", color: "#6B7280" }
];

export const filmGenres: Array<{ id: FilmGenre; name: string }> = [
  { id: "ação", name: "Ação" },
  { id: "aventura", name: "Aventura" },
  { id: "comédia", name: "Comédia" },
  { id: "drama", name: "Drama" },
  { id: "terror", name: "Terror" },
  { id: "ficção-científica", name: "Ficção Científica" },
  { id: "romance", name: "Romance" },
  { id: "thriller", name: "Thriller" },
  { id: "documentário", name: "Documentário" },
  { id: "animação", name: "Animação" },
  { id: "fantasia", name: "Fantasia" },
  { id: "suspense", name: "Suspense" },
  { id: "crime", name: "Crime" },
  { id: "guerra", name: "Guerra" },
  { id: "biografia", name: "Biografia" },
  { id: "história", name: "História" },
  { id: "música", name: "Música" },
  { id: "família", name: "Família" },
  { id: "western", name: "Western" },
  { id: "outros", name: "Outros" }
];

export function createCustomFilm(
  data: Omit<CustomFilm, "id" | "addedAt">
): CustomFilm {
  return {
    id: `film-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    addedAt: new Date().toISOString(),
    ...data
  };
}

export function getStreamingPlatformInfo(platform: StreamingPlatform) {
  return streamingPlatforms.find((p) => p.id === platform);
}

export function getFilmGenreInfo(genre: FilmGenre) {
  return filmGenres.find((g) => g.id === genre);
}
