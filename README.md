# Panah X Website

Futuristic 3D landing page for panahx.ir

## Quick Start

```bash
cd ~/panahx-site
python3 -m http.server 8787 --bind 0.0.0.0
```

Then open: `http://localhost:8787` or `http://<your-ip>:8787`

## Features

- **3D Panah Logo**: Procedural icosahedron with glass/metallic materials, inner glow, rotating rings
- **Particle System**: 800-2000 ambient particles with additive blending
- **Post Processing**: Bloom + vignette (disabled on mobile/low-end)
- **Interactions**: Mouse/touch parallax, button ripple, click sound
- **Adaptive Quality**: Auto-detects device capabilities, manual override
- **Mobile Optimized**: Redmi 12 tested, 60fps target
- **Zero Dependencies**: Only Three.js via CDN, all else vanilla

## Structure

```
panahx-site/
├── index.html      # Main HTML with embedded CSS
├── app.js          # Three.js application (ES Module)
├── package.json    # Project metadata
├── ASSETS_LICENSES.md
└── README.md
```

## Commands

```bash
# Development server (port 8787)
python3 -m http.server 8787 --bind 0.0.0.0

# Alternative ports
python3 -m http.server 8080 --bind 0.0.0.0
python3 -m http.server 3000 --bind 0.0.0.0
```

## Network Requirements

- Server binds to `0.0.0.0` (all interfaces)
- Port must be accessible through firewall/CGNAT
- For public access: configure DNS A record to public IPv4
- HTTPS requires reverse proxy (nginx/Caddy) + SSL certs

## Performance

| Device | Particles | Render Scale | Post FX | Est. FPS |
|--------|-----------|--------------|---------|----------|
| Desktop | 2000 | 2.0 | On | 60 |
| Mobile (high) | 1200 | 1.5 | Off | 60 |
| Mobile (low) | 600 | 1.0 | Off | 50+ |
| Reduced Motion | Minimal | 1.0 | Off | 60 |

## Browser Support

- Chrome 80+, Firefox 75+, Safari 14+, Edge 80+
- WebGL 2 required
- ES Modules required
- Import Maps supported (polyfill included in modern browsers)

## License

MIT - See ASSETS_LICENSES.md for third-party licenses.