import { useState, useRef, useEffect, FormEvent } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Button } from '../ui/Button'

const inputClass = `
  w-full h-9 px-3 rounded-[6px] text-[14px]
  bg-[var(--surface)] text-[var(--text)]
  border border-[var(--border)]
  focus:outline-none focus:ring-2 focus:ring-[#5B57E0]
`

export function Login() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)

  useEffect(() => { emailRef.current?.focus() }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (submitting) return
    setError(null)
    setSubmitting(true)
    try {
      await login(email.trim(), password)
    } catch {
      // The API throws with the status; keep the message generic (don't reveal
      // whether it was the email or the password).
      setError('Invalid email or password.')
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--canvas)] px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-[340px] bg-[var(--surface)] border border-[var(--border)] rounded-[10px] p-6"
      >
        <h1 className="text-[17px] font-semibold text-[var(--text)]">Sign in</h1>
        <p className="text-[13px] text-[var(--text-muted)] mt-1 mb-5">
          Internal tool — sign in to continue.
        </p>

        <label className="block text-[12px] font-medium text-[var(--text-muted)] mb-1">Email</label>
        <input
          ref={emailRef}
          type="email"
          autoComplete="username"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className={inputClass}
          required
        />

        <label className="block text-[12px] font-medium text-[var(--text-muted)] mb-1 mt-4">Password</label>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className={inputClass}
          required
        />

        {error && (
          <p className="text-[12px] text-[#C53434] mt-3" role="alert">{error}</p>
        )}

        <Button type="submit" variant="primary" size="md" className="w-full justify-center mt-5" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </div>
  )
}
