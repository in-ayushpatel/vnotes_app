export interface FileLanguage {
  id: string
  label: string
}

export const LANGUAGE_BY_EXTENSION: Readonly<Record<string, FileLanguage>> = {
  '.java': { id: 'java', label: 'Java' },
  '.kt': { id: 'kotlin', label: 'Kotlin' },
  '.js': { id: 'javascript', label: 'JavaScript' },
  '.jsx': { id: 'jsx', label: 'JSX' },
  '.ts': { id: 'typescript', label: 'TypeScript' },
  '.tsx': { id: 'tsx', label: 'TSX' },
  '.py': { id: 'python', label: 'Python' },
  '.c': { id: 'c', label: 'C' },
  '.cpp': { id: 'cpp', label: 'C++' },
  '.h': { id: 'c', label: 'C' },
  '.hpp': { id: 'cpp', label: 'C++' },
  '.go': { id: 'go', label: 'Go' },
  '.rs': { id: 'rust', label: 'Rust' },
  '.sql': { id: 'sql', label: 'SQL' },
  '.sh': { id: 'shell', label: 'Shell' },
  '.json': { id: 'json', label: 'JSON' },
  '.yaml': { id: 'yaml', label: 'YAML' },
  '.yml': { id: 'yaml', label: 'YAML' },
  '.xml': { id: 'xml', label: 'XML' },
  '.properties': { id: 'properties', label: 'Properties' },
  '.toml': { id: 'toml', label: 'TOML' },
}

function getExtension(path: string): string {
  const fileName = path.split('/').pop() ?? path
  const dotIndex = fileName.lastIndexOf('.')
  return dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : ''
}

export function isMarkdownPath(path: string): boolean {
  return getExtension(path) === '.md'
}

export function getFileLanguage(path: string): FileLanguage | null {
  return LANGUAGE_BY_EXTENSION[getExtension(path)] ?? null
}

export function isSupportedTextPath(path: string): boolean {
  return isMarkdownPath(path) || getFileLanguage(path) !== null
}

export function getDisplayFileName(name: string): string {
  return isMarkdownPath(name) ? name.slice(0, -3) : name
}
