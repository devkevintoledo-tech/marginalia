import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useBook, useBookThreads } from '../api/books'
import { useCreateThread } from '../api/threads'
import ShelfButton from '../components/ShelfButton'
import ThreadCard from '../components/ThreadCard'
import useAuthStore from '../store/auth'

function CreateThreadModal({ bookId, onClose }) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const mutation = useCreateThread()
  const navigate = useNavigate()

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!title.trim()) return
    mutation.mutate(
      { book_id: bookId, title: title.trim(), content: body.trim() },
      {
        onSuccess: (data) => {
          navigate(`/books/${bookId}/threads/${data.id}`)
        },
      }
    )
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-700 w-full max-w-lg flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl text-zinc-100">Start a Thread</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-lg">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Thread title"
            required
            className="bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-500 px-3 py-2 text-sm focus:outline-none focus:border-amber-700"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Opening post (optional)"
            rows={4}
            className="bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-500 px-3 py-2 text-sm focus:outline-none focus:border-amber-700 resize-none"
          />
          {mutation.isError && (
            <p className="text-red-400 text-xs">{mutation.error?.response?.data?.message || 'Failed to create thread.'}</p>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending || !title.trim()}
              className="bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-zinc-100 px-4 py-2 text-sm font-medium transition-colors"
            >
              {mutation.isPending ? 'Creating...' : 'Create Thread'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Book() {
  const { id } = useParams()
  const [showModal, setShowModal] = useState(false)
  const user = useAuthStore((s) => s.user)

  const { data: book, isLoading: bookLoading, isError: bookError } = useBook(id)
  const { data: threads, isLoading: threadsLoading } = useBookThreads(id)

  if (bookLoading) {
    return (
      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="animate-pulse flex flex-col gap-6">
          <div className="flex gap-8">
            <div className="w-40 aspect-[2/3] bg-zinc-800 shrink-0" />
            <div className="flex flex-col gap-3 flex-1">
              <div className="h-8 bg-zinc-800 w-2/3" />
              <div className="h-4 bg-zinc-800 w-1/3" />
              <div className="h-20 bg-zinc-800 w-full mt-4" />
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (bookError || !book) {
    return (
      <main className="max-w-5xl mx-auto px-6 py-10">
        <p className="text-red-400">Failed to load book.</p>
      </main>
    )
  }

  return (
    <main className="max-w-5xl mx-auto px-6 py-10 flex flex-col gap-10">
      {/* Book info */}
      <section className="flex flex-col sm:flex-row gap-8">
        <div className="shrink-0 w-36 sm:w-44">
          {book.cover_url ? (
            <img src={book.cover_url} alt={book.title} className="w-full border border-zinc-800" />
          ) : (
            <div className="w-full aspect-[2/3] bg-zinc-800 border border-zinc-800 flex items-center justify-center text-zinc-600 text-xs">
              No Cover
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4 flex-1 min-w-0">
          <div>
            <h1 className="font-serif text-4xl text-zinc-100 leading-tight">{book.title}</h1>
            <p className="text-zinc-400 text-lg mt-1">{book.author}</p>
            {book.year && <p className="text-zinc-600 text-sm mt-0.5">{book.year}</p>}
          </div>

          {book.description && (
            <p className="text-zinc-300 text-sm leading-relaxed max-w-2xl">{book.description}</p>
          )}

          <ShelfButton bookId={id} currentStatus={book.shelf_status} />
        </div>
      </section>

      {/* Threads */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <h2 className="font-serif text-2xl text-zinc-100">Discussions</h2>
          {user && (
            <button
              onClick={() => setShowModal(true)}
              className="bg-amber-700 hover:bg-amber-600 text-zinc-100 px-4 py-2 text-sm font-medium transition-colors"
            >
              Start a Thread
            </button>
          )}
        </div>

        {threadsLoading && (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-zinc-900 border border-zinc-800 animate-pulse" />
            ))}
          </div>
        )}

        {!threadsLoading && threads && threads.length === 0 && (
          <p className="text-zinc-500 text-sm py-4">No discussions yet. {user ? 'Start the first one.' : <a href="/login" className="text-amber-500 hover:underline">Log in</a>}</p>
        )}

        {threads && threads.length > 0 && (
          <div className="flex flex-col gap-2">
            {threads.map((thread) => (
              <ThreadCard key={thread.id} thread={{ ...thread, book_id: id }} />
            ))}
          </div>
        )}
      </section>

      {showModal && (
        <CreateThreadModal bookId={id} onClose={() => setShowModal(false)} />
      )}
    </main>
  )
}

export default Book
