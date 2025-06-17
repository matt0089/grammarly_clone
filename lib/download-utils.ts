// Download utility functions for document management

export interface DownloadableDocument {
  id: string
  title: string
  content: string
  file_type: string
}

/**
 * Downloads a single document as a file
 */
export function downloadDocument(doc: DownloadableDocument): void {
  const { title, content, file_type } = doc

  // Create timestamp for filename
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5)

  // Determine file extension
  const extension = getFileExtension(file_type)

  // Create filename with timestamp
  const filename = `${sanitizeFilename(title)}_${timestamp}.${extension}`

  // Create blob and download
  const blob = new Blob([content], { type: getContentType(file_type) })
  const url = URL.createObjectURL(blob)

  const link = window.document.createElement("a")
  link.href = url
  link.download = filename
  window.document.body.appendChild(link)
  link.click()
  window.document.body.removeChild(link)

  // Clean up the URL object
  URL.revokeObjectURL(url)
}

/**
 * Creates a ZIP file containing multiple documents and downloads it
 */
export async function downloadDocumentsAsZip(documents: DownloadableDocument[]): Promise<void> {
  // Dynamic import of JSZip to avoid bundling if not used
  const JSZip = (await import("jszip")).default

  const zip = new JSZip()
  const usedFilenames = new Set<string>()

  // Add each document to the ZIP
  documents.forEach((doc) => {
    const { title, content, file_type } = doc
    const extension = getFileExtension(file_type)
    let filename = `${sanitizeFilename(title)}.${extension}`

    // Handle duplicate filenames
    filename = resolveFilenameConflict(filename, usedFilenames)
    usedFilenames.add(filename)

    zip.file(filename, content)
  })

  // Generate ZIP file
  const zipBlob = await zip.generateAsync({ type: "blob" })

  // Create timestamp for ZIP filename
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5)
  const zipFilename = `documents_backup_${timestamp}.zip`

  // Download ZIP file
  const url = URL.createObjectURL(zipBlob)
  const link = window.document.createElement("a")
  link.href = url
  link.download = zipFilename
  window.document.body.appendChild(link)
  link.click()
  window.document.body.removeChild(link)

  // Clean up
  URL.revokeObjectURL(url)
}

/**
 * Maps file type to file extension
 */
function getFileExtension(fileType: string): string {
  switch (fileType.toLowerCase()) {
    case "md":
    case "markdown":
      return "md"
    case "txt":
    default:
      return "txt"
  }
}

/**
 * Maps file type to MIME content type
 */
function getContentType(fileType: string): string {
  switch (fileType.toLowerCase()) {
    case "md":
    case "markdown":
      return "text/markdown"
    case "txt":
    default:
      return "text/plain"
  }
}

/**
 * Sanitizes filename by removing invalid characters
 */
function sanitizeFilename(filename: string): string {
  // Remove or replace invalid filename characters
  return (
    filename
      .replace(/[<>:"/\\|?*]/g, "_") // Replace invalid chars with underscore
      .replace(/\s+/g, "_") // Replace spaces with underscore
      .replace(/_{2,}/g, "_") // Replace multiple underscores with single
      .replace(/^_|_$/g, "") // Remove leading/trailing underscores
      .slice(0, 100) || // Limit length
    "untitled"
  ) // Fallback if empty
}

/**
 * Resolves filename conflicts by appending numbers
 */
function resolveFilenameConflict(filename: string, usedFilenames: Set<string>): string {
  if (!usedFilenames.has(filename)) {
    return filename
  }

  const lastDotIndex = filename.lastIndexOf(".")
  const name = lastDotIndex > 0 ? filename.slice(0, lastDotIndex) : filename
  const extension = lastDotIndex > 0 ? filename.slice(lastDotIndex) : ""

  let counter = 1
  let newFilename: string

  do {
    newFilename = `${name}(${counter})${extension}`
    counter++
  } while (usedFilenames.has(newFilename))

  return newFilename
}
