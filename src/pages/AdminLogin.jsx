import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { UtensilsCrossed, Eye, EyeOff } from 'lucide-react'

export default function AdminLogin() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState('login')

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gold-500 flex items-center justify-center mb-4">
            <UtensilsCrossed size={28} className="text-neutral-900" />
          </div>
          <h1 className="text-2xl font-bold text-white">Carta Virtual</h1>
          <p className="text-neutral-400 text-sm mt-1">Panel de administración</p>
        </div>

        <div className="flex bg-neutral-900 border border-neutral-800 rounded-xl p-1 mb-4">
          <button
            onClick={() => setMode('login')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === 'login' ? 'bg-gold-500 text-neutral-900' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Ingresar
          </button>
          <button
            onClick={() => setMode('register')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === 'register' ? 'bg-gold-500 text-neutral-900' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Registrarse
          </button>
        </div>

        {mode === 'login'
          ? <LoginForm signIn={signIn} navigate={navigate} />
          : <RegisterForm />
        }
      </div>
    </div>
  )
}

function LoginForm({ signIn, navigate }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await signIn(email, password)
    if (error) {
      setError('Email o contraseña incorrectos')
      setLoading(false)
    } else {
      navigate('/admin/dashboard')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
      {error && (
        <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Email</label>
        <input
          type="email" value={email} onChange={e => setEmail(e.target.value)}
          required className="input" placeholder="admin@turestaurante.com"
          autoComplete="email"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Contraseña</label>
        <div className="relative">
          <input
            type={showPass ? 'text' : 'password'} value={password}
            onChange={e => setPassword(e.target.value)}
            required className="input pr-10" placeholder="••••••••"
            autoComplete="current-password"
          />
          <button type="button" onClick={() => setShowPass(!showPass)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300">
            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>
      <button type="submit" disabled={loading}
        className="w-full py-3 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-neutral-900 font-semibold rounded-xl transition-colors mt-2">
        {loading ? 'Ingresando...' : 'Ingresar'}
      </button>
    </form>
  )
}

function RegisterForm() {
  const [form, setForm] = useState({ fullName: '', email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    setLoading(true)
    setError(null)

    const { error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.fullName } },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    // El restaurante se configura en el siguiente paso (onboarding del dashboard)
    setDone(true)
    setLoading(false)
  }

  if (done) {
    return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
          <span className="text-green-400 text-xl">✓</span>
        </div>
        <p className="text-white font-medium">¡Cuenta creada!</p>
        <p className="text-sm text-neutral-400">
          Vas a ser redirigido al panel para configurar tu restaurante.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
      {error && (
        <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Nombre completo</label>
        <input value={form.fullName} onChange={set('fullName')} required
          className="input" placeholder="Tu nombre" />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Email</label>
        <input type="email" value={form.email} onChange={set('email')} required
          className="input" placeholder="admin@turestaurante.com" autoComplete="email" />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Contraseña</label>
        <div className="relative">
          <input type={showPass ? 'text' : 'password'} value={form.password} onChange={set('password')}
            required className="input pr-10" placeholder="Mínimo 6 caracteres"
            autoComplete="new-password" />
          <button type="button" onClick={() => setShowPass(!showPass)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300">
            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>
      <button type="submit" disabled={loading}
        className="w-full py-3 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-neutral-900 font-semibold rounded-xl transition-colors">
        {loading ? 'Creando cuenta...' : 'Crear cuenta'}
      </button>
      <p className="text-xs text-neutral-500 text-center">
        En el siguiente paso configurás el nombre de tu restaurante
      </p>
    </form>
  )
}
