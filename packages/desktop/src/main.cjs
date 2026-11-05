const { app, BrowserWindow, Menu, dialog, shell, screen, session } = require('electron');
const { fork } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { loadConfig, saveConfig, safeBounds, isAppUrl, isPdfResourceUrl, externalUrl, childEnvironment, qaProfile } = require('./config.cjs');
const { hasExited, stopChild } = require('./lifecycle.cjs');
const { appendDiagnostic } = require('./diagnostics.cjs');

app.setName('HomeLedger');
const testDir = app.isPackaged
  ? qaProfile(process.env.HOMELEDGER_DESKTOP_TEST_DIR, process.argv.includes('--desktop-qa'))
  : process.env.HOMELEDGER_DESKTOP_TEST_DIR;
app.setPath('userData', testDir ? path.resolve(testDir) : path.join(app.getPath('appData'), 'HomeLedger'));
const userDir = app.getPath('userData');
const dataDir = path.join(userDir, 'data');
let window, child, origin, config, shuttingDown = false, starting = false, stopPromise;
let stoppingChild = false;
let handlingFailure = false;
const spanish = () => app.getLocale().startsWith('es');
const text = (en, es) => spanish() ? es : en;
function log(message) {
  appendDiagnostic(userDir, message);
}
function returnToApp() {
  if (window && origin && !shuttingDown) {
    void window.loadURL(`${origin}/dashboard`).catch(() => fatal('NAVIGATION_FAILED'));
  }
}
function goBack() {
  const history = window?.webContents.navigationHistory;
  const previous = history?.getEntryAtIndex(history.getActiveIndex() - 1);
  if (previous && origin && isAppUrl(previous.url, origin)) history.goBack();
  else returnToApp();
}
function loadingWindow() {
  window = new BrowserWindow({
    ...safeBounds(config?.bounds, screen.getAllDisplays()), minWidth: 600, minHeight: 480,
    title: 'HomeLedger', backgroundColor: '#10131c', show: false,
    icon: path.join(__dirname, '../resources/icon.png'),
    // Electron disables plugins by default, including Chromium's built-in PDF viewer.
    webPreferences: { partition: 'persist:homeledger', nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true, webviewTag: false, plugins: true },
  });
  window.once('ready-to-show', () => window?.show());
  window.on('close', () => {
    if (config && !window.isMinimized()) {
      config.bounds = window.getNormalBounds();
      try { saveConfig(userDir, config); } catch { log('Could not save window bounds'); }
    }
  });
  window.on('closed', () => { window = null; });
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (origin && isAppUrl(url, origin)) void window.loadURL(url);
    else void openExternal(url);
    return { action: 'deny' };
  });
  for (const event of ['will-navigate', 'will-redirect']) window.webContents.on(event, (e, url) => {
    if (origin && isAppUrl(url, origin)) return;
    e.preventDefault();
    void openExternal(url);
  });
  window.webContents.on('render-process-gone', () => { if (!shuttingDown) void fatal('RENDERER_STOPPED'); });
  window.webContents.on('will-attach-webview', event => event.preventDefault());
  const title = text('Opening HomeLedger', 'Abriendo HomeLedger');
  const subtitle = text('Preparing your local workspace…', 'Preparando tus datos locales…');
  void window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><title>HomeLedger</title><style>body{margin:0;min-height:100vh;display:grid;place-content:center;background:#10131c;color:#f1f5f9;font:16px system-ui;text-align:center}h1{font-size:28px}p{color:#aebed0}</style></head><body><h1>${title}</h1><p>${subtitle}</p></body></html>`)}`);
}
async function openExternal(url) {
  if (!externalUrl(url)) return;
  const answer = await dialog.showMessageBox(window ?? undefined, {
    type: 'question', title: 'HomeLedger', message: text('Open this link in your browser?', '¿Abrir este enlace en tu navegador?'),
    detail: new URL(url).origin, buttons: [text('Cancel', 'Cancelar'), text('Open browser', 'Abrir navegador')], defaultId: 0, cancelId: 0,
  });
  if (answer.response === 1) await shell.openExternal(url);
}
async function stopBackend() {
  if (stopPromise) return stopPromise;
  const active = child;
  if (hasExited(active)) { if (child === active) child = null; return; }
  stoppingChild = true;
  stopPromise = stopChild(active, { onTimeout: () => log('Backend shutdown timeout') });
  try { await stopPromise; }
  finally {
    if (child === active && hasExited(active)) child = null;
    stopPromise = null;
    stoppingChild = false;
  }
}
async function fatal(code) {
  if (shuttingDown || handlingFailure) return;
  handlingFailure = true;
  log(`Application error: ${code}`);
  const detail = code === 'PORT_IN_USE'
    ? text('The saved local port is in use. Close the conflicting application and retry. HomeLedger will never connect to another server.', 'El puerto local está ocupado. Cierra la aplicación que lo utiliza y reintenta. HomeLedger no se conectará a otro servidor.')
    : code === 'NEWER_DATA'
      ? text('These data were opened by a newer version. Install that version or restore a compatible backup. Your files have not been deleted.', 'Estos datos pertenecen a una versión más reciente. Instala esa versión o restaura un respaldo compatible. No se eliminaron tus archivos.')
      : code === 'BACKEND_STOPPED'
        ? text('The local service stopped unexpectedly. Retry to restart it. Your saved data have not been deleted.', 'El servicio local se detuvo inesperadamente. Reintenta para reiniciarlo. No se eliminaron tus datos guardados.')
        : code === 'RENDERER_STOPPED'
          ? text('The application window stopped unexpectedly. Retry to reopen it. Unsaved changes may need to be entered again.', 'La ventana de la aplicación se detuvo inesperadamente. Reintenta para abrirla. Quizá debas volver a ingresar los cambios sin guardar.')
          : text('Your local workspace could not be opened. Check free disk space and folder permissions. Your data have not been deleted.', 'No se pudieron abrir tus datos locales. Revisa espacio libre y permisos. No se eliminaron tus archivos.');
  const answer = await dialog.showMessageBox(window ?? undefined, {
    type: 'error', title: 'HomeLedger', message: text('HomeLedger could not continue', 'HomeLedger no pudo continuar'), detail,
    buttons: [text('Retry', 'Reintentar'), text('Open data folder', 'Abrir carpeta de datos'), text('Quit', 'Salir')], defaultId: 0, cancelId: 2,
  });
  if (answer.response === 2) { handlingFailure = false; app.quit(); return; }
  if (answer.response === 1) { await shell.openPath(userDir); handlingFailure = false; return fatal(code); }
  await stopBackend();
  starting = false;
  handlingFailure = false;
  await start();
}
async function start() {
  if (starting || shuttingDown) return;
  starting = true;
  try {
    config = loadConfig(userDir);
    fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 });
    if (!window) loadingWindow();
    const token = randomBytes(32).toString('hex');
    const resources = app.isPackaged ? path.join(process.resourcesPath, 'runtime') : path.resolve(__dirname, '../runtime');
    const binary = path.join(resources, 'bin', process.platform === 'win32' ? 'node.exe' : 'node');
    stoppingChild = false;
    const active = child = fork(path.join(resources, 'backend.cjs'), [], {
      execPath: binary, execArgv: [], cwd: resources, env: childEnvironment(process.env),
      stdio: ['ignore', 'ignore', 'ignore', 'ipc'], windowsHide: true,
    });
    const ready = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(Object.assign(new Error('Startup timeout'), { code: 'START_TIMEOUT' })), 60000);
      const fail = error => { clearTimeout(timeout); reject(error); };
      active.once('error', fail);
      active.once('exit', () => fail(new Error('Backend exited before ready')));
      active.on('message', message => {
        if (message?.type === 'ready') { clearTimeout(timeout); resolve(message); }
        if (message?.type === 'error') fail(Object.assign(new Error('Backend failed'), { code: message.code }));
      });
      active.send({ type: 'init', token, jwtSecret: config.jwtSecret, dataDir, port: config.port, locale: spanish() ? 'es' : 'en' });
    });
    if (!Number.isInteger(ready.port) || ready.port < 1 || ready.port > 65535) throw new Error('Invalid backend address');
    config.port = ready.port;
    saveConfig(userDir, config);
    origin = `http://127.0.0.1:${ready.port}`;
    const ses = window.webContents.session;
    // No token is exposed to scripts. Bind the header to this trusted window and origin.
    ses.webRequest.onBeforeSendHeaders((details, callback) => {
      const local = isAppUrl(details.url, origin);
      if (local && details.webContentsId === window?.webContents.id) {
        callback({ requestHeaders: { ...details.requestHeaders, 'X-HomeLedger-Desktop': token } });
      } else {
        const cancel = !details.url.startsWith('data:') && !details.url.startsWith(`blob:${origin}/`) && !isPdfResourceUrl(details.url, details.frame?.url);
        if (cancel && process.env.HOMELEDGER_DESKTOP_DEBUG === '1') {
          const url = new URL(details.url);
          // Diagnostic resource names only; no request paths, query strings or tokens.
          log(`Blocked resource ${url.protocol}//${url.hostname} type=${details.resourceType}`);
        }
        callback({ cancel });
      }
    });
    active.on('exit', () => {
      if (child === active) child = null;
      if (!shuttingDown && !stoppingChild && !starting) void fatal('BACKEND_STOPPED');
    });
    // The protected layout restores the HttpOnly session before rendering.
    // The legacy root landing page only checks tab-scoped sessionStorage.
    await window.loadURL(`${origin}/dashboard`);
    starting = false;
    log(`Ready ${app.getVersion()} ${process.platform}/${process.arch}`);
  } catch (error) {
    starting = false;
    await stopBackend();
    await fatal(error.code ?? 'START_FAILED');
  }
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (window?.isMinimized()) window.restore(); window?.show(); window?.focus(); });
  app.on('before-quit', event => {
    if (shuttingDown) return;
    event.preventDefault();
    shuttingDown = true;
    void stopBackend().finally(async () => {
      try { await session.fromPartition('persist:homeledger').cookies.flushStore(); }
      catch { log('Could not flush browser session'); }
      finally { app.quit(); }
    });
  });
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
  app.on('activate', () => { if (!window && !shuttingDown) { loadingWindow(); if (origin && child?.exitCode === null) void window.loadURL(`${origin}/dashboard`); else void start(); } });
  app.whenReady().then(() => {
    const ses = session.fromPartition('persist:homeledger');
    ses.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
    ses.setPermissionCheckHandler(() => false);
    ses.on('will-download', (event, item) => {
      if (!origin || !isAppUrl(item.getURL(), origin)) { event.preventDefault(); return; }
      item.setSaveDialogOptions({ title: text('Save file', 'Guardar archivo'), defaultPath: path.join(app.getPath('downloads'), path.basename(item.getFilename())) });
    });
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      ...(process.platform === 'darwin' ? [{ role: 'appMenu' }] : []),
      { label: text('File', 'Archivo'), submenu: [{ label: text('Open data folder', 'Abrir carpeta de datos'), click: () => void shell.openPath(userDir) }, { label: text('Open logs', 'Abrir logs'), click: () => void shell.openPath(path.join(userDir, 'logs')) }, { type: 'separator' }, { role: 'quit' }] },
      { role: 'editMenu' },
      { role: 'viewMenu', submenu: [
        { label: text('Back', 'Atrás'), accelerator: process.platform === 'darwin' ? 'Cmd+[' : 'Alt+Left', click: goBack },
        { label: text('Return to HomeLedger', 'Volver a HomeLedger'), accelerator: 'CommandOrControl+Shift+H', click: returnToApp },
        { type: 'separator' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' }, { role: 'togglefullscreen' },
      ] },
      { role: 'windowMenu' },
      { role: 'help', submenu: [{ label: text('About HomeLedger', 'Acerca de HomeLedger'), click: () => void dialog.showMessageBox({ title: 'HomeLedger', message: `HomeLedger ${app.getVersion()}`, detail: text('Your data are stored on this computer. Background tasks run while the app is open. Update manually from GitHub Releases.', 'Tus datos se guardan en este equipo. Las tareas se ejecutan mientras la app está abierta. Actualiza manualmente desde GitHub Releases.') }) }, { label: text('Documentation', 'Documentación'), click: () => void openExternal('https://github.com/TastingRogue/HomeLedger/blob/main/docs/desktop.md') }] },
    ]));
    return start();
  }).catch(() => { dialog.showErrorBox('HomeLedger', 'Could not initialize HomeLedger. Check folder permissions.'); app.quit(); });
}
