'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [input, setInput] = useState('echo "Hello World" > hello.txt && ls -l');
  const [output, setOutput] = useState<string>('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Initialize Session on Load
  useEffect(() => {
    const initSession = async () => {
      try {
        const res = await fetch('http://localhost:3001/start', { method: 'POST' });
        const data = await res.json();
        if (data.sessionId) {
          setSessionId(data.sessionId);
          setOutput('Connected to Cloud Shell.\nContainer ready.');
        } else {
          setOutput('Failed to initialize session.');
        }
      } catch (err) {
        setOutput(`Connection Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setIsInitializing(false);
      }
    };

    initSession();
  }, []);

  const handleSubmit = async () => {
    if (!sessionId) {
        setOutput("Error: No active session. Please refresh.");
        return;
    }

    setIsLoading(true);
    // Append command to output history (simulated terminal)
    setOutput(prev => prev + `\n\n$ ${input}`);
    
    try {
      const response = await fetch('http://localhost:3001/exec', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId, code: input }),
      });

      const data = await response.json();
      
      if (data.error) {
        setOutput(prev => prev + `\n${data.error}`);
        if (data.output) setOutput(prev => prev + `\n${data.output}`);
      } else {
        setOutput(prev => prev + `\n${data.output}`);
      }
    } catch (error) {
      setOutput(prev => prev + `\nNetwork Error: ${error instanceof Error ? error.message : 'Unknown'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-10 bg-gray-950 text-white font-mono">
      <h1 className="text-3xl font-bold mb-6 text-green-400">RCE Cloud Shell (Persistent)</h1>
      
      <div className="w-full max-w-5xl flex flex-col gap-6">
        
        {/* Terminal Output Area */}
        <div className="w-full h-96 bg-black border border-gray-800 rounded-lg p-4 overflow-y-auto shadow-2xl">
          <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
            {isInitializing ? 'Booting container...' : output}
          </pre>
        </div>

        {/* Input Area */}
        <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-400">Command Input (Alpine Linux Shell):</label>
            <div className="flex gap-4">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    className="flex-1 bg-gray-900 border border-gray-700 rounded-md px-4 py-3 text-white focus:ring-2 focus:ring-green-500 outline-none"
                    placeholder="ls -la"
                    disabled={isLoading || isInitializing}
                />
                <button
                    onClick={handleSubmit}
                    disabled={isLoading || isInitializing}
                    className="bg-green-600 hover:bg-green-700 text-white px-8 py-2 rounded-md font-bold disabled:opacity-50 transition-all"
                >
                    {isLoading ? '...' : 'Run'}
                </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
                Tip: Try <code>touch test.txt</code> then <code>ls</code>. Your files persist until session timeout (10m).
            </p>
        </div>

        {/* Session Info */}
        <div className="text-xs text-gray-600 text-center">
            Session ID: {sessionId || 'Connecting...'}
        </div>
      </div>
    </main>
  );
}
