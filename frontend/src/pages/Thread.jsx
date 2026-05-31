import { useParams, Link } from 'react-router-dom'
import { useThread } from '../api/threads'
import Post from '../components/Post'
import PostComposer from '../components/PostComposer'

function Thread() {
  const { id, threadId } = useParams()
  const resolvedId = threadId || id
  const { data: thread, isLoading, isError } = useThread(resolvedId)

  if (isLoading) {
    return (
      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="animate-pulse flex flex-col gap-4">
          <div className="h-8 bg-zinc-800 w-2/3" />
          <div className="h-4 bg-zinc-800 w-1/4" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-zinc-900 border border-zinc-800" />
          ))}
        </div>
      </main>
    )
  }

  if (isError || !thread) {
    return (
      <main className="max-w-3xl mx-auto px-6 py-10">
        <p className="text-red-400">Failed to load thread.</p>
      </main>
    )
  }

  const topLevelPosts = (thread.posts || []).filter((p) => !p.parent_id)

  return (
    <main className="max-w-3xl mx-auto px-6 py-10 flex flex-col gap-8">
      {/* Header */}
      <div className="border-b border-zinc-800 pb-4 flex flex-col gap-2">
        {thread.book && (
          <Link
            to={`/books/${thread.book.id}`}
            className="text-xs text-zinc-500 hover:text-amber-500 transition-colors uppercase tracking-wider"
          >
            ← {thread.book.title}
          </Link>
        )}
        {thread.genre && (
          <Link
            to={`/genres/${thread.genre.slug}`}
            className="text-xs text-zinc-500 hover:text-amber-500 transition-colors uppercase tracking-wider"
          >
            ← {thread.genre.name}
          </Link>
        )}
        <h1 className="font-serif text-3xl text-zinc-100">{thread.title}</h1>
        <div className="flex items-center gap-4 text-zinc-500 text-sm">
          {thread.author && <span>by {thread.author}</span>}
          <span>{thread.upvotes ?? 0} upvotes</span>
          <span>{(thread.posts || []).length} posts</span>
        </div>
      </div>

      {/* Posts */}
      <div className="flex flex-col divide-y divide-zinc-800">
        {topLevelPosts.length === 0 && (
          <p className="text-zinc-500 text-sm py-4">No posts yet. Be the first to reply.</p>
        )}
        {topLevelPosts.map((post) => (
          <Post key={post.id} post={post} threadId={resolvedId} depth={0} />
        ))}
      </div>

      {/* New post */}
      <div className="border-t border-zinc-800 pt-6 flex flex-col gap-3">
        <h3 className="text-zinc-400 text-sm font-medium uppercase tracking-wider">Add a Reply</h3>
        <PostComposer threadId={resolvedId} placeholder="Join the discussion..." />
      </div>
    </main>
  )
}

export default Thread
