import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import Database from 'better-sqlite3'
import { app, BrowserWindow, ipcMain, Menu, shell } from 'electron'
import type ElectronStore from 'electron-store'
import path, { join } from 'path'
import icon from '../../resources/icon.png?asset'

const dbPath = path.join(__dirname, '../../data/bible.sqlite')
const db = new Database(dbPath)

// Initialize electron-store for persistent settings (ESM dynamic import)
let store: ElectronStore

async function getStore(): Promise<ElectronStore> {
  if (!store) {
    const Store = (await import('electron-store')).default
    store = new Store({
      defaults: {
        currentChapter: {
          book: 'GEN',
          chapter: 1
        }
      }
    })
  }
  return store
}

ipcMain.handle('get-chapter', (_event, book: string, chapter: number) => {
  const stmt = db.prepare(`
    SELECT verse, text
    FROM verses
    WHERE book=? AND chapter=?
    ORDER BY book_order, verse
  `)
  return stmt.all(book, chapter)
})

ipcMain.handle('get-next-chapter', (_event, book: string, chapter: number) => {
  // Try next chapter in same book
  const nextChapter = db
    .prepare(
      `
    SELECT DISTINCT book, chapter
    FROM verses
    WHERE book=? AND chapter=?
    LIMIT 1
  `
    )
    .get(book, chapter + 1) as { book: string; chapter: number } | undefined

  if (nextChapter) {
    return { book: nextChapter.book, chapter: nextChapter.chapter }
  }

  // Try first chapter of next book
  const currentBookOrder = db
    .prepare('SELECT book_order FROM verses WHERE book=? LIMIT 1')
    .get(book) as { book_order: number } | undefined

  if (!currentBookOrder) return null

  const nextBook = db
    .prepare(
      `
    SELECT DISTINCT book, MIN(chapter) as chapter
    FROM verses
    WHERE book_order > ?
    GROUP BY book
    ORDER BY book_order 
    LIMIT 1
  `
    )
    .get(currentBookOrder.book_order) as { book: string; chapter: number } | undefined

  return nextBook || null
})

ipcMain.handle('get-previous-chapter', (_event, book: string, chapter: number) => {
  // Try previous chapter in same book
  const prevChapter = db
    .prepare(
      `
    SELECT DISTINCT book, chapter
    FROM verses
    WHERE book=? AND chapter=?
    LIMIT 1
  `
    )
    .get(book, chapter - 1) as { book: string; chapter: number } | undefined

  if (prevChapter) {
    return { book: prevChapter.book, chapter: prevChapter.chapter }
  }

  // Try last chapter of previous book
  const currentBookOrder = db
    .prepare('SELECT book_order FROM verses WHERE book=? LIMIT 1')
    .get(book) as { book_order: number } | undefined

  if (!currentBookOrder) return null

  const prevBook = db
    .prepare(
      `
    SELECT DISTINCT book, MAX(chapter) as chapter
    FROM verses
    WHERE book_order < ?
    GROUP BY book
    ORDER BY book_order DESC
    LIMIT 1
  `
    )
    .get(currentBookOrder.book_order) as { book: string; chapter: number } | undefined

  return prevBook || null
})

// Save current chapter
ipcMain.handle('save-current-chapter', async (_event, book: string, chapter: number) => {
  const store = await getStore()
  store.set('currentChapter', { book, chapter })
})

// Load current chapter
ipcMain.handle('load-current-chapter', async () => {
  const store = await getStore()
  return store.get('currentChapter', { book: 'GEN', chapter: 1 })
})

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: false,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // Create application menu
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(process.platform === 'darwin'
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const }
            ]
          }
        ]
      : []),
    {
      label: 'Go',
      submenu: [
        {
          label: 'Previous Chapter',
          accelerator: 'Left',
          click: () => {
            mainWindow.webContents.send('navigate-chapter', 'previous')
          }
        },
        {
          label: 'Next Chapter',
          accelerator: 'Right',
          click: () => {
            mainWindow.webContents.send('navigate-chapter', 'next')
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' as const },
        { role: 'forceReload' as const },
        { role: 'toggleDevTools' as const },
        { type: 'separator' as const },
        { role: 'resetZoom' as const },
        { role: 'zoomIn' as const },
        { role: 'zoomOut' as const },
        { type: 'separator' as const },
        { role: 'togglefullscreen' as const }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
