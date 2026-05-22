'use client'
import { Modal } from './Modal'
import { useKeyboardShortcut } from '@/lib/hooks/useKeyboardShortcut'
import { useUIStore } from '@/lib/store/uiStore'

const SHORTCUTS = [
  {
    group: 'Navigation',
    items: [
      { keys: ['?'], label: 'Open this panel' },
      { keys: ['G', 'D'], label: 'Go to Dashboard' },
      { keys: ['G', 'I'], label: 'Go to Invoices' },
      { keys: ['G', 'C'], label: 'Go to Customers' },
    ],
  },
  {
    group: 'Search',
    items: [
      { keys: ['⌘', 'K'], label: 'Open command palette' },
    ],
  },
  {
    group: 'Invoices',
    items: [
      { keys: ['⌘', 'N'], label: 'New Invoice' },
      { keys: ['⌘', 'S'], label: 'Save draft (in form)' },
    ],
  },
  {
    group: 'General',
    items: [
      { keys: ['Esc'], label: 'Close modal / panel' },
    ],
  },
]

export function KeyboardShortcutsPanel() {
  const { shortcutsPanelOpen, openShortcutsPanel, closeShortcutsPanel } = useUIStore()

  useKeyboardShortcut('?', openShortcutsPanel)

  return (
    <Modal open={shortcutsPanelOpen} onClose={closeShortcutsPanel} title="Keyboard Shortcuts" size="sm">
      <div className="p-5 flex flex-col gap-5">
        {SHORTCUTS.map((section) => (
          <div key={section.group}>
            <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
              {section.group}
            </p>
            <div className="flex flex-col gap-1.5">
              {section.items.map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: 'var(--text)' }}>{item.label}</span>
                  <div className="flex items-center gap-1">
                    {item.keys.map((k, i) => (
                      <span key={i} className="flex items-center gap-1">
                        {i > 0 && <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>then</span>}
                        <kbd className="px-2 py-0.5 rounded text-[11px] font-semibold border"
                          style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}>
                          {k}
                        </kbd>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  )
}
