import { Link } from 'react-router-dom'

function BookCard({ book }) {
  const { id, title, author, cover_url } = book

  return (
    <Link
      to={`/books/${id}`}
      className="group flex flex-col border border-transparent hover:border-amber-700/50 transition-all duration-200"
    >
      <div className="aspect-[2/3] bg-zinc-900 overflow-hidden">
        {cover_url ? (
          <img
            src={cover_url}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-zinc-900 border border-zinc-800">
            <span className="font-serif text-zinc-700 text-xs px-4 text-center italic">{title}</span>
          </div>
        )}
      </div>
      <div className="pt-2.5 pb-1 flex flex-col gap-1">
        <p className="font-serif text-zinc-200 text-sm leading-snug line-clamp-2 group-hover:text-amber-500 transition-colors">
          {title}
        </p>
        <p className="text-zinc-600 text-xs uppercase tracking-widest">{author}</p>
      </div>
    </Link>
  )
}

export default BookCard
