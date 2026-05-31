import { useSearchParams } from 'react-router-dom'
import { useSearchBooks } from '../api/books'
import BookCard from '../components/BookCard'

function Search() {
  const [searchParams] = useSearchParams()
  const q = searchParams.get('q') || ''
  const { data: books, isLoading, isError } = useSearchBooks(q)

  return (
    <main className="max-w-5xl mx-auto px-6 py-10 flex flex-col gap-8">
      <div className="border-b border-zinc-800 pb-4">
        <h1 className="font-serif text-3xl text-zinc-100">
          {q ? (
            <>Results for <span className="text-amber-500">"{q}"</span></>
          ) : (
            'Search'
          )}
        </h1>
        {books && (
          <p className="text-zinc-500 text-sm mt-1">{books.length} {books.length === 1 ? 'book' : 'books'} found</p>
        )}
      </div>

      {!q && (
        <p className="text-zinc-500">Enter a search term to find books.</p>
      )}

      {q.length <= 1 && q.length > 0 && (
        <p className="text-zinc-500">Type at least 2 characters to search.</p>
      )}

      {isLoading && q.length > 1 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 animate-pulse">
              <div className="aspect-[2/3] bg-zinc-800" />
              <div className="p-3 flex flex-col gap-2">
                <div className="h-3 bg-zinc-800 w-3/4" />
                <div className="h-3 bg-zinc-800 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {isError && (
        <p className="text-red-400 text-sm">Failed to load results. Please try again.</p>
      )}

      {books && books.length === 0 && (
        <p className="text-zinc-500">No books found for "{q}".</p>
      )}

      {books && books.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {books.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}
    </main>
  )
}

export default Search
