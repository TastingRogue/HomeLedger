# Desktop dependency inventory

Reviewed locally on 2026-11-04 for the Windows x64 preview. This is an engineering inventory, not clearance to distribute a stable release. Native dependencies must be checked separately on each target platform.

| Component | Version | Evidence shipped or available | Remaining work |
| --- | --- | --- | --- |
| Electron / Chromium | 45.2.2 | Electron `LICENSE` and `LICENSES.chromium.html` in the packaged application | Confirm both files survive every native artifact format |
| Node.js | 22.23.4 | Official archive pinned by SHA-256; `runtime/NODE-LICENSE.txt` | Verify each platform's archive and resulting installer |
| npm production dependencies | `runtime-lock.json` | Generated `runtime/THIRD-PARTY-NOTICES.txt` includes package license text and repository metadata | This inventory covers package-root notices, not every statically linked library |
| sharp Windows binary | 0.35.5 | Package metadata declares `Apache-2.0 AND LGPL-3.0-or-later`; `versions.json` lists libvips8.18.7 and its bundled libraries | The package-root LICENSE inspected contains Apache text only. Collect the matching native libraries' license/source materials before public distribution |
| canvas native binary | 1.1.0 | `@napi-rs/canvas-win32-x64-msvc/sbom.cdx.json` lists Rust and Skia dependencies with versions/commits | Collect complete corresponding notices, including Skia, fonts, ICU, image codecs and MPL components; resolve entries without a license value |
| PDF.js | 6.5.438 | Installed package license and notices included by staging | Check bundled font/CMap resources against upstream distribution notices |
| Tesseract.js / core | Pinned in runtime lock | Installed package notices, local JS/WASM | Review the core's compiled native dependencies as well as the JS wrapper |
| English / Spanish OCR models | `@tesseract.js-data/*`1.0.0 | Package-root MIT notices and local traineddata archives | Verify provenance and applicable notices for the actual model files; wrapper metadata alone is insufficient |

The canvas SBOM identifies components under MPL-2.0, FTL, ICU, BSD, Apache, MIT, Unicode and image-format-specific licenses. The npm wrapper's MIT declaration must not be used as the license for the entire native binary. The same distinction applies to sharp's wrapper and libvips distribution.

Primary references for completing the inventory:

- [sharp installation and bundled binary documentation](https://sharp.pixelplumbing.com/install/)
- [canvas v1.1.0 source and license](https://github.com/Brooooooklyn/canvas/tree/v1.1.0)
- [Electron licensing](https://www.electronjs.org/docs/latest/tutorial/about)
- [Tesseract model source](https://github.com/naptha/tessdata)

Do not mark the release license gate complete solely because npm audit passes or all package-root LICENSE files have been collected. Track the exact native artifacts and source/notice materials used by each build.
