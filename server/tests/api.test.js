jest.mock('uuid', () => ({
    v4: () => 'test-uuid'
}));

const request = require('supertest');
const app = require('../index');
const sessionManager = require('../sessionManager');
const challengeManager = require('../challengeManager');
const visualizationManager = require('../visualizationManager');

jest.mock('../sessionManager');
jest.mock('../challengeManager');
jest.mock('../visualizationManager');

describe('API Endpoints', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('POST /start should return a sessionId', async () => {
        sessionManager.startSession.mockResolvedValue('test-session-id');

        const response = await request(app).post('/start');

        expect(response.statusCode).toBe(200);
        expect(response.body.sessionId).toBe('test-session-id');
    });

    test('POST /exec should return command output', async () => {
        sessionManager.executeCommand.mockResolvedValue({ output: 'hello', error: '' });

        const response = await request(app)
            .post('/exec')
            .send({ sessionId: 'test-id', code: 'echo hello' });

        expect(response.statusCode).toBe(200);
        expect(response.body.output).toBe('hello');
    });

    test('POST /exec should return 404 if session expired', async () => {
        sessionManager.executeCommand.mockRejectedValue(new Error('Session expired or invalid.'));

        const response = await request(app)
            .post('/exec')
            .send({ sessionId: 'expired-id', code: 'ls' });

        expect(response.statusCode).toBe(404);
        expect(response.body.error).toContain('expired');
    });

    test('GET /challenges should return list', async () => {
        challengeManager.getChallengeList.mockReturnValue([{ id: '1', name: 'Test' }]);

        const response = await request(app).get('/challenges');

        expect(response.statusCode).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body[0].name).toBe('Test');
    });

    test('GET /stream should setup SSE headers and start streaming', async () => {
        visualizationManager.prepareVisualization.mockResolvedValue('./app');
        
        const mockChild = {
            stdout: { on: jest.fn() },
            stderr: { on: jest.fn() },
            on: jest.fn((event, cb) => {
                if (event === 'close') {
                    // Simulate process closing after a short delay
                    setTimeout(() => cb(0), 100);
                }
            }),
            kill: jest.fn()
        };
        sessionManager.spawnCommand.mockReturnValue(mockChild);

        const response = await request(app)
            .get('/stream')
            .query({ sessionId: 'test-id', vizId: 'bubble' });

        expect(response.get('Content-Type')).toBe('text/event-stream');
        expect(response.get('Connection')).toBe('keep-alive');
        expect(sessionManager.spawnCommand).toHaveBeenCalledWith('test-id', './app');
    });
});