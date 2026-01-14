const { exec } = require('child_process');
const { v4: uuidv4 } = require('uuid');

class SessionManager {
    constructor() {
        // Map stores: sessionId -> { containerId: string, lastActivity: number }
        this.sessions = new Map();
        
        // Garbage Collector Configuration
        this.INACTIVITY_LIMIT_MS = 10 * 60 * 1000; // 10 Minutes
        this.GC_INTERVAL_MS = 60 * 1000; // 1 Minute

        // Start the Janitor
        setInterval(() => this.runGarbageCollector(), this.GC_INTERVAL_MS);
        console.log('[SessionManager] Garbage Collector started.');
    }

    /**
     * Creates a new Docker container for the user session.
     * Uses 'sleep infinity' to keep it alive.
     */
    async startSession() {
        const sessionId = uuidv4();
        const containerName = `session_${sessionId}`;

        // Security: Network none, memory limit, CPU limit
        // We mount /tmp to allow some scratch space if needed, or just rely on the container's overlay fs
        const startCommand = `docker run -d --rm --name ${containerName} --network none --memory 128m --cpus 0.5 python:3.10-alpine sleep infinity`;

        console.log(`[${sessionId}] Starting container...`);

        return new Promise((resolve, reject) => {
            exec(startCommand, (error, stdout, stderr) => {
                if (error) {
                    console.error(`[${sessionId}] Failed to start:`, stderr);
                    return reject(error);
                }

                const containerId = stdout.trim();
                this.sessions.set(sessionId, {
                    containerId: containerId,
                    name: containerName,
                    lastActivity: Date.now()
                });

                console.log(`[${sessionId}] Container started: ${containerId.substring(0, 12)}`);
                resolve(sessionId);
            });
        });
    }

    /**
     * Executes a command inside the user's container.
     */
    async executeCommand(sessionId, code) {
        const session = this.sessions.get(sessionId);
        
        if (!session) {
            throw new Error('Session expired or invalid.');
        }

        // Update heartbeat
        session.lastActivity = Date.now();

        // Escape double quotes to prevent breaking the bash command
        const safeCode = code.replace(/"/g, '\\"');
        
        // We use 'sh -c' to allow shell features like pipes or redirects inside the container
        const execCommand = `docker exec ${session.name} sh -c "${safeCode}"`;

        console.log(`[${sessionId}] Executing: ${code}`);

        return new Promise((resolve, reject) => {
            // Timeout for the execution itself (to prevent infinite loops blocking the node process waiting)
            exec(execCommand, { timeout: 5000 }, (error, stdout, stderr) => {
                if (error) {
                    // Check if it was a timeout from Node's side
                    if (error.killed) {
                        return resolve({ output: stdout, error: 'Timeout: Execution exceeded 5 seconds.' });
                    }
                    // Docker exec returns non-zero exit code if the command inside failed
                    // We treat this as "user error", not "server error"
                    return resolve({ output: stdout, error: stderr || error.message });
                }
                resolve({ output: stdout, error: stderr });
            });
        });
    }

    /**
     * The Janitor: Removes containers that haven't been used recently.
     */
    runGarbageCollector() {
        const now = Date.now();
        let collectedCount = 0;

        this.sessions.forEach((data, sessionId) => {
            if (now - data.lastActivity > this.INACTIVITY_LIMIT_MS) {
                this.terminateSession(sessionId);
                collectedCount++;
            }
        });

        if (collectedCount > 0) {
            console.log(`[GC] Cleaned up ${collectedCount} abandoned sessions.`);
        }
    }

    terminateSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) return;

        console.log(`[${sessionId}] Terminating session (Container: ${session.name})...
`);
        
        // We just need to stop it. The --rm flag on creation handles the removal.
        exec(`docker stop ${session.name}`, (error) => {
            if (error) console.error(`[${sessionId}] Error stopping container:`, error.message);
        });

        this.sessions.delete(sessionId);
    }
}

module.exports = new SessionManager();
