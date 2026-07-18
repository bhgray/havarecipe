import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { MantineProvider } from '@mantine/core'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@mantine/core/styles.css'
import './index.css'
import App from './App.tsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Returning to a route serves the cached result instead of refetching, which is the
      // whole point here - route changes unmount components, so the cache is what preserves
      // the view.
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      // The API returns 400/422/502 for bad URLs and pages without Recipe JSON-LD; retrying
      // those just delays the error the user needs to see.
      retry: false,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider defaultColorScheme="auto">
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </MantineProvider>
  </StrictMode>,
)
