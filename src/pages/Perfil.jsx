import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useUser } from '../lib/user'
import { reportError } from '../lib/notify'
import { useFeedback } from '../components/Feedback'
import WeekGrid from '../components/WeekGrid'
import { Card, Empty, Loading, Modal, PageHeader, Segmented } from '../components/ui'
import { IconCheck, IconCopy, IconEye, IconX } from '../components/icons'

const PRIVACY = [
  { value: 'private', label: 'Privada', hint: 'Solo tú ves tu rutina.' },
  { value: 'friends', label: 'Amigos', hint: 'Tus amigos pueden ver tu semana.' },
  { value: 'public', label: 'Pública', hint: 'Cualquier usuario con tu código puede verla.' },
]

export default function Perfil() {
  const { user, profile, setProfile } = useUser()
  const { confirm, toast } = useFeedback()
  const [name, setName] = useState('')
  const [copied, setCopied] = useState(false)
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'dark')

  useEffect(() => setName(profile?.username ?? ''), [profile?.username])

  if (!profile) return <Loading />

  async function updateProfile(patch) {
    const { data, error } = await supabase.from('profiles').update(patch).eq('id', user.id).select().single()
    if (error) return reportError(error)
    setProfile(data)
    toast('Guardado')
  }

  function changeTheme(t) {
    setTheme(t)
    document.documentElement.dataset.theme = t
    try {
      localStorage.setItem('stoa-theme', t)
    } catch {
      /* el navegador no permite guardar: solo dura esta sesión */
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(`#${profile.friend_code}`)
      setCopied(true)
      toast('Código copiado')
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* sin portapapeles */
    }
  }

  async function deleteAccount() {
    const ok = await confirm({
      title: '¿Borrar tu cuenta?',
      message: 'Se borrarán tu cuenta y todos tus datos. No se puede deshacer.',
      confirmLabel: 'Borrar cuenta',
      danger: true,
    })
    if (!ok) return
    const { error } = await supabase.rpc('delete_my_account')
    if (error) return reportError(error)
    await supabase.auth.signOut()
  }

  return (
    <>
      <PageHeader eyebrow="Perfil" title={profile.username} />

      <div className="grid">
        <Card title="Cuenta" action={<span className="muted small">{user.email}</span>}>
          <form
            className="inline-form"
            onSubmit={(e) => {
              e.preventDefault()
              if (name.trim()) updateProfile({ username: name.trim() })
            }}
          >
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={24} aria-label="Nombre de usuario" />
            <button className="btn btn-outline" disabled={!name.trim() || name.trim() === profile.username}>Guardar</button>
          </form>
          <div className="code-row">
            <div>
              <span className="stat-label">Tu código de amigo</span>
              <span className="code">#{profile.friend_code}</span>
            </div>
            <button type="button" className="btn btn-ghost" onClick={copyCode}>
              {copied ? <IconCheck size={16} /> : <IconCopy size={16} />} {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
        </Card>

        <Card title="Privacidad de la rutina">
          <Segmented label="Privacidad" value={profile.privacy} onChange={(v) => updateProfile({ privacy: v })} options={PRIVACY} />
          <p className="muted small top-gap">{PRIVACY.find((p) => p.value === profile.privacy)?.hint}</p>
        </Card>
      </div>

      <Friends />

      <div className="grid">
        <Card title="Apariencia">
          <Segmented label="Tema" value={theme} onChange={changeTheme} options={[{ value: 'dark', label: 'Oscuro' }, { value: 'light', label: 'Claro' }]} />
        </Card>
        <Card title="Sesión">
          <div className="row-actions">
            <button type="button" className="btn btn-outline" onClick={() => supabase.auth.signOut()}>Cerrar sesión</button>
            <button type="button" className="btn btn-ghost danger" onClick={deleteAccount}>Borrar cuenta</button>
          </div>
        </Card>
      </div>
    </>
  )
}

