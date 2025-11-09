import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { TriviaSessionProvider } from '../../modules/trivia/providers/TriviaSessionProvider'
import { ThemeModeProvider } from './ThemeModeProvider'

type AppProvidersProps = {
  children: ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(() => new QueryClient())
  
  const basename = import.meta.env.PROD ? '/trivia' : '/'

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeModeProvider>
        <BrowserRouter basename={basename}>
          <TriviaSessionProvider>{children}</TriviaSessionProvider>
        </BrowserRouter>
      </ThemeModeProvider>
    </QueryClientProvider>
  )
}
