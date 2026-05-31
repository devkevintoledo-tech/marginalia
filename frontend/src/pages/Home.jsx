import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import client from '../api/client'
import GenreCard from '../components/GenreCard'

const FALLBACK_GENRES = [
  { slug: 'literary-fiction', name: 'Literary Fiction', description: 'Character-driven stories with literary merit.' },
  { slug: 'science-fiction', name: 'Science Fiction', description: 'Speculative worlds, technology, and futures.' },
  { slug: 'fantasy', name: 'Fantasy', description: 'Magic, myth, and invented worlds.' },
  { slug: 'history', name: 'History', description: 'Non-fiction explorations of the past.' },
  { slug: 'philosophy', name: 'Philosophy', description: 'Ideas, ethics, and ways of knowing.' },
  { slug: 'biography', name: 'Biography', description: 'Lives examined and recorded.' },
  { slug: 'mystery', name: 'Mystery', description: 'Puzzles, crimes, and revelations.' },
  { slug: 'poetry', name: 'Poetry', description: 'Language compressed into meaning.' },
]

function Home() {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  const { data: genres } = useQuery({
    queryKey: ['genres'],
    queryFn: () => client.get('/genres').then((r) => r.data),
    placeholderData: FALLBACK_GENRES,
  })

  const handleSearch = (e) => {
    e.preventDefault()
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`)
    }
  }

  return (
    <main className="max-w-5xl mx-auto px-6 py-16 flex flex-col gap-16">
      {/* Hero */}
      <section className="flex flex-col items-center text-center gap-8">
        <h1 className="font-serif text-5xl md:text-6xl text-zinc-100 tracking-tight leading-tight">
          Where serious readers talk.
        </h1>
        <p className="text-zinc-400 text-lg max-w-xl">
          Annotate, discuss, and discover books with people who actually read them.
        </p>
        <form onSubmit={handleSearch} className="flex w-full max-w-lg">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for a book or author..."
            className="flex-1 bg-zinc-900 border border-zinc-700 text-zinc-100 placeholder-zinc-500 px-4 py-3 text-base focus:outline-none focus:border-amber-700"
          />
          <button
            type="submit"
            className="bg-amber-700 hover:bg-amber-600 text-zinc-100 px-6 py-3 text-base font-medium transition-colors shrink-0"
          >
            Search
          </button>
        </form>
      </section>

      {/* Genres */}
      <section className="flex flex-col gap-6">
        <h2 className="font-serif text-2xl text-zinc-100 border-b border-zinc-800 pb-3">
          Browse by Genre
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {(genres || FALLBACK_GENRES).map((genre) => (
            <GenreCard key={genre.slug} genre={genre} />
          ))}
        </div>
      </section>
    </main>
  )
}

export default Home