function Friends() {
  const { user } = useUser()
  const { confirm, toast } = useFeedback()
  const [rows, setRows] = useState(null)
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState(null)
  const [viewing, setViewing] = useState(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('friendships')
      .select(
        'id, status, requester, addressee, req:profiles!friendships_requester_fkey(id, username, friend_code), add:profiles!friendships_addressee_fkey(id, username, friend_code)',
      )
    if (error) reportError(error)
    setRows(data || [])
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function send(e) {
    e.preventDefault()
    setMsg(null)
    const clean = code.replace('#', '').trim().toUpperCase()
    const { data: other } = await supabase.from('profiles').select('id, username').eq('friend_code', clean).maybeSingle()
    if (!other) return setMsg({ type: 'error', text: 'No hay nadie con ese código.' })
    if (other.id === user.id) return setMsg({ type: 'error', text: 'Ese es tu propio código.' })
    const { error } = await supabase.from('friendships').insert({ addressee: other.id })
    if (error) return setMsg({ type: 'error', text: 'Ya tienes una solicitud o amistad con esa persona.' })
    setMsg({ type: 'ok', text: `Solicitud enviada a ${other.username}.` })
    setCode('')
    load()
  }

  const accept = async (id) => {
    const { error } = await supabase.from('friendships').update({ status: 'accepted' }).eq('id', id)
    if (error) reportError(error)
    else toast('Ahora sois amigos')
    load()
  }
  const removeF = async (id) => {
    const { error } = await supabase.from('friendships').delete().eq('id', id)
    if (error) reportError(error)
    load()
  }
  const askRemove = async (f) => {
    const ok = await confirm({
      title: `¿Eliminar a ${other(f)?.username}?`,
      message: 'Dejaréis de ver vuestras rutinas compartidas.',
      confirmLabel: 'Eliminar',
      danger: true,
    })
    if (ok) removeF(f.id)
  }

  if (!rows) return <Card title="Amigos"><Loading /></Card>

  const other = (f) => (f.requester === user.id ? f.add : f.req)
  const friends = rows.filter((f) => f.status === 'accepted')
  const incoming = rows.filter((f) => f.status === 'pending' && f.addressee === user.id)
  const outgoing = rows.filter((f) => f.status === 'pending' && f.requester === user.id)

  return (
    <Card title="Amigos">
      <form className="inline-form" onSubmit={send}>
        <input className="input" placeholder="#CÓDIGO" value={code} onChange={(e) => setCode(e.target.value)} maxLength={7} aria-label="Código de amigo" />
        <button className="btn btn-primary" disabled={code.replace('#', '').trim().length < 6}>Agregar</button>
      </form>
      {msg && <p className={msg.type}>{msg.text}</p>}

      {incoming.length > 0 && (
        <>
          <h3 className="sub-title">Solicitudes</h3>
          <ul className="list">
            {incoming.map((f) => (
              <li key={f.id} className="friend-row">
                <span>{other(f)?.username}</span>
                <span className="spacer" />
                <button type="button" className="btn btn-primary sm" onClick={() => accept(f.id)}><IconCheck size={15} /> Aceptar</button>
                <button type="button" className="icon-btn sm" onClick={() => removeF(f.id)} aria-label="Rechazar"><IconX size={15} /></button>
              </li>
            ))}
          </ul>
        </>
      )}

      <h3 className="sub-title">Tus amigos</h3>
      {friends.length === 0 ? (
        <Empty>Comparte tu código para que te agreguen.</Empty>
      ) : (
        <ul className="list">
          {friends.map((f) => (
            <li key={f.id} className="friend-row">
              <span>{other(f)?.username}</span>
              <span className="muted small">#{other(f)?.friend_code}</span>
              <span className="spacer" />
              <button type="button" className="btn btn-ghost sm" onClick={() => setViewing(other(f))}><IconEye size={15} /> Semana</button>
              <button type="button" className="icon-btn sm" onClick={() => askRemove(f)} aria-label="Eliminar amigo"><IconX size={15} /></button>
            </li>
          ))}
        </ul>
      )}

      {outgoing.length > 0 && (
        <>
          <h3 className="sub-title">Enviadas</h3>
          <ul className="list">
            {outgoing.map((f) => (
              <li key={f.id} className="friend-row">
                <span>{other(f)?.username}</span>
                <span className="muted small">Pendiente</span>
                <span className="spacer" />
                <button type="button" className="icon-btn sm" onClick={() => removeF(f.id)} aria-label="Cancelar solicitud"><IconX size={15} /></button>
              </li>
            ))}
          </ul>
        </>
      )}

      {viewing && <FriendWeek friend={viewing} onClose={() => setViewing(null)} />}
    </Card>
  )
}

// La seguridad (RLS) decide si puedes ver su rutina: si es privada, llega vacía.
function FriendWeek({ friend, onClose }) {
  const [data, setData] = useState(null)

  useEffect(() => {
    Promise.all([
      supabase.from('blocks').select('*').eq('user_id', friend.id),
      supabase.from('routine_items').select('*').eq('user_id', friend.id),
    ]).then(([b, i]) => setData({ blocks: b.data || [], items: i.data || [] }))
  }, [friend.id])

  return (
    <Modal title={`Semana de ${friend.username}`} onClose={onClose}>
      {!data ? (
        <Loading />
      ) : data.items.length === 0 ? (
        <Empty>No comparte su rutina o aún no la ha creado.</Empty>
      ) : (
        <div className="modal-wide">
          <WeekGrid items={data.items} blockName={(id) => data.blocks.find((b) => b.id === id)?.name ?? '—'} />
        </div>
      )}
    </Modal>
  )
}
