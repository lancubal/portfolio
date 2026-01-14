const express = require('express');
const cors = require('cors');
const sessionManager = require('./sessionManager');
const challengeManager = require('./challengeManager');
const visualizationManager = require('./visualizationManager');

const app = express();
const port = 3001;

app.use(cors({
    origin: 'http://localhost:3000'
}));
app.use(express.json());

// Endpoint to initialize a persistent session
app.post('/start', async (req, res) => {
    try {
        const sessionId = await sessionManager.startSession();
        res.json({ sessionId });
    } catch (error) {
        res.status(500).json({ error: 'Failed to start session', details: error.message });
    }
});

// Endpoint to execute commands in that session
app.post('/exec', async (req, res) => {
    const { sessionId, code } = req.body;
    
    if (!sessionId || !code) {
        return res.status(400).json({ error: 'Missing sessionId or code' });
    }

    try {
        const result = await sessionManager.executeCommand(sessionId, code);
        res.json(result);
    } catch (error) {
        if (error.message === 'Session expired or invalid.') {
            return res.status(404).json({ error: 'Session expired. Please refresh to start a new session.' });
        }
        res.status(500).json({ error: 'Execution failed', details: error.message });
    }
});

// --- CHALLENGE ENDPOINTS ---

app.get('/challenges', (req, res) => {
    res.json(challengeManager.getChallengeList());
});

app.post('/challenge/load', async (req, res) => {
    const { sessionId, challengeId } = req.body;
    try {
        const challenge = await challengeManager.loadChallenge(sessionId, challengeId);
        res.json({ message: `Challenge '${challenge.name}' loaded. Files created.`, files: Object.keys(challenge.files) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/challenge/verify', async (req, res) => {
    const { sessionId } = req.body;
    try {
        const result = await challengeManager.verifyChallenge(sessionId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- STREAMING ENDPOINT (SSE) ---
app.get('/stream', async (req, res) => {
    const { sessionId, vizId } = req.query;

    if (!sessionId || !vizId) {
        return res.status(400).send('Missing sessionId or vizId');
    }

    try {
        // 1. Prepare: Write code & Compile
        // This might take a second, so we await it before starting the stream headers
        const executable = await visualizationManager.prepareVisualization(sessionId, vizId);

        // 2. Setup Headers for SSE
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        
        // 3. Spawn the process
        const child = sessionManager.spawnCommand(sessionId, executable);

        // 4. Pipe stdout to SSE events
        child.stdout.on('data', (chunk) => {
            // We split by newlines to send clean events, or just send the raw chunk
            // Ideally for terminal we want raw, but SSE needs "data: ..." format.
            // We'll base64 encode the chunk to preserve ANSI codes safely through SSE.
            const b64 = chunk.toString('base64');
            res.write(`data: ${b64}\n\n`);
        });

        child.stderr.on('data', (chunk) => {
            // Send stderr as well
            const b64 = chunk.toString('base64');
            res.write(`data: ${b64}\n\n`);
        });

        child.on('close', (code) => {
            res.write('event: close\ndata: closed\n\n');
            res.end();
        });

        // Handle client disconnect
        req.on('close', () => {
            child.kill(); // Kill the process if user leaves
        });

    } catch (error) {
        console.error('Stream error:', error);
        // If headers haven't been sent, send error json
        if (!res.headersSent) {
            res.status(500).json({ error: error.message });
        } else {
            res.end();
        }
    }
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
    console.log('Stateful Architecture: Ready.');
});
