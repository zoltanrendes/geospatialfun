import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

const root = document.getElementById('root')

if (!root) {
  throw new Error('The application root element is missing.')
}

const queryClient = new QueryClient()

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <main>
        <h1>Geospatial Fun</h1>
      </main>
    </QueryClientProvider>
  </StrictMode>,
)
