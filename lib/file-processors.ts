// Base interface for file processors
export interface FileProcessor {
  supportedTypes: string[]
  process(file: File): Promise<string>
  getFileType(filename: string): string // Add this method
}

// Text file processor
export class TextFileProcessor implements FileProcessor {
  supportedTypes = [".txt"]

  async process(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (event) => {
        const content = event.target?.result as string
        resolve(content)
      }

      reader.onerror = () => {
        reject(new Error("Failed to read text file"))
      }

      reader.readAsText(file)
    })
  }

  getFileType(filename: string): string {
    return "txt"
  }
}

// Markdown file processor
export class MarkdownFileProcessor implements FileProcessor {
  supportedTypes = [".md", ".markdown"]

  async process(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (event) => {
        const content = event.target?.result as string
        resolve(content)
      }

      reader.onerror = () => {
        reject(new Error("Failed to read markdown file"))
      }

      reader.readAsText(file)
    })
  }

  getFileType(filename: string): string {
    const extension = this.getFileExtension(filename)
    return extension === ".markdown" ? "markdown" : "md"
  }

  private getFileExtension(filename: string): string {
    const lastDotIndex = filename.lastIndexOf(".")
    return lastDotIndex !== -1 ? filename.slice(lastDotIndex).toLowerCase() : ""
  }
}

// File processor registry
export class FileProcessorRegistry {
  private processors: FileProcessor[] = []

  constructor() {
    // Register default processors
    this.register(new TextFileProcessor())
    this.register(new MarkdownFileProcessor())
  }

  register(processor: FileProcessor) {
    this.processors.push(processor)
  }

  getSupportedTypes(): string[] {
    return this.processors.flatMap((p) => p.supportedTypes)
  }

  async processFile(file: File): Promise<string> {
    const fileExtension = this.getFileExtension(file.name)

    const processor = this.processors.find((p) => p.supportedTypes.includes(fileExtension))

    if (!processor) {
      throw new Error(`Unsupported file type: ${fileExtension}`)
    }

    return processor.process(file)
  }

  getFileTypeForFile(filename: string): string {
    const fileExtension = this.getFileExtension(filename)
    const processor = this.processors.find((p) => p.supportedTypes.includes(fileExtension))

    if (!processor) {
      return "txt" // Default fallback
    }

    return processor.getFileType(filename)
  }

  private getFileExtension(filename: string): string {
    const lastDotIndex = filename.lastIndexOf(".")
    return lastDotIndex !== -1 ? filename.slice(lastDotIndex).toLowerCase() : ""
  }

  isSupported(filename: string): boolean {
    const extension = this.getFileExtension(filename)
    return this.getSupportedTypes().includes(extension)
  }
}

// Export singleton instance
export const fileProcessorRegistry = new FileProcessorRegistry()
