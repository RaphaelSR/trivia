export type FilmTheme = {
  primary: string
  accent: string
  background: string
  text: string
}

export type FilmMetadata = {
  id: string
  displayName: string
  theme: FilmTheme
}

export const filmsMetadata: Record<string, FilmMetadata> = {
  'THE OLD GUARD': {
    id: 'THE OLD GUARD',
    displayName: 'The Old Guard',
    theme: {
      primary: '#4f46e5',
      accent: '#a5b4fc',
      background: '#eef2ff',
      text: '#1f2937',
    },
  },
  'PRINCESA MONONOKE': {
    id: 'PRINCESA MONONOKE',
    displayName: 'Princesa Mononoke',
    theme: {
      primary: '#2e7d32',
      accent: '#a5d6a7',
      background: '#f1f8e9',
      text: '#1b5e20',
    },
  },
  'TA CHOVENDO HAMBURGUER': {
    id: 'TA CHOVENDO HAMBURGUER',
    displayName: 'Tá Chovendo Hambúrguer',
    theme: {
      primary: '#f97316',
      accent: '#fcd34d',
      background: '#fff7ed',
      text: '#7c2d12',
    },
  },
  'A BELA E A FERA': {
    id: 'A BELA E A FERA',
    displayName: 'A Bela e a Fera',
    theme: {
      primary: '#c084fc',
      accent: '#fde68a',
      background: '#fdf4ff',
      text: '#6b21a8',
    },
  },
  'OS INCRIVEIS': {
    id: 'OS INCRIVEIS',
    displayName: 'Os Incríveis',
    theme: {
      primary: '#ef4444',
      accent: '#f97316',
      background: '#fee2e2',
      text: '#7f1d1d',
    },
  },
}

export function getFilmMetadata(id: string): FilmMetadata {
  return filmsMetadata[id] ?? {
    id,
    displayName: id,
    theme: {
      primary: '#4f46e5',
      accent: '#22d3ee',
      background: '#eef2ff',
      text: '#1f2937',
    },
  }
}
