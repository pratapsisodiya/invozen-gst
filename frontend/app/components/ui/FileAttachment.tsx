'use client'
import { useRef } from 'react'
import { Paperclip, X, Download, FileText, Image } from 'lucide-react'
import type { Attachment } from '@/types/attachment'
import { generateId } from '@/lib/utils/ids'

interface Props {
  attachments: Attachment[]
  onChange: (attachments: Attachment[]) => void
  maxFiles?: number
  maxSizeMB?: number
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileIcon(type: string) {
  if (type.startsWith('image/')) return <Image className="w-4 h-4 text-brand-500" />
  return <FileText className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
}

export function FileAttachment({ attachments, onChange, maxFiles = 5, maxSizeMB = 5 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = (files: FileList | null) => {
    if (!files) return
    const remaining = maxFiles - attachments.length
    const toProcess = Array.from(files).slice(0, remaining)

    toProcess.forEach((file) => {
      if (file.size > maxSizeMB * 1024 * 1024) return
      const reader = new FileReader()
      reader.onload = (e) => {
        const newAttachment: Attachment = {
          id: generateId(),
          name: file.name,
          type: file.type,
          size: file.size,
          data: e.target?.result as string,
          uploadedAt: new Date().toISOString(),
        }
        onChange([...attachments, newAttachment])
      }
      reader.readAsDataURL(file)
    })
  }

  const handleRemove = (id: string) => {
    onChange(attachments.filter((a) => a.id !== id))
  }

  const handleDownload = (att: Attachment) => {
    const a = document.createElement('a')
    a.href = att.data
    a.download = att.name
    a.click()
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium" style={{ color: 'var(--text-2)' }}>Attachments</p>
        {attachments.length < maxFiles && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-medium"
          >
            <Paperclip className="w-3.5 h-3.5" /> Attach file
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {attachments.length === 0 ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex items-center justify-center gap-2 py-4 rounded-lg border-2 border-dashed text-sm transition-colors hover:border-brand-400 hover:bg-brand-50"
          style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
        >
          <Paperclip className="w-4 h-4" />
          Click to attach files (max {maxFiles}, {maxSizeMB}MB each)
        </button>
      ) : (
        <div className="flex flex-col gap-1.5">
          {attachments.map((att) => (
            <div key={att.id} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              {fileIcon(att.type)}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] truncate font-medium" style={{ color: 'var(--text)' }}>{att.name}</p>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{formatSize(att.size)}</p>
              </div>
              <button type="button" onClick={() => handleDownload(att)} className="p-1 rounded hover:bg-ink-100" title="Download">
                <Download className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
              </button>
              <button type="button" onClick={() => handleRemove(att.id)} className="p-1 rounded hover:bg-err-50 text-err-500" title="Remove">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {attachments.length < maxFiles && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-ink-50 transition-colors"
              style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
            >
              <Paperclip className="w-3 h-3" /> Add more ({attachments.length}/{maxFiles})
            </button>
          )}
        </div>
      )}
    </div>
  )
}
