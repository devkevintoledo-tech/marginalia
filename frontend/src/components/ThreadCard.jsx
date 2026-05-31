import { Link } from 'react-router-dom'
import { useUpvoteThread } from '../api/threads'
import useAuthStore from '../store/auth'

function ThreadCard({ thread }) {
  const { id, title, upvotes = 0, post_count = 0, book_id, genre_slug, author } = thread
  const upvoteMutation = useUpvoteThread()
  const user = useAuthStore((s) => s.user)

  const href = book_id
    ? `/books/${book_id}/threads/${id}`
    : genre_slug
    ? `/genres/${genre_slug}/threads/${id}`
    : `/threads/${id}`

  const handleUpvote = (e) => {
    e.preventDefault()
    if (user) upvoteMutation.mutate({ id })
  }

  return (
    <div className="group flex gap-0 border border-zinc-800/60 hover:border-zinc-700 transition-colors bg-zinc-950 hover:bg-zinc-900/50">
      <button
        onClick={handleUpvote}
        disabled={!user || upvoteMutation.isPending}
        className="flex flex-col items-center justify-center gap-1 shrink-0 w-14 border-r border-zinc-800/60 py-4 group/up hover:bg-zinc-900 transition-colors disabled:cursor-default"
        title={user ? 'Upvote' : 'Sign in to upvote'}
      >
        <span className="text-zinc-700 group-hover/up:text-amber-600 transition-colors text-xs leading-none">↑</span>
        <span className="text-amber-500 font-mono font-semibold text-sm leading-none">{upvotes}</span>
      </button>
      <div className="flex flex-col gap-1 min-w-0 px-4 py-3.5">
        <Link to={href} className="font-serif text-zinc-200 hover:text-amber-500 transition-colors text-base leading-snug">
          {title}
        </Link>
        <div className="flex items-center gap-3 text-zinc-600 text-xs">
          {author && <span>{author}</span>}
          {author && <span className="text-zinc-800">·</span>}
          <span className="bg-zinc-900 border border-zinc-800 px-2 py-0.5 text-zinc-500">
            {post_count} {post_count === 1 ? 'reply' : 'replies'}
          </span>
        </div>
      </div>
    </div>
  )
}

export default ThreadCard
