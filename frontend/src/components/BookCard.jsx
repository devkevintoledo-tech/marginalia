import { Link } from 'react-router-dom'

function BookCard({ book }) {
  const { id, title, author, cover_url } = book

  return (
    <Link
      to={`/books/${id}`}
      className="group bg-zinc-900 border border-zinc-800 hover:border-amber-700 transition-colors flex flex-col"
    >
      <div className="aspect-[2/3] bg-zinc-800 overflow-hidden">
        {cover_url ? (
          <img
            src={cover_url}
            alt={title}
            className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs px-2 text-center">
            No Cover
          </div>
        )}
      </div>
      <div className="p-3 flex flex-col gap-1">
        <p className="font-serif text-zinc-100 text-sm leading-snug line-clamp-2 group-hover:text-amber-500 transition-colors">
          {title}
        </p>
        <p className="text-zinc-500 text-xs">{author}</p>
      </div>
    </Link>
  )
}

export default BookCard
