import { useState, useRef, useEffect } from 'react'
import { useData } from '../../context/DataContext'
import type { ThreadPost } from '../../types'
import { Avatar } from './Avatar'
import { HealthDot } from './HealthDot'

interface ThreadFeedProps {
  posts: ThreadPost[]
  onSend: (body: string) => void
  compact?: boolean
}

export function ThreadFeed({ posts, onSend, compact = false }: ThreadFeedProps) {
  const { users, usersById } = useData()
  const [draft, setDraft] = useState('')
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const feedEndRef = useRef<HTMLDivElement>(null)

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 80)}px`
  }, [draft])

  // Scroll to bottom when new posts arrive
  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [posts.length])

  // @mention detection — fires when '@' starts the word (start of input or after a space)
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setDraft(val)
    const lastAt = val.lastIndexOf('@')
    if (lastAt !== -1 && (lastAt === 0 || /\s/.test(val[lastAt - 1])) && !/\s/.test(val.slice(lastAt + 1))) {
      setMentionQuery(val.slice(lastAt + 1))
    } else {
      setMentionQuery(null)
    }
  }

  const insertMention = (user: { name: string }) => {
    const lastAt = draft.lastIndexOf('@')
    setDraft(draft.slice(0, lastAt) + `@${user.name} `)
    setMentionQuery(null)
    textareaRef.current?.focus()
  }

  const mentionMatches = mentionQuery !== null
    ? users.filter(u => u.name.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 5)
    : []

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape' && mentionQuery !== null) {
      setMentionQuery(null)
      return
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      // Let the user pick a mention with Enter instead of sending.
      if (mentionMatches.length > 0) {
        e.preventDefault()
        insertMention(mentionMatches[0])
        return
      }
      e.preventDefault()
      handleSend()
    }
  }

  const handleSend = () => {
    const body = draft.trim()
    if (!body) return
    onSend(body)
    setDraft('')
    setMentionQuery(null)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Feed */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {posts.length === 0 ? (
          <p className="text-[12px] text-[var(--text-faint)] py-2">
            No posts yet — start the thread.
          </p>
        ) : (
          posts.map(post => {
            const author = usersById[post.authorId]
            return (
              <div key={post.id} className={compact ? '' : 'border border-[var(--border)] rounded-[8px] p-4 bg-[var(--surface)]'}>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {author && <Avatar user={author} size="sm" />}
                  <span
                    style={{ fontSize: 13, fontWeight: 500 }}
                    className="text-[var(--text)]"
                  >
                    {author?.name ?? 'Unknown'}
                  </span>
                  {post.kind === 'status' && post.health && (
                    <HealthDot health={post.health} variant="pill" />
                  )}
                  <span
                    className="mono text-[var(--text-faint)] ml-auto"
                    style={{ fontSize: 12 }}
                  >
                    {post.createdAt}
                  </span>
                </div>
                <p
                  className="text-[var(--text-muted)] leading-relaxed"
                  style={{ fontSize: 14, paddingLeft: compact ? 32 : 0 }}
                >
                  {post.body}
                </p>
              </div>
            )
          })
        )}
        <div ref={feedEndRef} />
      </div>

      {/* Composer */}
      <div className="border-t border-[var(--border)] px-4 py-3 flex items-end gap-2 relative">
        {/* @mention autocomplete */}
        {mentionMatches.length > 0 && (
          <div
            className="absolute bottom-full left-4 mb-1 bg-[var(--surface)] border border-[var(--border)] rounded-[8px] py-1 z-20 min-w-[180px]"
            style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
          >
            {mentionMatches.map(u => (
              <button
                key={u.id}
                onMouseDown={e => { e.preventDefault(); insertMention(u) }}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[rgba(18,18,28,0.06)] transition-colors"
              >
                <Avatar user={u} size="sm" />
                <span className="text-[13px] text-[var(--text)]">{u.name}</span>
              </button>
            ))}
          </div>
        )}
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Write a message… (Enter to send, @name to mention)"
          rows={1}
          className="
            flex-1 text-[13px] text-[var(--text)] bg-transparent resize-none
            border border-[var(--border)] rounded-[6px] px-3 py-2
            placeholder:text-[var(--text-faint)]
            focus:outline-none focus:ring-2 focus:ring-[#5B57E0]
            transition-all duration-150
            overflow-hidden
          "
          style={{ minHeight: 34, maxHeight: 80 }}
        />
        <button
          onClick={handleSend}
          disabled={!draft.trim()}
          className="
            px-3 py-1.5 rounded-[6px] text-[12px] font-medium
            bg-[var(--accent)] text-white
            hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed
            transition-all duration-150 flex-shrink-0
          "
        >
          Send
        </button>
      </div>
    </div>
  )
}
