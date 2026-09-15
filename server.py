import os
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

port = int(os.environ.get("PORT", "8787"))

server = ThreadingHTTPServer(("0.0.0.0", port), SimpleHTTPRequestHandler)
print(f"Panah X server listening on 0.0.0.0:{port}", flush=True)
server.serve_forever()
