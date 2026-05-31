import { useState } from 'react'
import { useUpvotePost } from '../api/threads'
import useAuthStore from '../store/auth'
import PostComposer from './PostComposer'

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function Post({ post, threadId, depth = 0 }) {
  const { id, content, upvotes = 0, author, created_at, replies = [] } = post
  const [showReply, setShowReply] = useState(false)
  const user = useAuthStore((s) => s.user)
  const upvoteMutation = useUpvotePost()

  const handleUpvote = () => {
    if (user) upvoteMutation.mutate({ id, threadId })
  }

  return (
    <div className={depth > 0 ? 'border-l-2 border-zinc-700 pl-4 ml-2' : ''}>
      <div className="py-3">
        <div className="flex items-start gap-3">
          {/* upvote */}
          <button
            onClick={handleUpvote}
            disabled={!user || upvoteMutation.isPending}
            className="flex flex-col items-center gap-0.5 shrink-0 group pt-0.5"
            title={user ? 'Upvote' : 'Login to upvote'}
          >
            <span className="text-zinc-600 group-hover:text-amber-500 transition-colors text-sm leading-none">▲</span>
            <span className="text-amber-500 font-mono text-sm font-bold leading-none">{upvotes}</span>
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-zinc-300 text-xs font-medium">{author}</span>
              <span className="text-zinc-600 text-xs">{formatDate(created_at)}</span>
            </div>
            <p className="text-zinc-200 text-sm leading-relaxed whitespace-pre-wrap">{content}</p>

            {user && (
              <button
                onClick={() => setShowReply((v) => !v)}
                className="mt-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                {showReply ? 'Cancel' : 'Reply'}
              </button>
            )}

            {showReply && (
              <div className="mt-2">
                <PostComposer
                  threadId={threadId}
                  parentId={id}
                  placeholder="Write a reply..."
                  onSuccess={() => setShowReply(false)}
                />
              </div>
            )}
          </div>
        </div>

        {/* nested replies */}
        {replies.length > 0 && (
          <div className="mt-2">
            {replies.map((reply) => (
              <Post key={reply.id} post={reply} threadId={threadId} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Post
