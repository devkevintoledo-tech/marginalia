import { Link } from 'react-router-dom'

function GenreCard({ genre }) {
  const { slug, name, description } = genre

  return (
    <Link
      to={`/genres/${slug}`}
      className="group bg-zinc-900 border border-zinc-800 hover:border-amber-700 transition-colors p-4 flex flex-col gap-2"
    >
      <h3 className="font-serif text-zinc-100 text-lg group-hover:text-amber-500 transition-colors">
        {name}
      </h3>
      {description && (
        <p className="text-zinc-500 text-sm leading-snug line-clamp-2">{description}</p>
      )}
    </Link>
  )
}

export default GenreCard
