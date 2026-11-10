import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { UserContext } from '../lib/user'
import { FeedbackProvider } from './Feedback'
import { IconFood, IconGym, IconMoney, IconToday, IconUser, IconWeek } from './icons'
import Hoy from '../pages/Hoy'
import Semana from '../pages/Semana'
import Gym from '../pages/Gym'
import Nutricion from '../pages/Nutricion'
import Dinero from '../pages/Dinero'
import Perfil from '../pages/Perfil'

const TABS = [
  { id: 'hoy', label: 'Hoy', Icon: IconToday, Page: Hoy },
  { id: 'semana', label: 'Semana', Icon: IconWeek, Page: Semana },
  { id: 'gym', label: 'Gym', Icon: IconGym, Page: Gym },
  { id: 'nutricion', label: 'Nutrición', Icon: IconFood, Page: Nutricion },
  { id: 'dinero', label: 'Dinero', Icon: IconMoney, Page: Dinero },
  { id: 'perfil', label: 'Perfil', Icon: IconUser, Page: Perfil },
]

// La pestaña activa vive en la URL (#semana), así funciona el botón "atrás".
function useHashTab() {
  const read = () => window.location.hash.slice(1) || 'hoy'
  const [tab, setTab] = useState(read)
  useEffect(() => {
    const onChange = () => {
      setTab(read())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return tab
}

export default function Shell({ user }) {
  const tab = useHashTab()
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
      .then(({ data }) => setProfile(data))
  }, [user.id])

  const { Page } = TABS.find((t) => t.id === tab) ?? TABS[0]

  return (
    <UserContext.Provider value={{ user, profile, setProfile }}>
      <FeedbackProvider>
        <div className="app">
          <nav className="nav" aria-label="Secciones">
            <a className="brand" href="#hoy">Stoa</a>
            {TABS.map(({ id, label, Icon }) => (
              <a key={id} href={`#${id}`} className={tab === id ? 'active' : ''} aria-current={tab === id ? 'page' : undefined}>
                <Icon />
                <span>{label}</span>
              </a>
            ))}
          </nav>
          <main className="main">
            <Page key={tab} />
          </main>
        </div>
      </FeedbackProvider>
    </UserContext.Provider>
  )
}
