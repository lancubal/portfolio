const express = require('express');
const { exec } = require('child_process'); // Import exec
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
    const { sessionId, code, background } = req.body;
    
    if (!sessionId || !code) {
        return res.status(400).json({ error: 'Missing sessionId or code' });
    }

    try {
        if (background) {
            sessionManager.executeInBackground(sessionId, code);
            // For background commands, we don't wait and respond immediately.
            return res.status(202).json({ message: 'Process started in background' });
        }

        const result = await sessionManager.executeCommand(sessionId, code);
        res.json(result);
    } catch (error) {
        if (error.message === 'Session expired or invalid.') {
            return res.status(404).json({ error: 'Session expired. Please refresh to start a new session.' });
        }
        res.status(500).json({ error: 'Execution failed', details: error.message });
    }
});

app.post('/autocomplete', async (req, res) => {
    const { sessionId, partial } = req.body;
    if (!sessionId || partial === undefined) {
        return res.status(400).json({ error: 'Missing sessionId or partial' });
    }

    try {
        const completions = await sessionManager.getCompletions(sessionId, partial);
        res.json({ completions });
    } catch (error) {
        res.status(500).json({ error: 'Autocomplete failed', details: error.message });
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
        const executable = await visualizationManager.prepareVisualization(sessionId, vizId);
        
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        
        const child = sessionManager.spawnCommand(sessionId, executable);

        child.stdout.on('data', (chunk) => {
            const b64 = chunk.toString('base64');
            res.write(`data: ${b64}\n\n`);
        });

        child.stderr.on('data', (chunk) => {
            const b64 = chunk.toString('base64');
            res.write(`data: ${b64}\n\n`);
        });

        child.on('close', (code) => {
            res.write('event: close\ndata: closed\n\n');
            res.end();
        });

        req.on('close', () => {
            child.kill(); 
        });

    } catch (error) {
        console.error('Stream error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: error.message });
        } else {
            res.end();
        }
    }
});

// --- STATS STREAMING ENDPOINT (SSE for 'top' command) ---
app.get('/stats', async (req, res) => {
    const { sessionId } = req.query;
    if (!sessionId) {
        return res.status(400).send('Missing sessionId');
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let intervalId;
    try {
        const containerName = sessionManager.sessions.get(sessionId).name;
        
        intervalId = setInterval(async () => {
            // docker stats --no-stream --format "{{.CPUPerc}}\t{{.MemUsage}}"
            const statsCommand = `docker stats --no-stream --format "{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}" ${containerName}`;
            const statsResult = await new Promise((resolve) => {
                exec(statsCommand, (error, stdout, stderr) => {
                    if (error) resolve({ error: stderr || error.message });
                    else resolve({ output: stdout });
                });
            });

            if (statsResult.error) {
                res.write(`data: ${Buffer.from(statsResult.error).toString('base64')}\n\n`);
                clearInterval(intervalId);
                return;
            }

            res.write(`data: ${Buffer.from(statsResult.output).toString('base64')}\n\n`);
        }, 1000); // Update every 1 second

        req.on('close', () => {
            clearInterval(intervalId);
            res.end();
        });

    } catch (error) {
        console.error('Stats Stream error:', error);
        if (intervalId) clearInterval(intervalId);
        if (!res.headersSent) {
            res.status(500).json({ error: error.message });
        } else {
            res.end();
        }
    }
});

if (require.main === module) {
    app.listen(port, () => {
        console.log(`Server listening at http://localhost:${port}`);
        console.log('Stateful Architecture: Ready.');
    });
}

module.exports = app;