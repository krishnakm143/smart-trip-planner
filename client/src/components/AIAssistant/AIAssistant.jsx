import { useRef, useState, useEffect } from 'react'
import { Bot, Send } from 'lucide-react'
import Button from '../ui/Button'
import { askTripAssistant } from '../../services/tripService'
import styles from './AIAssistant.module.css'

const QUICK_PROMPTS = [
  '🎒 What should I pack for this trip?',
  '💡 How can I optimize and reduce expenses?',
  '🍽️ What are the top local dishes to try?',
  '☀️ Weather and time-of-day advice?',
]

function formatMarkdown(text) {
  // Simple light markdown formatter for safe bolding and line breaks
  const lines = text.split('\n')
  return lines.map((line, idx) => {
    // Bold: **text** -> <strong>text</strong>
    const parts = line.split(/(\*\*.*?\*\*)/g)
    return (
      <div key={idx} style={{ marginBottom: line.trim() === '' ? '0.5rem' : '0.15rem' }}>
        {parts.map((p, pIdx) => {
          if (p.startsWith('**') && p.endsWith('**')) {
            return <strong key={pIdx}>{p.slice(2, -2)}</strong>
          }
          return p
        })}
      </div>
    )
  })
}

export default function AIAssistant({ trip }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: `👋 Hi! I am your AI Travel Assistant for **${trip.destination?.name || trip.title}**. Ask me about local foods, packing, budget optimization, or itinerary pacing!`,
    },
  ])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const chatScrollRef = useRef(null)

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [messages])

  async function handleSend(textToSend) {
    const question = textToSend || input
    if (!question.trim() || busy) return

    const userMessage = { role: 'user', text: question.trim() }
    setMessages((prev) => [...prev, userMessage])
    if (!textToSend) setInput('')
    setBusy(true)

    try {
      const answer = await askTripAssistant(trip.id, question.trim())
      setMessages((prev) => [...prev, { role: 'assistant', text: answer }])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `Here is a quick travel tip for ${trip.destination?.name}: Ensure you carry cash for local auto-rickshaws, check entry hours in the itinerary before heading out, and stay hydrated!`,
        },
      ])
    } finally {
      setBusy(false)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    handleSend()
  }

  return (
    <section className={styles.wrapper} aria-labelledby="ai-assistant-heading">
      <div className={styles.header}>
        <h3 id="ai-assistant-heading" className={styles.title}>
          <Bot size={18} aria-hidden="true" style={{ color: 'var(--primary, #0284c7)' }} />
          AI Travel Assistant · {trip.destination?.name}
        </h3>
        <span style={{ fontSize: '0.75rem', color: 'var(--ink-soft)' }}>
          Trip-Aware Insights
        </span>
      </div>

      <div className={styles.quickChips}>
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            className={styles.chipBtn}
            onClick={() => handleSend(prompt)}
            disabled={busy}
          >
            {prompt}
          </button>
        ))}
      </div>

      <div ref={chatScrollRef} className={styles.chatHistory}>
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={m.role === 'user' ? styles.userMsg : styles.assistantMsg}
          >
            {m.role === 'assistant' ? formatMarkdown(m.text) : m.text}
          </div>
        ))}
        {busy && (
          <div className={styles.assistantMsg} style={{ fontStyle: 'italic', color: '#64748b' }}>
            Consulting travel knowledge…
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className={styles.inputBar}>
        <input
          type="text"
          placeholder={`Ask anything about ${trip.destination?.name || 'your trip'}...`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={busy}
        />
        <Button type="submit" size="sm" busy={busy} disabled={!input.trim()}>
          <Send size={14} aria-hidden="true" />
          Ask
        </Button>
      </form>
    </section>
  )
}
