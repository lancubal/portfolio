'use client';

import { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import CodeEditor from './CodeEditor';

export default function Home() {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [username, setUsername] = useState('guest');
  
  // Command History Navigation
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Environment Configuration
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Editor State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorFilename, setEditorFilename] = useState('');
  const [editorContent, setEditorContent] = useState('');

  // --- PORTFOLIO DATA PLACEHOLDERS ---
  const PROJECTS = [
    {
      id: "1",
      name: "RootResume",
      description: "Remote Code Execution Portfolio (The website you are on!)",
      stack: ["Next.js", "Node.js", "Docker", "AWS"],
      status: "In Development",
      github: "https://github.com/lancubal/portfolio"
    },
    {
      id: "2",
      name: "legacy-migrator",
      description: "Automated tool to migrate legacy PHP apps to modern stacks.",
      stack: ["Python", "Bash", "Ansible"],
      status: "Concept",
      github: "https://github.com/lancubal/legacy-migrator"
    }
  ];

  const ABOUT_ME = [
    "# About Me",
    "",
    "Hi, I'm Agustin Lancuba.",
    "I am a passionate Software Engineer specializing in Full Stack Development and Cloud Architecture.",
    "",
    "## Core Skills",
    "- Backend: Node.js, Python, Go",
    "- Frontend: React, Next.js, Tailwind",
    "- DevOps: Docker, Kubernetes, AWS",
    "",
    "## Philosophy",
    "I believe in building systems that are secure by design and delightful to use.",
    "This portfolio is a testament to that: a fully functional RCE environment running securely in your browser.",
    "",
    "Contact: agustinlancuba.sistemas@gmail.com"
  ].join('\n');

  // Refs for auto-scrolling and focus
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on click anywhere in terminal
  const handleTerminalClick = () => {
    inputRef.current?.focus();
  };

  // Auto-scroll to bottom when history changes
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  // Initialize Session
  useEffect(() => {
    const initSession = async () => {
      try {
        const res = await fetch(`${API_URL}/start`, { method: 'POST' });
        const data = await res.json();
        
        if (data.sessionId) {
          setSessionId(data.sessionId);
          setHistory([
            "Welcome to the Interactive Cloud Shell Portfolio (RootResume).",
            "Copyright (c) 2026 Agustin Lancuba.",
            "",
            "🚨 CTF CHALLENGE ACTIVE 🚨",
            "There is a secret 'flag.txt' hidden somewhere in the /var/lib directory.",
            "Find it, read it, and decode the Base64 content to get my contact info.",
            "",
            "Type 'help' for available commands.",
            "------------------------------------------------------------------",
            ""
          ]);
        } else {
          setHistory(["Error: Failed to initialize session."]);
        }
      } catch (err) {
        setHistory([`Connection Error: ${err instanceof Error ? err.message : 'Unknown error'}`]);
      } finally {
        setIsInitializing(false);
      }
    };

    initSession();
  }, []);

  // --- EDITOR HANDLERS ---
  const handleEditorSave = async (content: string) => {
    setIsEditorOpen(false);
    
    if (!sessionId) return;
    
    // Robust Saving using Base64
    // 1. Encode content to Base64 in browser
    // 2. Send command: echo "B64" | base64 -d > filename
    
    try {
        const b64 = btoa(content);
        const cmd = `echo "${b64}" | base64 -d > ${editorFilename}`;
        
        setIsLoading(true);
        setHistory(prev => [...prev, `> Saving ${editorFilename}...`]);

        await fetch(`${API_URL}/exec`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, code: cmd }),
        });
        setHistory(prev => [...prev, `> Saved.`]);
    } catch (err) {
        setHistory(prev => [...prev, `> Error saving file: ${err instanceof Error ? err.message : 'Unknown'}`]);
    } finally {
        setIsLoading(false);
        setTimeout(() => inputRef.current?.focus(), 10);
    }
  };

  const handleEditorClose = () => {
    setIsEditorOpen(false);
    setTimeout(() => inputRef.current?.focus(), 10);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (commandHistory.length > 0) {
            const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
            setHistoryIndex(newIndex);
            setInput(commandHistory[commandHistory.length - 1 - newIndex]);
        }
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            setInput(commandHistory[commandHistory.length - 1 - newIndex]);
        } else {
            setHistoryIndex(-1);
            setInput('');
        }
    } else if (e.key === 'Enter') {
        handleSubmit();
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!input.trim()) return;
    if (!sessionId) {
        setHistory(prev => [...prev, "Error: No active session. Please refresh."]);
        return;
    }

    const command = input.trim();
    
    // Save to command history (avoid duplicates if same as last)
    if (commandHistory.length === 0 || commandHistory[commandHistory.length - 1] !== command) {
        setCommandHistory(prev => [...prev, command]);
    }
    setHistoryIndex(-1); // Reset index on new command
    
    setInput(''); // Clear input immediately
    setIsLoading(true);

    // Optimistically add command to history
    setHistory(prev => [...prev, `${username}@portfolio:~$ ${command}`]);

    // --- Client-Side Commands ---
    if (command === 'about') {
        const aboutText = [
            "",
            "🏛️  PORTFOLIO ARCHITECTURE (RootResume)",
            "---------------------------",
            "1. Frontend: Next.js 14 + Tailwind CSS",
            "   - Renders this terminal interface.",
            "",
            "2. Backend: Node.js + Express",
            "   - Manages session lifecycle and security.",
            "",
            "3. Execution Engine: Docker (Alpine Linux)",
            "   - You are running inside a real, isolated container.",
            "   - Filesystem changes persist for your session.",
            "",
            "4. Security & Cleanup:",
            "   - Containers are strictly resource-limited.",
            "   - Automatic Garbage Collector kills sessions after 10m inactivity.",
            ""
        ].join('\n');
        
        setHistory(prev => [...prev, aboutText]);
        setIsLoading(false);
        setTimeout(() => inputRef.current?.focus(), 10);
        return;
    }

    if (command === 'help') {
        const helpText = [
            "",
            "Available Commands:",
            "  -- Navigation --",
            "  ls projects    - List my GitHub projects (JSON)",
            "  cat about-me.md- Read my biography",
            "  whoami         - Display current user",
            "  login <name>   - Set your username",
            "",
  -- Visualizations --
            "  visualize <id> - View algorithms in real-time",
            "                   (bubble, selection, quick, pathfinder)",
            "  -- Challenge Mode (Unit Testing) --",
            "  challenge      - List available coding challenges",
            "  start <id>     - Start a specific challenge (e.g., 'start 1')",
            "  edit <file>    - Open GUI Editor for a file (e.g., 'edit calculator.py')",
            "  verify         - Run tests to check your solution",
            "",
            "  -- System --",
            "  about          - View system architecture",
            "  help           - Show this help message",
            "  clear          - Clear terminal history",
            "  [linux]        - Execute standard commands (ls, mkdir, python, etc.)",
            ""
        ].join('\n');

        setHistory(prev => [...prev, helpText]);
        setIsLoading(false);
        setTimeout(() => inputRef.current?.focus(), 10);
        return;
    }

    if (command === 'clear') {
        setHistory([]);
        setIsLoading(false);
        setTimeout(() => inputRef.current?.focus(), 10);
        return;
    }

    // --- Portfolio Navigation Commands ---
    
    if (command === 'ls projects') {
        setHistory(prev => [...prev, JSON.stringify(PROJECTS, null, 2)]);
        setIsLoading(false);
        setTimeout(() => inputRef.current?.focus(), 10);
        return;
    }

    if (command === 'cat about-me.md') {
        setHistory(prev => [...prev, ABOUT_ME]);
        setIsLoading(false);
        setTimeout(() => inputRef.current?.focus(), 10);
        return;
    }

    if (command === 'whoami') {
        setHistory(prev => [...prev, username]);
        setIsLoading(false);
        setTimeout(() => inputRef.current?.focus(), 10);
        return;
    }

    if (command.startsWith('login ')) {
        const newName = command.split(' ')[1];
        if (newName) {
            setUsername(newName);
            setHistory(prev => [...prev, `> User changed to: ${newName}`]);
        } else {
            setHistory(prev => [...prev, "Usage: login <username>"]);
        }
        setIsLoading(false);
        setTimeout(() => inputRef.current?.focus(), 10);
        return;
    }

    // --- CHALLENGE LOGIC ---

    if (command === 'challenge') {
        try {
            const res = await fetch(`${API_URL}/challenges`);
            const list = await res.json();
            const output = list.map((c: any) => `${c.id}. ${c.name} - ${c.description}`).join('\n');
            setHistory(prev => [...prev, "\nAvailable Challenges:", output, "Type 'start <id>' to begin.\n"]);
        } catch (e) {
            setHistory(prev => [...prev, "Error fetching challenges."]);
        }
        setIsLoading(false);
        setTimeout(() => inputRef.current?.focus(), 10);
        return;
    }

    if (command.startsWith('start ')) {
        const id = command.split(' ')[1];
        try {
            const res = await fetch(`${API_URL}/challenge/load`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, challengeId: id })
            });
            const data = await res.json();
            setHistory(prev => [...prev, `\n${data.message}`, "Files: " + data.files.join(', '), "Tip: Type 'edit calculator.py' to fix the bug.\n"]);
        } catch (e) {
            setHistory(prev => [...prev, "Error starting challenge."]);
        }
        setIsLoading(false);
        setTimeout(() => inputRef.current?.focus(), 10);
        return;
    }

    if (command.startsWith('edit ')) {
        const filename = command.split(' ')[1];
        if (!filename) {
            setHistory(prev => [...prev, "Usage: edit <filename>"]);
            setIsLoading(false);
            return;
        }

        // Read file content first
        try {
            const res = await fetch(`${API_URL}/exec`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, code: `cat ${filename}` })
            });
            const data = await res.json();
            
            // Check for errors or empty content
            if (data.error || (data.output && data.output.startsWith('cat:'))) {
                setHistory(prev => [...prev, `Error: Could not read file '${filename}'. Does it exist?`]);
            } else if (!data.output) {
                // Handle empty file case
                 setHistory(prev => [...prev, `Warning: '${filename}' is empty.`]);
                 setEditorFilename(filename);
                 setEditorContent("");
                 setIsEditorOpen(true);
            } else {
                setEditorFilename(filename);
                setEditorContent(data.output);
                setIsEditorOpen(true);
            }
        } catch (e) {
            setHistory(prev => [...prev, "Network error reading file."]);
        }
        
        setIsLoading(false);
        return;
    }

    if (command === 'verify') {
        try {
            const res = await fetch(`${API_URL}/challenge/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId })
            });
            const data = await res.json();
            
            if (data.passed) {
                setHistory(prev => [...prev, "\n✅ TESTS PASSED! Great job!", "CV Download Unlocked (Simulation)\n"]);
                confetti({
                    particleCount: 150,
                    spread: 70,
                    origin: { y: 0.6 }
                });
            } else {
                setHistory(prev => [...prev, "\n❌ TESTS FAILED:", data.output, "\nTry again! Use 'edit calculator.py' to fix the logic.\n"]);
            }
        } catch (e) {
            setHistory(prev => [...prev, "Error running verification."]);
        }
        setIsLoading(false);
        setTimeout(() => inputRef.current?.focus(), 10);
        return;
    }

    // --- VISUALIZATION (SSE) ---
    if (command.startsWith('visualize ')) {
        const vizId = command.split(' ')[1];
        setHistory(prev => [...prev, `Compiling and starting ${vizId} visualization...`]);
        
        const evtSource = new EventSource(`${API_URL}/stream?sessionId=${sessionId}&vizId=${vizId}`);
        
        // We want to update the LAST line of history effectively to simulate animation
        setHistory(prev => [...prev, ""]); 

        evtSource.onmessage = (event) => {
            const text = atob(event.data);
            
            setHistory(prev => {
                const newHistory = [...prev];
                newHistory[newHistory.length - 1] = text; 
                return newHistory;
            });
        };

        evtSource.addEventListener('close', () => {
            evtSource.close();
            setIsLoading(false);
            setHistory(prev => [...prev, "\nVisualization finished."]);
            setTimeout(() => inputRef.current?.focus(), 10);
        });

        evtSource.onerror = () => {
            evtSource.close();
            setIsLoading(false);
            setHistory(prev => [...prev, "Stream connection closed or failed (Check algorithm ID)."]);
            setTimeout(() => inputRef.current?.focus(), 10);
        };

        return;
    }
    
    // --- STANDARD EXECUTION ---
    try {
      const response = await fetch(`${API_URL}/exec`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId, code: command }),
      });

      const data = await response.json();
      
      let outputText = '';
      if (data.error) {
        outputText = data.error;
        if (data.output) outputText += `\n${data.output}`;
      } else {
        outputText = data.output;
      }
      
      // Remove trailing newline for cleaner UI if present
      if (outputText.endsWith('\n')) {
        outputText = outputText.slice(0, -1);
      }

      setHistory(prev => [...prev, outputText]);

    } catch (error) {
      setHistory(prev => [...prev, `Network Error: ${error instanceof Error ? error.message : 'Unknown'}`]);
    } finally {
      setIsLoading(false);
      // Keep focus on input after execution
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-4 font-mono text-sm md:p-10">
      
      {/* Code Editor Modal */}
      <CodeEditor 
        isOpen={isEditorOpen}
        filename={editorFilename}
        initialContent={editorContent}
        onSave={handleEditorSave}
        onClose={handleEditorClose}
      />

      {/* Terminal Window */}
      <div 
        className="relative flex h-[80vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-zinc-800 bg-black shadow-2xl"
        onClick={handleTerminalClick}
      >
        
        {/* Title Bar */}
        <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-4 py-2">
          <div className="flex gap-2">
            <div className="h-3 w-3 rounded-full bg-red-500/80"></div>
            <div className="h-3 w-3 rounded-full bg-yellow-500/80"></div>
            <div className="h-3 w-3 rounded-full bg-green-500/80"></div>
          </div>
          <div className="text-zinc-400">{username}@portfolio: ~</div>
          <div className="w-10"></div> {/* Spacer for centering */}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 text-zinc-300 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
          
          {isInitializing && (
            <div className="animate-pulse text-green-500">Initializing secure environment...</div>
          )}

          {history.map((line, i) => (
            <div key={i} className="whitespace-pre-wrap break-words leading-relaxed mb-1">
              {line}
            </div>
          ))}

          {/* Active Input Line */}
          {!isInitializing && (
            <form onSubmit={handleSubmit} className="flex items-center">
              <span className="mr-2 text-green-500 shrink-0">{username}@portfolio:~$</span>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                autoFocus
                className="w-full flex-1 border-none bg-transparent p-0 text-zinc-100 outline-none focus:ring-0 placeholder-zinc-600"
                autoComplete="off"
                spellCheck="false"
              />
            </form>
          )}

          {/* Spacer to allow scrolling past the bottom */}
          <div ref={terminalEndRef} className="h-4" />
        </div>
      </div>
    </main>
  );
}