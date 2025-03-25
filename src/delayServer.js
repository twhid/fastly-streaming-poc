import http from 'http';

const server = http.createServer(async (req, res) => {
    // Parse the URL and query parameters
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);

    // Get the timeout value from query parameters (default to 0 if not provided)
    const timeout = parseInt(parsedUrl.searchParams.get('timeout')) || 0;

    // Basic HTML response
    const html = `
        <html>
            <head><title>Delay Server</title></head>
            <body>
                <h1>Delay Server Response</h1>
                <p>This response was delayed by ${timeout} milliseconds</p>
                <p>To add a delay, add a 'timeout' query parameter to the URL (e.g., ?timeout=1000)</p>
            </body>
        </html>
    `;

    // Set response headers
    res.writeHead(200, {
        'Content-Type': 'text/html',
        'Content-Length': Buffer.byteLength(html),
    });

    // If there's a timeout, wait before sending the response
    console.log(`setting timeout ========> ${timeout}`);
    if (timeout > 0) {
        await new Promise(resolve => setTimeout(resolve, timeout));
    }

    // Send the response
    res.end(html);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log('Add ?timeout=1000 to delay response by 1 second');
});
