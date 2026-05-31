import { Link } from 'react-router-dom'

function GenreCard({ genre }) {
  const { slug, name, description } = genre

  return (
    <Link
      to={`/genres/${slug}`}
      className="group bg-zinc-950 hover:bg-zinc-900 transition-colors p-5 flex flex-col gap-2"
    >
      <div className="flex items-center gap-2">
        <span className="w-0.5 h-4 bg-amber-700 group-hover:bg-amber-500 transition-colors shrink-0" />
        <h3 className="font-serif text-zinc-200 group-hover:text-zinc-100 transition-colors leading-tight">
          {name}
        </h3>
      </div>
      {description && (
        <p className="text-zinc-600 text-xs leading-relaxed line-clamp-2 pl-2.5">
          {description}
        </p>
      )}
    </Link>
  )
}

export default GenreCard
