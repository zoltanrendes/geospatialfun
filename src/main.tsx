import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { TransitExplorer } from './components/TransitExplorer'

const root = document.getElementById('root')

if (!root) {
  throw new Error('The application root element is missing.')
}

const queryClient = new QueryClient()

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <TransitExplorer apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? ''} />
    </QueryClientProvider>
  </StrictMode>,
)
