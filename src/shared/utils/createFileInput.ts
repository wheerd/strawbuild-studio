export function createFileInput(
  onFileLoaded: (content: string, file: File) => void,
  accept = '.json'
): Promise<string> {
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
      reader.onload = async e => {
        const content = e.target?.result
        if (typeof content === 'string') {
          try {
            await onFileLoaded(content, file)
          } catch (error) {
            reject(error)
            return
          }
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

export function createBinaryFileInput(
  onFileLoaded: (content: ArrayBuffer, file: File) => void | Promise<void>,
  accept = '.ifc'
): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.style.display = 'none'

    const cleanup = (): void => {
      document.body.removeChild(input)
    }

    input.addEventListener('change', event => {
      const file = (event.target as HTMLInputElement).files?.[0]
      if (!file) {
        cleanup()
        reject(new Error('No file selected'))
        return
      }

      const reader = new FileReader()
      reader.onload = async e => {
        const content = e.target?.result
        if (content instanceof ArrayBuffer) {
          try {
            await onFileLoaded(content, file)
            resolve(content)
          } catch (error) {
            reject(error)
          } finally {
            cleanup()
          }
        } else {
          cleanup()
          reject(new Error('Failed to read file content'))
        }
      }
      reader.onerror = () => {
        cleanup()
        reject(new Error('Failed to read file'))
      }
      reader.readAsArrayBuffer(file)
    })

    input.addEventListener('cancel', () => {
      cleanup()
      reject(new Error('File selection cancelled'))
    })

    document.body.appendChild(input)
    input.click()
  })
}
