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
    <div className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors flex gap-4 p-4">
      <button
        onClick={handleUpvote}
        disabled={!user || upvoteMutation.isPending}
        className="flex flex-col items-center gap-0.5 shrink-0 group"
        title={user ? 'Upvote' : 'Login to upvote'}
      >
        <span className="text-zinc-500 group-hover:text-amber-500 transition-colors text-lg leading-none">▲</span>
        <span className="text-amber-500 font-mono font-bold text-lg leading-none">{upvotes}</span>
      </button>
      <div className="flex flex-col gap-1 min-w-0">
        <Link to={href} className="font-serif text-zinc-100 hover:text-amber-500 transition-colors leading-snug">
          {title}
        </Link>
        <div className="text-zinc-500 text-xs flex gap-3">
          {author && <span>by {author}</span>}
          <span>{post_count} {post_count === 1 ? 'reply' : 'replies'}</span>
        </div>
      </div>
    </div>
  )
}

export default ThreadCard
