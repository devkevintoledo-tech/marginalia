import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useResetPassword } from '../api/auth'
import { errorMessage } from '../api/errors'

function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [formError, setFormError] = useState('')
  const navigate = useNavigate()
  const { mutate: resetPassword, isPending, isSuccess, error } = useResetPassword()

  // Redirect to sign in shortly after a successful reset. The timer is cleared
  // on unmount so navigate() never fires on an unmounted component.
  useEffect(() => {
    if (!isSuccess) return
    const id = setTimeout(() => navigate('/login'), 1500)
    return () => clearTimeout(id)
  }, [isSuccess, navigate])

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
    resetPassword({ token, new_password: password })
  }

  return (
    <div className="min-h-[calc(100vh-49px)] bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <Link to="/" className="font-serif text-2xl text-zinc-100 hover:text-amber-500 transition-colors">
            <span className="italic">M</span>arginalia
          </Link>
          <div className="w-8 h-0.5 bg-amber-600 mx-auto mt-4 mb-6" />
          <h1 className="font-serif text-3xl text-zinc-100">Choose a new password</h1>
          <p className="text-zinc-600 text-sm mt-1">Enter and confirm your new password.</p>
        </div>

        {isSuccess ? (
          <div className="border border-zinc-800 bg-zinc-900 text-zinc-300 px-4 py-3 text-sm">
            Your password has been reset. Redirecting to sign in...
          </div>
        ) : (
          <>
            {(formError || error || !token) && (
              <div className="border border-red-800/60 bg-red-950/40 text-red-400 px-4 py-3 text-sm mb-6">
                {formError ||
                  (!token
                    ? 'This reset link is invalid or has expired.'
                    : errorMessage(error, 'Could not reset password. Please try again.'))}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-widest mb-1.5">
                  New password
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
                {isPending ? 'Resetting...' : 'Reset password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

export default ResetPassword
