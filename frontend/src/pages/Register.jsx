import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useRegister } from '../api/auth'

function Register() {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()
  const { mutate: register, isPending, error } = useRegister()

  const handleSubmit = (e) => {
    e.preventDefault()
    register({ email, username, password }, { onSuccess: () => navigate('/') })
  }

  return (
    <div className="min-h-[calc(100vh-65px)] bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="font-serif text-4xl text-zinc-100 mb-2">Create account</h1>
        <p className="text-zinc-500 text-sm mb-8">Join the conversation on Marginalia.</p>

        {error && (
          <div className="bg-red-950 border border-red-800 text-red-300 px-4 py-3 text-sm mb-6">
            {error.response?.data?.message ?? 'Registration failed. Please try again.'}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 uppercase tracking-widest mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 px-3 py-2.5 text-sm focus:outline-none focus:border-amber-700"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 uppercase tracking-widest mb-1.5">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 px-3 py-2.5 text-sm focus:outline-none focus:border-amber-700"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 uppercase tracking-widest mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 px-3 py-2.5 text-sm focus:outline-none focus:border-amber-700"
            />
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-amber-700 text-zinc-100 py-2.5 text-sm font-semibold uppercase tracking-widest hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="text-zinc-500 text-sm mt-6 text-center">
          Already have an account?{' '}
          <Link to="/login" className="text-amber-600 hover:text-amber-500">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Register
