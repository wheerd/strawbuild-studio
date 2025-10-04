export function createFileInput(onFileLoaded: (content: string) => void, accept = '.json'): Promise<string> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.style.display = 'none'

    input.addEventListener('change', event => {
      const file = (event.target as HTMLInputElement).files?.[0]
      if (!file) {
        reject(new Error('No file selected'))
        return
      }

      const reader = new FileReader()
      reader.onload = e => {
        const content = e.target?.result
        if (typeof content === 'string') {
          onFileLoaded(content)
          resolve(content)
        } else {
          reject(new Error('Failed to read file content'))
        }
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    })

    // Handle case where user cancels file dialog
    input.addEventListener('cancel', () => {
      reject(new Error('File selection cancelled'))
    })

    document.body.appendChild(input)
    input.click()
    document.body.removeChild(input)
  })
}
