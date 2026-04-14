import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import * as launchd from './launchd-service'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 15, y: 15 },
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.launchd-viz')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC handlers
  ipcMain.handle('launchd:list', () => {
    try {
      return { data: launchd.listAgents() }
    } catch (e) {
      return { error: (e as Error).message }
    }
  })

  ipcMain.handle('launchd:read-raw', (_, path: string) => {
    try {
      return { data: launchd.readPlistRaw(path) }
    } catch (e) {
      return { error: (e as Error).message }
    }
  })

  ipcMain.handle('launchd:create', (_, plist, source) => {
    try {
      return { data: launchd.createAgent(plist, source) }
    } catch (e) {
      return { error: (e as Error).message }
    }
  })

  ipcMain.handle('launchd:update', (_, path: string, plist) => {
    try {
      launchd.updateAgent(path, plist)
      return { data: true }
    } catch (e) {
      return { error: (e as Error).message }
    }
  })

  ipcMain.handle('launchd:update-raw', (_, path: string, xml: string) => {
    try {
      launchd.updateAgentRaw(path, xml)
      return { data: true }
    } catch (e) {
      return { error: (e as Error).message }
    }
  })

  ipcMain.handle('launchd:delete', (_, path: string, label: string) => {
    try {
      launchd.deleteAgent(path, label)
      return { data: true }
    } catch (e) {
      return { error: (e as Error).message }
    }
  })

  ipcMain.handle('launchd:load', (_, path: string) => {
    try {
      launchd.loadAgent(path)
      return { data: true }
    } catch (e) {
      return { error: (e as Error).message }
    }
  })

  ipcMain.handle('launchd:unload', (_, path: string, label: string) => {
    try {
      launchd.unloadAgent(path, label)
      return { data: true }
    } catch (e) {
      return { error: (e as Error).message }
    }
  })

  ipcMain.handle('launchd:start', (_, label: string) => {
    try {
      launchd.startAgent(label)
      return { data: true }
    } catch (e) {
      return { error: (e as Error).message }
    }
  })

  ipcMain.handle('launchd:stop', (_, label: string) => {
    try {
      launchd.stopAgent(label)
      return { data: true }
    } catch (e) {
      return { error: (e as Error).message }
    }
  })

  ipcMain.handle('launchd:reveal', (_, path: string) => {
    shell.showItemInFolder(path)
    return { data: true }
  })

  ipcMain.handle('launchd:run-info', async (_, label: string) => {
    try {
      const data = await launchd.getServiceRunInfo(label)
      return { data }
    } catch (e) {
      return { error: (e as Error).message }
    }
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
