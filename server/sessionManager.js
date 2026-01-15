const { exec, spawn } = require('child_process');
const { v4: uuidv4 } = require('uuid');

class SessionManager {
    constructor() {
        // Map stores: sessionId -> { containerId, name, cwd, lastActivity, createdAt }
        this.sessions = new Map();
        
        // Configuration
        this.INACTIVITY_LIMIT_MS = 10 * 60 * 1000; // 10 Min (Inactivity)
        this.MAX_LIFETIME_MS = 60 * 60 * 1000;     // 1 Hour (Absolute)
        this.MAX_CONCURRENT_SESSIONS = 10;         // Concurrency limit
        this.GC_INTERVAL_MS = 60 * 1000;           // 1 Minute check

        // Start the Janitor
        this.gcInterval = setInterval(() => this.runGarbageCollector(), this.GC_INTERVAL_MS);
        this.gcInterval.unref(); // Allows the process to exit even if the interval is active
        console.log(`[SessionManager] GC started. Limits: ${this.MAX_CONCURRENT_SESSIONS} containers, 1h max life.`);
    }

    /**
     * Creates a new Docker container.
     * Enforces concurrency limits by evicting the oldest session.
     */
    async startSession() {
        // 1. Eviction Logic: If we are at capacity, kill the oldest session (LRU based on lastActivity)
        if (this.sessions.size >= this.MAX_CONCURRENT_SESSIONS) {
            console.log('[SessionManager] Capacity reached. Evicting oldest session...');
            let oldestSessionId = null;
            let oldestTime = Infinity;

            this.sessions.forEach((data, id) => {
                if (data.lastActivity < oldestTime) {
                    oldestTime = data.lastActivity;
                    oldestSessionId = id;
                }
            });

            if (oldestSessionId) {
                this.terminateSession(oldestSessionId);
            }
        }

        const sessionId = uuidv4();
        const containerName = `session_${sessionId}`;
        const flagContent = '4pyoIFlvdSBhcmUgYSB0cnVlIGV4cGxvcmVyISBMZXQncyBidWlsZCBzb21ldGhpbmcgYW1hemluZyB0b2dldGhlci4gQ29udGFjdCBtZTogYWd1c3RpbmxhbmN1YmEuc2lzdGVtYXNAZ21haWwuY29t';
        const hiddenPath = '/usr/local/lib/.secret_cache';
        const hiddenFile = 'config.db';
        
        const startCommand = `docker run -d --rm --name ${containerName} --network none --memory 128m --cpus 0.5 portfolio-runner sh -c "mkdir -p ${hiddenPath} && echo '${flagContent}' > ${hiddenPath}/${hiddenFile} && sleep infinity"`;

        return new Promise((resolve, reject) => {
            exec(startCommand, (error, stdout, stderr) => {
                if (error) {
                    console.error(`[${sessionId}] Failed to start:`, stderr);
                    return reject(error);
                }

                const containerId = stdout.trim();
                const now = Date.now();
                
                // Create a more traditional Linux home directory structure
                const setupDirsCommand = `docker exec ${containerName} sh -c "mkdir -p /home/guest && cd /home/guest && mkdir .config .local .ssh Desktop Documents Downloads"`;
                exec(setupDirsCommand);

                this.sessions.set(sessionId, {
                    containerId: containerId,
                    name: containerName,
                    cwd: '/home/guest',
                    lastActivity: now,
                    createdAt: now
                });

                console.log(`[${sessionId}] Started. Total active: ${this.sessions.size}`);
                resolve(sessionId);
            });
        });
    }

    /**
     * Executes a command inside the user's container.
     */
    async executeCommand(sessionId, code) {
        const session = this.sessions.get(sessionId);
        if (!session) throw new Error('Session expired or invalid.');

        session.lastActivity = Date.now();

        if (code.trim().startsWith('cd ')) {
            const targetDir = code.trim().substring(3).trim();
            const checkCmd = `docker exec ${session.name} sh -c "cd ${session.cwd} && cd ${targetDir} && pwd"`;
            return new Promise((resolve) => {
                exec(checkCmd, (error, stdout, stderr) => {
                    if (error) {
                        resolve({ output: '', error: `cd: ${targetDir}: No such file or directory` });
                    } else {
                        session.cwd = stdout.trim();
                        resolve({ output: '', error: '' });
                    }
                });
            });
        }

        const safeCode = code.replace(/"/g, '\\"');
        const execCommand = `docker exec ${session.name} sh -c "cd ${session.cwd} && ${safeCode}"`;

        return new Promise((resolve, reject) => {
            exec(execCommand, { timeout: 5000 }, (error, stdout, stderr) => {
                if (error) {
                    if (error.killed) return resolve({ output: stdout, error: 'Timeout: 5s limit reached.' });
                    return resolve({ output: stdout, error: stderr || error.message });
                }
                resolve({ output: stdout, error: stderr });
            });
        });
    }

    /**
     * Spawns a command and returns the process for streaming.
     */
    spawnCommand(sessionId, code) {
        const session = this.sessions.get(sessionId);
        if (!session) throw new Error('Session expired or invalid.');

        session.lastActivity = Date.now();

        // Construct the sh -c command string prepending CWD
        const shellCommand = `cd ${session.cwd} && ${code}`;
        
        console.log(`[${sessionId}] Spawning stream in ${session.cwd}: ${code}`);

        // Use spawn to allow real-time piping of stdout
        const child = spawn('docker', ['exec', session.name, 'sh', '-c', shellCommand]);
        return child;
    }

    /**
     * Executes a command in the background (fire-and-forget).
     */
    executeInBackground(sessionId, code) {
        const session = this.sessions.get(sessionId);
        if (!session) return; // Do nothing if session is invalid

        session.lastActivity = Date.now();
        const shellCommand = `cd ${session.cwd} && ${code}`;
        
        console.log(`[${sessionId}] Spawning background process: ${code}`);

        const child = spawn('docker', ['exec', session.name, 'sh', '-c', shellCommand], {
            detached: true,
            stdio: 'ignore'
        });

        child.unref(); // Allow the parent (our server) to exit independently
    }

    /**
     * Gets file/directory completions for a partial path.
     */
    async getCompletions(sessionId, partial) {
        const session = this.sessions.get(sessionId);
        if (!session) return [];

        // `ls -d` is crucial to list directory names instead of their contents
        // `2>/dev/null` suppresses errors like "No such file or directory"
        const listCommand = `ls -d -- ${partial}* 2>/dev/null`;
        const execCommand = `docker exec ${session.name} sh -c "cd ${session.cwd} && ${listCommand}"`;

        return new Promise((resolve) => {
            exec(execCommand, (error, stdout, stderr) => {
                if (error || stderr) {
                    return resolve([]);
                }
                const completions = stdout.split('\n').filter(Boolean).map(line => line.trim());
                resolve(completions);
            });
        });
    }

    /**
     * The Janitor: Enforces both Inactivity and Absolute Lifetime limits.
     */
    runGarbageCollector() {
        const now = Date.now();
        let collectedCount = 0;

        this.sessions.forEach((data, sessionId) => {
            const isInactive = (now - data.lastActivity > this.INACTIVITY_LIMIT_MS);
            const isTooOld = (now - data.createdAt > this.MAX_LIFETIME_MS);

            if (isInactive || isTooOld) {
                const reason = isTooOld ? 'Life limit' : 'Inactivity';
                console.log(`[GC] Evicting ${sessionId} (${reason})`);
                this.terminateSession(sessionId);
                collectedCount++;
            }
        });

        if (collectedCount > 0) {
            console.log(`[GC] Cleaned up ${collectedCount} sessions.`);
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
