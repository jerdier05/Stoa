import { useEffect, useState } from 'react'
import { configured, supabase } from './lib/supabase'
import Auth, { NewPassword } from './components/Auth'
import Shell from './components/Shell'
import { Loading } from './components/ui'

export default function App() {
  // undefined = todavía comprobando, null = sin sesión, objeto = conectado
  const [session, setSession] = useState(undefined)
  const [recovering, setRecovering] = useState(false)

  useEffect(() => {
    if (!configured) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    // Escucha cambios: login, logout, enlace de "recuperar contraseña"…
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  if (!configured) return <Setup />
  if (session === undefined) return <div className="center-screen"><Loading /></div>
  if (recovering) return <NewPassword onDone={() => setRecovering(false)} />
  if (!session) return <Auth />
  return <Shell user={session.user} />
}

function Setup() {
  return (
    <div className="center-screen">
      <div className="auth-card">
        <p className="brand-lg">Stoa</p>
        <h1 className="auth-title">Falta conectar Supabase</h1>
        <p className="muted">
          Crea un archivo <code>.env</code> en la raíz del proyecto (copia <code>.env.example</code>) con tu
          <code> VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code>, y reinicia <code>npm run dev</code>.
          En Vercel se añaden en Settings → Environment Variables.
        </p>
      </div>
    </div>
  )
}
