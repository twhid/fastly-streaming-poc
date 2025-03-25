/// <reference types="@fastly/js-compute" />

const logger = (start: number) => (message: string) => {
    const end = performance.now();
    console.log(`[${(end - start).toFixed(2)}ms] ${message}`);
};

async function handler(event: FetchEvent) {
    const clientReq = event.request;
    const respPromise = fetch(clientReq, { backend: 'origin_0' });
    return streamingResponse(event, respPromise);
}

addEventListener('fetch', event => event.respondWith(handler(event)));

async function streamingResponse(
    event: FetchEvent,
    fetchPromise: Promise<Response>
): Promise<Response> {
    const log = logger(performance.now());

    // Create a custom ReadableStream that will first send our prepended text
    // and then continue with the original response body when it's available
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    // Use waitUntil to keep the service alive until the entire stream is processed
    event.waitUntil(streamProcessingPromise(writer, fetchPromise, log));

    // Return a response immediately with our readable stream
    // This happens before the fetch completes, so the prepended text is sent right away
    return new Response(readable, {
        // We don't know the status yet, so use 200 OK as default
        status: 222,
        statusText: 'OK',
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
            'Transfer-Encoding': 'chunked',
        },
    });
}

// Returns a promise that will resolve when the entire stream is processed
function streamProcessingPromise(
    writer: WritableStreamDefaultWriter,
    fetchPromise: Promise<Response>,
    log: (msg: string) => void
) {
    // Create an async function to handle the stream processing
    return new Promise<void>((resolve, reject) => {
        // Text to prepend to the stream - send this immediately before fetch completes
        const prependText = '<!doctype html>\n<!-- stuff -->\n';
        const processStream = async () => {
            try {
                // Write the prepended text immediately
                await writer.write(new TextEncoder().encode(prependText));
                log(`Initial text written to stream`);

                // Now wait for the fetch to complete
                const response = await fetchPromise;
                log(`Fetch completed with status ${response.status}`);
                // Check if response is compressed
                const contentEncoding = response.headers.get('content-encoding');
                if (contentEncoding) {
                    // If compressed, we'll need to handle differently - for now, just log and continue
                    log(`Response is compressed (${contentEncoding})`);
                }

                const originalBody = response.body;

                // If there's no body, just close the writer
                if (!originalBody) {
                    log(`No response body, closing writer`);
                    await writer.close();
                    resolve();
                    return;
                }

                // Pipe the original body to our writer
                const reader = originalBody.getReader();

                // Read and forward all chunks from the original response body
                let count = 0;
                // eslint-disable-next-line no-constant-condition
                let keepReading = true;
                while (keepReading) {
                    const { done, value } = await reader.read();
                    if (done) {
                        log(`stream complete, closing writer`);
                        await writer.close();
                        resolve();
                        keepReading = false;
                        break;
                    }
                    if (count % 10 === 0) {
                        log(`Writing value to stream >> ${count}`);
                    }
                    await writer.write(value);
                    count++;
                }
            } catch (err) {
                log(`Error processing stream: ${err}`);
                await writer.abort(err);
                reject(err);
            }
        };
        // Start processing the stream
        processStream().catch(reject);
    });
}
