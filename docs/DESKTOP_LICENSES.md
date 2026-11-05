# Desktop dependency inventory

Windows x64 preview materials were collected from the upstream distributions and checked against their pinned versions, source checksums and packaged binaries. This record is an engineering inventory, not a legal opinion or certification of other platforms.

## Windows preview materials

The installer contains `resources/runtime/licenses/windows-x64/` with native license texts, a source/binary hash manifest, the canvas Windows SBOM and verified OCR-model provenance. Electron/Chromium license files and Node's license remain included separately; npm package-root notices are in `THIRD-PARTY-NOTICES.txt`.

The companion release download `HomeLedger-1.2.0-windows-source-materials.zip` contains **494 upstream source archives**, build recipes/patches, the manifest and notices. Installing the app does not require downloading the source ZIP. The source files are unmodified. No restriction is imposed on modification/relinking or reverse engineering for debugging modifications to LGPL libraries.

| Component | Version | Windows evidence |
| --- | --- | --- |
| Electron / Chromium | 45.2.2 | Packaged Electron LICENSE and LICENSES.chromium.html |
| Node.js | 22.23.4 | Pinned official archive checksum and NODE-LICENSE.txt |
| npm production dependencies | runtime-lock.json | Generated package-root notices and repository metadata |
| sharp / libvips | 0.35.5 / 8.18.7 | Packaged libvips DLL matches the official x64 web/static distribution byte for byte;28library sources checked against the MXE recipes, including patches and build scripts |
| canvas / Skia | 1.1.0 / b94213a11b3a2edadfae89f0c57a7f4ab72772c9 | Source at canvas tag, Skia/subdependencies at SBOM commits, Rust crate checksums verified, missing crate-root notices recovered from their workspace commits |
| librsvg Rust dependencies | 2.63.2 | Cargo.lock registry checksums verified and source archives included, with upstream license texts |
| PDF.js | 6.5.438 | Package-root notices plus the license files accompanying standard fonts, CMaps and WASM resources |
| Tesseract.js core | 6.1.2 | Source tag, all nine pinned third-party submodules, native copyright/license files |
| English / Spanish OCR models | @tesseract.js-data1.0.0 /4.0.0 models | Decompressed hashes match original naptha/tessdata files; upstream Apache-2.0 model license included alongside wrapper notices |

Reproduce the native source ZIP on Windows with `node packages/desktop/scripts/source-materials.mjs`. It checks every source archive against the reviewed manifest before creating the ZIP. Staging also checks reviewed binary hashes before copying native notices into the runtime; afterPack checks that the Windows materials are present. Regenerate and review these materials when upgrading native dependencies. Do not silently update a source URL or accept a checksum mismatch.

The libxml2 source recipe's2.14directory URL was corrected to the actual2.15directory; its checksum is unchanged. The libtiff OCR submodule was fetched from the libsdl-org mirror at the same commit after GitLab returned406. These changes affect download locations only.

## Remaining platform work

Linux and macOS require their own native artifact/source inventories and platform QA before their installers are distributed. Windows signing and complete stable-release QA remain pending; the public Windows download is an unsigned prerelease for synthetic-data testing.

Primary upstream references:

- [sharp-libvips v1.3.4 recipes and notices](https://github.com/lovell/sharp-libvips/tree/v1.3.4)
- [libvips Windows v8.18.7 build recipes](https://github.com/libvips/build-win64-mxe/tree/v8.18.7)
- [canvas v1.1.0](https://github.com/Brooooooklyn/canvas/tree/v1.1.0)
- [Tesseract core v6.1.2](https://github.com/naptha/tesseract.js-core/tree/v6.1.2)
- [Tesseract model source and Apache license](https://github.com/naptha/tessdata/tree/gh-pages)
