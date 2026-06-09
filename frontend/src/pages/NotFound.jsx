import { Link } from 'react-router-dom'

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-6">
      <span className="text-7xl font-serif text-amber-700">404</span>
      <h1 className="text-2xl font-semibold text-zinc-100">Page not found</h1>
      <p className="text-zinc-500 text-sm max-w-xs">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        to="/"
        className="mt-2 text-sm bg-amber-700 text-zinc-100 px-4 py-2 font-medium hover:bg-amber-600 transition-colors"
      >
        Go home
      </Link>
    </div>
  )
}

export default NotFound
