import { useState, useRef, useEffect } from 'react'
import { useAddToShelf, useUpdateShelf, useRemoveFromShelf } from '../api/books'
import useAuthStore from '../store/auth'

const SHELF_LABELS = {
  want_to_read: 'Want to Read',
  reading: 'Reading',
  read: 'Read',
}

function ShelfButton({ bookId, currentStatus }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const user = useAuthStore((s) => s.user)
  const addMutation = useAddToShelf()
  const updateMutation = useUpdateShelf()
  const removeMutation = useRemoveFromShelf()

  const isPending = addMutation.isPending || updateMutation.isPending || removeMutation.isPending

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!user) {
    return (
      <a
        href="/login"
        className="bg-zinc-800 border border-zinc-700 text-zinc-300 px-4 py-2 text-sm hover:border-amber-700 transition-colors"
      >
        Log in to add to shelf
      </a>
    )
  }

  const handleSelect = (status) => {
    setOpen(false)
    if (status === null) {
      removeMutation.mutate({ id: bookId })
    } else if (currentStatus) {
      updateMutation.mutate({ id: bookId, status })
    } else {
      addMutation.mutate({ id: bookId, status })
    }
  }

  const label = currentStatus ? SHELF_LABELS[currentStatus] : 'Add to Shelf'

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border transition-colors disabled:opacity-50 ${
          currentStatus
            ? 'bg-amber-700 border-amber-700 text-zinc-100 hover:bg-amber-600'
            : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-amber-700'
        }`}
      >
        {isPending ? 'Saving...' : label}
        <span className="text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-0.5 z-20 bg-zinc-900 border border-zinc-700 min-w-full">
          {Object.entries(SHELF_LABELS).map(([status, lbl]) => (
            <button
              key={status}
              onClick={() => handleSelect(status)}
              className={`block w-full text-left px-4 py-2 text-sm hover:bg-zinc-800 transition-colors ${
                currentStatus === status ? 'text-amber-500' : 'text-zinc-300'
              }`}
            >
              {lbl}
            </button>
          ))}
          {currentStatus && (
            <button
              onClick={() => handleSelect(null)}
              className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-zinc-800 transition-colors border-t border-zinc-800"
            >
              Remove from Shelf
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default ShelfButton
