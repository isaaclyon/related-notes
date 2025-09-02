// Mock implementation of obsidian-community-lib for testing

export interface ResolvedLinks {
  [sourcePath: string]: {
    [targetPath: string]: number
  }
}

export function openView(app: any, viewType: string, viewClass: any): Promise<any> {
  return Promise.resolve(new viewClass(null, null, null))
}

export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function copy(text: string): Promise<void> {
  return Promise.resolve()
}

export function createNewMDNote(app: any, name: string, content?: string): Promise<any> {
  return Promise.resolve({
    path: `${name}.md`,
    name: `${name}.md`,
    basename: name,
    extension: 'md'
  })
}

export function isInVault(app: any, path: string): boolean {
  return true
}

export function isLinked(app: any, source: string, target: string): boolean {
  const resolvedLinks = app.metadataCache.resolvedLinks
  return !!(resolvedLinks[source] && resolvedLinks[source][target])
}