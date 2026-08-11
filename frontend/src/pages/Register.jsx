import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useRegister } from '../api/auth'
import { errorMessage } from '../api/errors'

function Register() {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [formError, setFormError] = useState('')
  const navigate = useNavigate()
  const { mutate: register, isPending, error } = useRegister()

  const handleSubmit = (e) => {
    e.preventDefault()
    if (password.length < 8) {
      setFormError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setFormError('Passwords do not match.')
      return
    }
    setFormError('')
    register({ email, username, password }, { onSuccess: () => navigate('/') })
  }

  return (
    <div className="min-h-[calc(100vh-49px)] bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <Link to="/" className="font-serif text-2xl text-zinc-100 hover:text-amber-500 transition-colors">
            <span className="italic">M</span>arginalia
          </Link>
          <div className="w-8 h-0.5 bg-amber-600 mx-auto mt-4 mb-6" />
          <h1 className="font-serif text-3xl text-zinc-100">Create account</h1>
          <p className="text-zinc-600 text-sm mt-1">Join the conversation.</p>
        </div>

        {(formError || error) && (
          <div className="border border-red-800/60 bg-red-950/40 text-red-400 px-4 py-3 text-sm mb-6">
            {formError || errorMessage(error, 'Registration failed. Please try again.')}
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
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
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
              minLength={8}
              className="w-full bg-zinc-900 border border-zinc-800 text-zinc-100 px-3 py-3 text-sm focus:outline-none focus:border-amber-700 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 uppercase tracking-widest mb-1.5">
              Confirm password
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              className="w-full bg-zinc-900 border border-zinc-800 text-zinc-100 px-3 py-3 text-sm focus:outline-none focus:border-amber-700 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-amber-700 text-zinc-100 py-3 text-xs font-semibold uppercase tracking-widest hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {isPending ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="text-zinc-600 text-sm mt-6 text-center">
          Already have an account?{' '}
          <Link to="/login" className="text-amber-600 hover:text-amber-500 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Register
