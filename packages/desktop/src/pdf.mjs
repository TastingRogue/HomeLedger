import { Worker } from 'node:worker_threads';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

function read(filePath, directory) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./pdf-worker.mjs', import.meta.url), { workerData: { filePath, directory } });
    const timeout = setTimeout(() => { void worker.terminate(); reject(new Error('PDF processing timed out')); }, 60000);
    const done = () => clearTimeout(timeout);
    worker.once('message', message => { done(); void worker.terminate(); message.error ? reject(new Error(message.error)) : resolve(message); });
    worker.once('error', error => { done(); reject(error); });
    worker.once('exit', code => { done(); if (code) reject(new Error('PDF worker stopped')); });
  });
}
export function createReaders(ocrImage) {
  return {
    async extractText(filePath) { return (await read(filePath)).text; },
    async ocr(filePath) {
      const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'homeledger-pdf-'));
      try {
        const { pages } = await read(filePath, directory);
        const texts = [];
        for (const file of pages) texts.push(await ocrImage(file));
        return texts.join('\n');
      } finally { await fs.rm(directory, { recursive: true, force: true }); }
    },
  };
}
