const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  let filePath = path.join(__dirname, 'dist', req.url === '/' ? 'index.html' : req.url);
  
  // Se o arquivo não existir, tenta index.html (para SPA routing)
  if (!fs.existsSync(filePath)) {
    filePath = path.join(__dirname, 'dist', 'index.html');
  }
  
  const ext = path.extname(filePath);
  const contentType = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
  }[ext] || 'text/plain';
  
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});
