import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('bibleApi', {
  getChapter: (book: string, chapter: number) => ipcRenderer.invoke('get-chapter', book, chapter),
  getNextChapter: (book: string, chapter: number) =>
    ipcRenderer.invoke('get-next-chapter', book, chapter),
  getPreviousChapter: (book: string, chapter: number) =>
    ipcRenderer.invoke('get-previous-chapter', book, chapter),
  saveCurrentChapter: (book: string, chapter: number) =>
    ipcRenderer.invoke('save-current-chapter', book, chapter),
  loadCurrentChapter: () => ipcRenderer.invoke('load-current-chapter'),
  onNavigateChapter: (callback: (direction: 'next' | 'previous') => void) => {
    ipcRenderer.on('navigate-chapter', (_event, direction) => callback(direction))
  }
})
