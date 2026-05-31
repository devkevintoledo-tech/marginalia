import { useParams } from 'react-router-dom'
import { useProfile } from '../api/users'
import BookCard from '../components/BookCard'

const SHELF_STATUS_LABELS = {
  want_to_read: 'Want to Read',
  reading: 'Currently Reading',
  read: 'Read',
}

const SHELF_STATUS_ORDER = ['reading', 'want_to_read', 'read']

function ShelfSection({ status, books }) {
  if (!books || books.length === 0) return null
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-serif text-2xl text-zinc-100 border-b border-zinc-800 pb-3">
        {SHELF_STATUS_LABELS[status]}
        <span className="text-zinc-500 text-lg font-sans ml-2">{books.length}</span>
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {books.map((book) => (
          <BookCard key={book.id} book={book} />
        ))}
      </div>
    </section>
  )
}

function Profile() {
  const { username } = useParams()
  const { data: profile, isLoading, isError } = useProfile(username)

  if (isLoading) {
    return (
      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="animate-pulse flex flex-col gap-6">
          <div className="h-10 bg-zinc-800 w-48" />
          <div className="h-4 bg-zinc-800 w-32" />
        </div>
      </main>
    )
  }

  if (isError || !profile) {
    return (
      <main className="max-w-5xl mx-auto px-6 py-10">
        <p className="text-red-400">User not found.</p>
      </main>
    )
  }

  // Expect profile.shelves as { want_to_read: [], reading: [], read: [] }
  // or profile.books as flat list with shelf_status field
  const shelves = profile.shelves || {}
  if (!profile.shelves && profile.books) {
    for (const book of profile.books) {
      const s = book.shelf_status
      if (s) {
        shelves[s] = shelves[s] || []
        shelves[s].push(book)
      }
    }
  }

  const totalBooks = Object.values(shelves).reduce((acc, arr) => acc + (arr?.length || 0), 0)

  return (
    <main className="max-w-5xl mx-auto px-6 py-10 flex flex-col gap-10">
      {/* Header */}
      <div className="border-b border-zinc-800 pb-6 flex flex-col gap-2">
        <h1 className="font-serif text-4xl text-zinc-100">{profile.username}</h1>
        {profile.bio && <p className="text-zinc-400 max-w-xl">{profile.bio}</p>}
        <p className="text-zinc-500 text-sm">{totalBooks} {totalBooks === 1 ? 'book' : 'books'} on shelf</p>
      </div>

      {/* Shelves */}
      {SHELF_STATUS_ORDER.map((status) => (
        <ShelfSection key={status} status={status} books={shelves[status]} />
      ))}

      {totalBooks === 0 && (
        <p className="text-zinc-500">No books on shelf yet.</p>
      )}
    </main>
  )
}

export default Profile
