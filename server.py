import http.server
import socketserver
import os
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from functools import partial

# Constants
PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))
WATCHED_EXTENSIONS = ('.html', '.css', '.js')

class LiveReloadHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    
    def inject_livereload_script(self, content):
        """Injects the LiveReload script into HTML content."""
        livereload_script = """
            <script>
                const evtSource = new EventSource('/livereload');
                evtSource.onmessage = function(event) {
                    if (event.data === 'reload') {
                        window.location.reload();
                    }
                }
            </script>
            </body>
        """
        return content.replace('</body>', livereload_script)

    def handle_livereload_request(self):
        """Handles the LiveReload EventSource connection."""
        self.send_response(200)
        self.send_header('Content-type', 'text/event-stream')
        self.send_header('Cache-Control', 'no-cache')
        self.send_header('Connection', 'keep-alive')
        self.end_headers()
        try:
            while True:
                self.wfile.write(b'data: reload\n\n')
                self.wfile.flush()
        except:
            print("Client disconnected from EventSource")
            return

    def do_GET(self):
        if self.path == '/livereload':
            self.handle_livereload_request()
        elif self.path == '/':
            self.serve_index_with_livereload()
        else:
            super().do_GET()

    def serve_index_with_livereload(self):
        """Serves index.html with injected LiveReload script."""
        self.path = '/index.html'
        f = self.send_head()
        if f:
            try:
                content = f.read().decode('utf-8')
                modified_content = self.inject_livereload_script(content)
                self.wfile.write(modified_content.encode('utf-8'))
            finally:
                f.close()

class FileChangeHandler(FileSystemEventHandler):
    def __init__(self, server):
        self.server = server
        
    def on_modified(self, event):
        if not event.is_directory and event.src_path.endswith(WATCHED_EXTENSIONS):
            print(f"File changed: {event.src_path}")
            self.server.need_reload = True

def run_server():
    """Runs the development server with live reload capability."""
    socketserver.TCPServer.allow_reuse_address = True
    
    with socketserver.TCPServer(("", PORT), partial(LiveReloadHandler), bind_and_activate=False) as httpd:
        httpd.allow_reuse_address = True
        httpd.server_bind()
        httpd.server_activate()
        print(f"Development server running at http://localhost:{PORT}")
        
        # Set up file watching
        observer = Observer()
        handler = FileChangeHandler(httpd)
        observer.schedule(handler, DIRECTORY, recursive=True)
        observer.start()
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            observer.stop()
            print("\nShutting down server...")
        observer.join()

if __name__ == '__main__':
    run_server() 