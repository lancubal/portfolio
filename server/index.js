const express = require('express');
const cors = require('cors');
const sessionManager = require('./sessionManager');

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

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
    console.log('Stateful Architecture: Ready.');
});
