const sessionManager = require('../sessionManager');
const { exec, spawn } = require('child_process');

jest.mock('child_process', () => ({
    exec: jest.fn(),
    spawn: jest.fn()
}));

jest.mock('uuid', () => ({
    v4: () => 'test-uuid'
}));

describe('SessionManager', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        sessionManager.sessions.clear();
    });

    test('should start a session and create a container', async () => {
        exec.mockImplementation((cmd, callback) => {
            if (callback) callback(null, 'container-id-123', '');
        });

        const sessionId = await sessionManager.startSession();

        expect(sessionId).toBe('test-uuid');
        expect(sessionManager.sessions.has('test-uuid')).toBe(true);
        const session = sessionManager.sessions.get('test-uuid');
        expect(session.name).toBe('session_test-uuid');
        expect(session.cwd).toBe('/home');
        expect(exec).toHaveBeenCalledWith(expect.stringContaining('docker run -d'), expect.any(Function));
    });

    test('should enforce concurrency limits (eviction)', async () => {
        sessionManager.MAX_CONCURRENT_SESSIONS = 2;
        
        // Mock exec for container starts
        exec.mockImplementation((cmd, callback) => {
            if (callback) callback(null, 'id', '');
        });

        // Pre-fill sessions
        sessionManager.sessions.set('s1', { name: 'n1', lastActivity: 100, createdAt: 100 });
        sessionManager.sessions.set('s2', { name: 'n2', lastActivity: 200, createdAt: 200 });

        // Start 3rd session
        await sessionManager.startSession();

        // Should have evicted 's1' (oldest activity)
        expect(sessionManager.sessions.has('s1')).toBe(false);
        expect(sessionManager.sessions.has('s2')).toBe(true);
        expect(sessionManager.sessions.size).toBe(2);
    });

    test('should execute a standard command', async () => {
        sessionManager.sessions.set('test-uuid', { name: 'n1', cwd: '/home', lastActivity: Date.now() });
        
        exec.mockImplementation((cmd, options, callback) => {
            if (callback) callback(null, 'hello world', '');
        });

        const result = await sessionManager.executeCommand('test-uuid', 'echo "hello world"');

        expect(result.output).toBe('hello world');
        // Updated to match the actual generated docker exec command
        expect(exec).toHaveBeenCalledWith(
            expect.stringContaining('docker exec n1 sh -c \"cd /home && echo \\\"hello world\\\"\"'), 
            expect.objectContaining({ timeout: 5000 }), 
            expect.any(Function)
        );
    });

    test('should handle "cd" command specifically', async () => {
        sessionManager.sessions.set('test-uuid', { name: 'n1', cwd: '/home', lastActivity: Date.now() });
        
        exec.mockImplementation((cmd, callback) => {
            if (callback) callback(null, '/home/tmp', '');
        });

        const result = await sessionManager.executeCommand('test-uuid', 'cd tmp');

        expect(result.output).toBe('');
        const session = sessionManager.sessions.get('test-uuid');
        expect(session.cwd).toBe('/home/tmp');
    });

    test('should terminate a session', () => {
        sessionManager.sessions.set('test-uuid', { name: 'session_test-uuid' });
        
        sessionManager.terminateSession('test-uuid');

        expect(sessionManager.sessions.has('test-uuid')).toBe(false);
        expect(exec).toHaveBeenCalledWith(expect.stringContaining('docker stop session_test-uuid'), expect.any(Function));
    });

    test('should start a session and inject the CTF flag', async () => {
        exec.mockImplementation((cmd, callback) => {
            if (callback) callback(null, 'container-id-123', '');
        });

        await sessionManager.startSession();

        // Verify that the start command includes the hidden path and flag content
        expect(exec).toHaveBeenCalledWith(
            expect.stringContaining('mkdir -p /usr/local/lib/.secret_cache'), 
            expect.any(Function)
        );
        expect(exec).toHaveBeenCalledWith(
            expect.stringContaining('echo \'4pyoIFlvdSBhcmUgYSB0cnVlIGV4cGxvcmVyISBMZXQncyBidWlsZCBzb21ldGhpbmcgYW1hemluZyB0b2dldGhlci4gQ29udGFjdCBtZTogYWd1c3RpbmxhbmN1YmEuc2lzdGVtYXNAZ21haWwuY29t\''), 
            expect.any(Function)
        );
    });

    test('should spawn a command for streaming', () => {
        sessionManager.sessions.set('test-uuid', { name: 'session_test', cwd: '/home/tmp' });
        
        sessionManager.spawnCommand('test-uuid', './my_app');

        expect(spawn).toHaveBeenCalledWith(
            'docker', 
            ['exec', 'session_test', 'sh', '-c', 'cd /home/tmp && ./my_app']
        );
    });

    afterAll(() => {
        if (sessionManager.gcInterval) {
            clearInterval(sessionManager.gcInterval);
        }
    });
});