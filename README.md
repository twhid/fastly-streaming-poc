# fastly-streaming-poc

Node and npm required.

**Quick start**

1. In one terminal
1. `npm install`
1. start test server: `node ./src/delayServer.js`
1. In another terminal: `npm start`
1. In yet another terminal: `curl "http://127.0.0.1:7676/?timeout=5000"`

You should see immediately:
```
<!doctype html>
<!-- stuff -->
```
Then, after 5 seconds, the rest of the response:
```
<html>
    <head><title>Delay Server</title></head>
    <body>
        <h1>Delay Server Response</h1>
        <p>This response was delayed by 5000 milliseconds</p>
        <p>To add a delay, add a 'timeout' query parameter to the URL (e.g., ?timeout=1000)</p>
    </body>
</html>
```
