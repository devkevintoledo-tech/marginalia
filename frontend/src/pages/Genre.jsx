import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import client from '../api/client'
import { useCreateThread } from '../api/threads'
import BookCard from '../components/BookCard'
import ThreadCard from '../components/ThreadCard'
import useAuthStore from '../store/auth'

function Genre() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [showModal, setShowModal] = useState(false)
  const [threadTitle, setThreadTitle] = useState('')
  const [threadBody, setThreadBody] = useState('')
  const createThread = useCreateThread()

  const { data: genre, isLoading, isError } = useQuery({
    queryKey: ['genres', slug],
    queryFn: () => client.get(`/genres/${slug}`).then((r) => r.data),
    enabled: !!slug,
  })

  const { data: books } = useQuery({
    queryKey: ['genres', slug, 'books'],
    queryFn: () => client.get(`/genres/${slug}/books`).then((r) => r.data),
    enabled: !!slug,
  })

  const { data: threads } = useQuery({
    queryKey: ['genres', slug, 'threads'],
    queryFn: () => client.get(`/genres/${slug}/threads`).then((r) => r.data),
    enabled: !!slug,
  })

  const handleCreateThread = (e) => {
    e.preventDefault()
    if (!threadTitle.trim()) return
    createThread.mutate(
      { genre_slug: slug, title: threadTitle.trim(), content: threadBody.trim() },
      {
        onSuccess: (data) => {
          navigate(`/genres/${slug}/threads/${data.id}`)
        },
      }
    )
  }

  if (isLoading) {
    return (
      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="animate-pulse flex flex-col gap-6">
          <div className="h-10 bg-zinc-800 w-1/3" />
          <div className="h-4 bg-zinc-800 w-2/3" />
        </div>
      </main>
    )
  }

  if (isError || !genre) {
    return (
      <main className="max-w-5xl mx-auto px-6 py-10">
        <p className="text-red-400">Genre not found.</p>
      </main>
    )
  }

  return (
    <main className="max-w-5xl mx-auto px-6 py-10 flex flex-col gap-12">
      {/* Header */}
      <div className="border-b border-zinc-800 pb-6">
        <h1 className="font-serif text-5xl text-zinc-100">{genre.name}</h1>
        {genre.description && (
          <p className="text-zinc-400 mt-3 max-w-2xl">{genre.description}</p>
        )}
      </div>

      {/* Books */}
      {books && books.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="font-serif text-2xl text-zinc-100 border-b border-zinc-800 pb-3">Notable Books</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {books.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        </section>
      )}

      {/* Threads */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <h2 className="font-serif text-2xl text-zinc-100">Discussions</h2>
          {user && (
            <button
              onClick={() => setShowModal(true)}
              className="bg-amber-700 hover:bg-amber-600 text-zinc-100 px-4 py-2 text-sm font-medium transition-colors"
            >
              Start a Discussion
            </button>
          )}
        </div>

        {!threads || threads.length === 0 ? (
          <p className="text-zinc-500 text-sm py-4">No discussions yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {threads.map((thread) => (
              <ThreadCard key={thread.id} thread={{ ...thread, genre_slug: slug }} />
            ))}
          </div>
        )}
      </section>

      {/* Create Thread Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 w-full max-w-lg p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-xl text-zinc-100">Start a Discussion</h2>
              <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-zinc-300 text-lg">✕</button>
            </div>
            <form onSubmit={handleCreateThread} className="flex flex-col gap-3">
              <input
                type="text"
                value={threadTitle}
                onChange={(e) => setThreadTitle(e.target.value)}
                placeholder="Discussion title"
                required
                className="bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-500 px-3 py-2 text-sm focus:outline-none focus:border-amber-700"
              />
              <textarea
                value={threadBody}
                onChange={(e) => setThreadBody(e.target.value)}
                placeholder="Opening post (optional)"
                rows={4}
                className="bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-500 px-3 py-2 text-sm focus:outline-none focus:border-amber-700 resize-none"
              />
              {createThread.isError && (
                <p className="text-red-400 text-xs">{createThread.error?.response?.data?.message || 'Failed to create.'}</p>
              )}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createThread.isPending || !threadTitle.trim()}
                  className="bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-zinc-100 px-4 py-2 text-sm font-medium transition-colors"
                >
                  {createThread.isPending ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}

export default Genre
