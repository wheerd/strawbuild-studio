export function downloadFile(content: string | Uint8Array, filename: string, mimeType?: string): void {
  const type = mimeType ?? (typeof content === 'string' ? 'application/json' : 'application/octet-stream')
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
