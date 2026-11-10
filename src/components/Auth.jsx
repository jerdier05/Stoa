import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Field } from './ui'

// Traduce los errores más comunes de Supabase.
const translate = (msg = '') => {
  if (/invalid login/i.test(msg)) return 'Correo o contraseña incorrectos.'
  if (/already registered/i.test(msg)) return 'Ya existe una cuenta con ese correo.'
  if (/at least 6/i.test(msg)) return 'La contraseña debe tener al menos 6 caracteres.'
  if (/email not confirmed/i.test(msg)) return 'Confirma tu correo antes de entrar.'
  if (/rate limit/i.test(msg)) return 'Demasiados intentos. Espera un momento.'
  return msg
}

export default function Auth() {
  const [mode, setMode] = useState('login') // login | signup | reset
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setMsg(null)

    let result
    if (mode === 'login') {
      result = await supabase.auth.signInWithPassword({ email, password })
    } else if (mode === 'signup') {
      result = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username: username.trim() } }, // lo lee el trigger de la base de datos
      })
    } else {
      result = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
    }

    setBusy(false)
    if (result.error) return setMsg({ type: 'error', text: translate(result.error.message) })
    if (mode === 'signup' && !result.data.session)
      setMsg({ type: 'ok', text: 'Te hemos enviado un correo para confirmar la cuenta.' })
    if (mode === 'reset') setMsg({ type: 'ok', text: 'Revisa tu correo para cambiar la contraseña.' })
  }

  const switchTo = (m) => {
    setMode(m)
    setMsg(null)
  }

  const titles = { login: 'Inicia sesión', signup: 'Crea tu cuenta', reset: 'Recuperar contraseña' }

  return (
    <div className="center-screen">
      <form className="auth-card" onSubmit={submit}>
        <p className="brand-lg">Stoa</p>
        <h1 className="auth-title">{titles[mode]}</h1>
        <p className="muted auth-sub">Tu semana, tu gym, tu comida y tu dinero. En un solo sitio.</p>

        {mode === 'signup' && (
          <Field label="Nombre de usuario">
            <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} required maxLength={24} autoComplete="nickname" />
          </Field>
        )}
        <Field label="Correo">
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </Field>
        {mode !== 'reset' && (
          <Field label="Contraseña">
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </Field>
        )}

        {msg && <p className={msg.type === 'error' ? 'error' : 'ok'}>{msg.text}</p>}

        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Un momento…' : mode === 'login' ? 'Entrar' : mode === 'signup' ? 'Crear cuenta' : 'Enviar enlace'}
        </button>

        <div className="auth-links">
          {mode === 'login' ? (
            <>
              <button type="button" className="link" onClick={() => switchTo('signup')}>Crear una cuenta</button>
              <button type="button" className="link" onClick={() => switchTo('reset')}>¿Has olvidado la contraseña?</button>
            </>
          ) : (
            <button type="button" className="link" onClick={() => switchTo('login')}>Ya tengo cuenta</button>
          )}
        </div>
      </form>
    </div>
  )
}

export function NewPassword({ onDone }) {
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState(null)

  async function submit(e) {
    e.preventDefault()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) return setMsg(translate(error.message))
    onDone()
  }

  return (
    <div className="center-screen">
      <form className="auth-card" onSubmit={submit}>
        <p className="brand-lg">Stoa</p>
        <h1 className="auth-title">Nueva contraseña</h1>
        <Field label="Contraseña">
          <input className="input" type="password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        </Field>
        {msg && <p className="error">{msg}</p>}
        <button className="btn btn-primary btn-block">Guardar</button>
      </form>
    </div>
  )
}
