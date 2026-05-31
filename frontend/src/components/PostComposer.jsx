import { useState } from 'react'
import { useCreatePost } from '../api/threads'
import useAuthStore from '../store/auth'

function PostComposer({ threadId, parentId = null, onSuccess, placeholder = 'Write a reply...' }) {
  const [content, setContent] = useState('')
  const user = useAuthStore((s) => s.user)
  const mutation = useCreatePost()

  if (!user) {
    return (
      <p className="text-zinc-500 text-sm py-2">
        <a href="/login" className="text-amber-500 hover:underline">Log in</a> to post.
      </p>
    )
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!content.trim()) return
    mutation.mutate(
      { thread_id: threadId, parent_id: parentId, content: content.trim() },
      {
        onSuccess: () => {
          setContent('')
          onSuccess?.()
        },
      }
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-500 px-3 py-2 text-sm focus:outline-none focus:border-amber-700 resize-none w-full"
      />
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={mutation.isPending || !content.trim()}
          className="bg-amber-700 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-100 px-4 py-1.5 text-sm font-medium transition-colors"
        >
          {mutation.isPending ? 'Posting...' : 'Post'}
        </button>
      </div>
      {mutation.isError && (
        <p className="text-red-400 text-xs">{mutation.error?.response?.data?.message || 'Failed to post.'}</p>
      )}
    </form>
  )
}

export default PostComposer
