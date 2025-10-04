import questionBankJson from './questionBank.json'

export type QuestionEntry = {
  points: number
  question: string
  answer: string
}

export type QuestionBank = Record<string, QuestionEntry[]>

export const questionBank = questionBankJson as QuestionBank

export function getFilms(): string[] {
  return Object.keys(questionBank)
}

export function getQuestionsForFilm(film: string): QuestionEntry[] {
  return questionBank[film] ?? []
}
