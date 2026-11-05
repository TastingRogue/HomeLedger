import { parentPort, workerData } from 'node:worker_threads';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createCanvas, DOMMatrix, ImageData, Path2D } from '@napi-rs/canvas';

Object.assign(globalThis, { DOMMatrix, ImageData, Path2D });
const require = createRequire(import.meta.url);
const pdfRoot = path.dirname(require.resolve('pdfjs-dist/package.json'));
try {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task = getDocument({
    data: new Uint8Array(await fs.readFile(workerData.filePath)),
    isEvalSupported: false, useSystemFonts: false,
    standardFontDataUrl: path.join(pdfRoot, 'standard_fonts').replaceAll('\\', '/') + '/',
    cMapUrl: path.join(pdfRoot, 'cmaps').replaceAll('\\', '/') + '/', cMapPacked: true,
    wasmUrl: path.join(pdfRoot, 'wasm').replaceAll('\\', '/') + '/',
  });
  const document = await task.promise;
  const pages = [], texts = [];
  for (let i = 1; i <= Math.min(3, document.numPages); i++) {
    const page = await document.getPage(i);
    if (workerData.directory) {
      const base = page.getViewport({ scale: 200 / 72 });
      const scale = Math.min(1, Math.sqrt(16000000 / (base.width * base.height)));
      const viewport = page.getViewport({ scale: 200 / 72 * scale });
      const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      const file = path.join(workerData.directory, `page-${i}.png`);
      await fs.writeFile(file, canvas.toBuffer('image/png'));
      pages.push(file);
    } else {
      const text = await page.getTextContent();
      texts.push(text.items.map(item => ('str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : '')).join(''));
    }
    page.cleanup();
  }
  await task.destroy();
  parentPort.postMessage({ pages, text: texts.join('\n') });
} catch (error) {
  if (process.env.HOMELEDGER_DESKTOP_DEBUG === '1') console.error(error);
  parentPort.postMessage({ error: 'Could not read this PDF. It may be damaged or password protected.' });
}
