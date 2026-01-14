const { exec, spawn } = require('child_process');
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

        // CTF Challenge: Injecting a hidden flag
        // The flag contains: "✨ You are a true explorer! Let's build something amazing together. Contact me: agustinlancuba.sistemas@gmail.com" encoded in Base64
        const flagContent = '4pyoIFlvdSBhcmUgYSB0cnVlIGV4cGxvcmVyISBMZXQncyBidWlsZCBzb21ldGhpbmcgYW1hemluZyB0b2dldGhlci4gQ29udGFjdCBtZTogYWd1c3RpbmxhbmN1YmEuc2lzdGVtYXNAZ21haWwuY29t';
        
        // Hide flag in a deep system directory disguised as a config file
        const hiddenPath = '/usr/local/lib/.secret_cache';
        const hiddenFile = 'config.db'; // Camouflage name
        
        // Use custom image 'portfolio-runner' which includes GCC, Rust, Python
        const startCommand = `docker run -d --rm --name ${containerName} --network none --memory 128m --cpus 0.5 portfolio-runner sh -c "mkdir -p ${hiddenPath} && echo '${flagContent}' > ${hiddenPath}/${hiddenFile} && sleep infinity"`;

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
                    cwd: '/home', // Default starting directory
                    lastActivity: Date.now()
                });

                // Create the home directory since it might not exist in alpine basic
                exec(`docker exec ${containerName} mkdir -p /home`);

                console.log(`[${sessionId}] Container started: ${containerId.substring(0, 12)}`);
                resolve(sessionId);
            });
        });
    }

    /**
     * Executes a command inside the user's container and waits for result.
     */
    async executeCommand(sessionId, code) {
        const session = this.sessions.get(sessionId);
        
        if (!session) {
            throw new Error('Session expired or invalid.');
        }

        // Update heartbeat
        session.lastActivity = Date.now();

        // Handle 'cd' commands specifically to persist state
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

        // Standard execution
        const safeCode = code.replace(/"/g, '\\"');
        const execCommand = `docker exec ${session.name} sh -c "cd ${session.cwd} && ${safeCode}"`;

        console.log(`[${sessionId}] Executing in ${session.cwd}: ${code}`);

        return new Promise((resolve, reject) => {
            exec(execCommand, { timeout: 5000 }, (error, stdout, stderr) => {
                if (error) {
                    if (error.killed) {
                        return resolve({ output: stdout, error: 'Timeout: Execution exceeded 5 seconds.' });
                    }
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

        // Warning: spawn arguments are an array.
        // We use 'docker exec -i ...' to keep stdin open if needed, but mainly for streaming stdout
        const safeCode = code.replace(/"/g, '\\"');
        
        // Construct the sh -c command string
        const shellCommand = `cd ${session.cwd} && ${code}`;
        
        console.log(`[${sessionId}] Spawning stream: ${shellCommand}`);

        const child = spawn('docker', ['exec', session.name, 'sh', '-c', shellCommand]);
        return child;
    }

    /**
     * The Janitor: Removes containers that haven't been used recently.
     */

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
