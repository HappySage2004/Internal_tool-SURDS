import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { DataProvider } from './context/DataContext.tsx'
import { AuthProvider, useAuth } from './context/AuthContext.tsx'
import { Login } from './components/screens/Login.tsx'

// Gate: resolve the session, then show either the login screen or the app.
// DataProvider only mounts once authenticated, so its initial fetch always
// carries the bearer token and loads the signed-in user's data.
function Gate() {
  const { currentUser, loading } = useAuth()
  if (loading) return null            // brief: resolving an existing token
  if (!currentUser) return <Login />
  return (
    <DataProvider>
      <App />
    </DataProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <Gate />
    </AuthProvider>
  </StrictMode>,
)
