# Panah X Website - Assets & Licenses

## Libraries Used

### Three.js
- **Source**: https://github.com/mrdoob/three.js
- **Version**: 0.165.0 (via CDN)
- **License**: MIT License
- **Usage**: 3D rendering, WebGL abstraction

### Google Fonts
- **Space Grotesk**: https://fonts.google.com/specimen/Space+Grotesk
  - License: SIL Open Font License 1.1
- **Vazirmatn**: https://github.com/rastikerdar/vazirmatn
  - License: SIL Open Font License 1.1

## Procedural Assets

All 3D geometries, materials, shaders, and particle systems are created procedurally at runtime using Three.js APIs. No external 3D models, textures, or binary assets are loaded.

## Custom Code

All JavaScript, CSS, and HTML in this project is original code written for the Panah X website.

## No External Assets

- No images loaded from external sources
- No 3D models (GLTF, OBJ, etc.)
- No audio files
- No video files
- No external CSS frameworks
- No external JS libraries beyond Three.js (via importmap)

## CDN Dependencies

Three.js is loaded via jsDelivr CDN with importmap. For production offline use, the Three.js module can be downloaded and served locally.

```bash
# To download Three.js locally:
npm pack three@0.165.0
# Or download from: https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js
```