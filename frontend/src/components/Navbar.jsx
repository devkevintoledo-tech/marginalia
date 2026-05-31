import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useAuthStore from '../store/auth'

function Navbar() {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  const handleSearch = (e) => {
    e.preventDefault()
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`)
      setQuery('')
    }
  }

  return (
    <nav className="bg-zinc-900 border-b border-zinc-800 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-6">
        <Link to="/" className="font-serif text-2xl text-zinc-100 tracking-tight shrink-0">
          Marginalia
        </Link>

        <div className="flex items-center gap-4 ml-auto">
          <form onSubmit={handleSearch} className="flex">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search books, threads..."
              className="bg-zinc-800 text-zinc-100 placeholder-zinc-500 border border-zinc-700 px-3 py-1.5 text-sm w-56 focus:outline-none focus:border-amber-700"
            />
            <button
              type="submit"
              className="bg-amber-700 text-zinc-100 px-3 py-1.5 text-sm font-medium hover:bg-amber-600 transition-colors"
            >
              Search
            </button>
          </form>

          {user ? (
            <>
              <Link
                to={`/profile/${user.username}`}
                className="text-sm text-zinc-300 hover:text-zinc-100 transition-colors"
              >
                {user.username}
              </Link>
              <button
                onClick={logout}
                className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm text-zinc-300 hover:text-zinc-100 transition-colors"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="text-sm bg-amber-700 text-zinc-100 px-3 py-1.5 font-medium hover:bg-amber-600 transition-colors"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Navbar
