import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLogin } from '../api/auth'
import { errorMessage } from '../api/errors'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [formError, setFormError] = useState('')
  const navigate = useNavigate()
  const { mutate: login, isPending, error } = useLogin()

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!EMAIL_RE.test(email)) {
      setFormError('Please enter a valid email address.')
      return
    }
    if (!password) {
      setFormError('Please enter your password.')
      return
    }
    setFormError('')
    login({ email, password }, { onSuccess: () => navigate('/') })
  }

  return (
    <div className="min-h-[calc(100vh-49px)] bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <Link to="/" className="font-serif text-2xl text-zinc-100 hover:text-amber-500 transition-colors">
            <span className="italic">M</span>arginalia
          </Link>
          <div className="w-8 h-0.5 bg-amber-600 mx-auto mt-4 mb-6" />
          <h1 className="font-serif text-3xl text-zinc-100">Sign in</h1>
          <p className="text-zinc-600 text-sm mt-1">Welcome back.</p>
        </div>

        {(formError || error) && (
          <div className="border border-red-800/60 bg-red-950/40 text-red-400 px-4 py-3 text-sm mb-6">
            {formError || errorMessage(error, 'Login failed. Please try again.')}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-500 uppercase tracking-widest mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-zinc-900 border border-zinc-800 text-zinc-100 px-3 py-3 text-sm focus:outline-none focus:border-amber-700 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 uppercase tracking-widest mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-zinc-900 border border-zinc-800 text-zinc-100 px-3 py-3 text-sm focus:outline-none focus:border-amber-700 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-amber-700 text-zinc-100 py-3 text-xs font-semibold uppercase tracking-widest hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {isPending ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="text-sm mt-4 text-center">
          <Link
            to="/forgot-password"
            className="text-zinc-500 hover:text-amber-500 transition-colors"
          >
            Forgot password?
          </Link>
        </p>

        <div className="mt-3">
          <a
            href="/api/auth/google"
            className="flex items-center justify-center gap-2 w-full border border-zinc-800 text-zinc-500 py-3 text-sm hover:border-zinc-700 hover:text-zinc-300 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </a>
        </div>

        <p className="text-zinc-600 text-sm mt-6 text-center">
          No account?{' '}
          <Link to="/register" className="text-amber-600 hover:text-amber-500 transition-colors">
            Register
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Login
