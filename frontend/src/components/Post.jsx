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
    <div className={depth > 0 ? 'border-l border-zinc-800 pl-5 ml-3' : ''}>
      <div className="py-4">
        <div className="flex items-start gap-3">
          <button
            onClick={handleUpvote}
            disabled={!user || upvoteMutation.isPending}
            className="flex flex-col items-center gap-0.5 shrink-0 group/up pt-0.5 w-8"
            title={user ? 'Upvote' : 'Sign in to upvote'}
          >
            <span className="text-zinc-700 group-hover/up:text-amber-500 transition-colors text-xs leading-none">↑</span>
            <span className="text-amber-500 font-mono text-xs font-semibold leading-none">{upvotes}</span>
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-amber-600 text-xs font-semibold tracking-wide">{author}</span>
              <span className="text-zinc-700 text-xs">{formatDate(created_at)}</span>
            </div>
            <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">{content}</p>

            {user && (
              <button
                onClick={() => setShowReply((v) => !v)}
                className="mt-3 text-xs text-zinc-600 hover:text-zinc-400 transition-colors uppercase tracking-widest"
              >
                {showReply ? '↩ Cancel' : '↩ Reply'}
              </button>
            )}

            {showReply && (
              <div className="mt-3">
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

        {replies.length > 0 && (
          <div className="mt-3">
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
