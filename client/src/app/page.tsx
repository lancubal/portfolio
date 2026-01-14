'use client';

import { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import CodeEditor from './CodeEditor';

interface HistoryItem {
  text: string;
  type?: 'cmd' | 'output' | 'error' | 'header' | 'logo' | 'info';
}

export default function Home() {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
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

  // --- PORTFOLIO DATA ---
  const PROJECTS = [
    {
      id: "1",
      name: "RootResume",
      description: "Remote Code Execution Portfolio",
      stack: ["Next.js", "Node.js", "Docker", "AWS"],
      status: "Production-Ready",
      github: "https://github.com/lancubal/portfolio"
    },
    {
      id: "2",
      name: "legacy-migrator",
      description: "Automated tool to migrate legacy apps",
      stack: ["Python", "Bash", "Ansible"],
      status: "Concept",
      github: "https://github.com/lancubal/legacy-migrator"
    }
  ];

  const ABOUT_ME = [
    "I am a Software Engineer specializing in Full Stack Development and Cloud Architecture.",
    "I believe in building systems that are secure by design and delightful to use.",
    "This portfolio is a testament to that: a fully functional RCE environment.",
    "",
    "Contact: agustinlancuba.sistemas@gmail.com"
  ].join('\n');

  // Refs for auto-scrolling and focus
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleTerminalClick = () => {
    inputRef.current?.focus();
  };

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
            { text: "Welcome to RootResume OS v1.0", type: 'header' },
            { text: "Copyright (c) 2026 Agustin Lancuba.", type: 'output' },
            { text: "", type: 'output' },
            { text: "CTF CHALLENGE: find flag.txt in /usr/local/lib/.secret_cache", type: 'error' },
            { text: "Type 'help' for available commands.", type: 'output' },
            { text: "------------------------------------------------------------------", type: 'output' },
            { text: "", type: 'output' }
          ]);
        } else {
          setHistory([{ text: "Error: Failed to initialize session.", type: 'error' }]);
        }
      } catch (err) {
        setHistory([{ text: `Connection Error: ${err instanceof Error ? err.message : 'Unknown error'}`, type: 'error' }]);
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
    
    try {
        const b64 = btoa(content);
        const cmd = `echo "${b64}" | base64 -d > ${editorFilename}`;
        setIsLoading(true);
        setHistory(prev => [...prev, { text: `> Saving ${editorFilename}...`, type: 'output' }]);

        await fetch(`${API_URL}/exec`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, code: cmd }),
        });
        setHistory(prev => [...prev, { text: `> Saved.`, type: 'output' }]);
    } catch (err) {
        setHistory(prev => [...prev, { text: `> Error saving file.`, type: 'error' }]);
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
        setHistory(prev => [...prev, { text: "Error: No active session.", type: 'error' }]);
        return;
    }

    const command = input.trim();
    if (commandHistory.length === 0 || commandHistory[commandHistory.length - 1] !== command) {
        setCommandHistory(prev => [...prev, command]);
    }
    setHistoryIndex(-1);
    setInput('');
    setIsLoading(true);

    setHistory(prev => [...prev, { text: `${username}@portfolio:~$ ${command}`, type: 'cmd' }]);

    // --- Client-Side Commands ---
    if (command === 'about' || command === 'neofetch' || command === 'screenfetch') {
        const logo = [
            "       ▲       ",
            "      / \\      ",
            "     / ▲ \\     ",
            "    / / \\ \\    ",
            "   / /   \\ \\   ",
            "  / /_____\\ \\_ ",
            " /___________/_\\"
        ];

        const info = [
            `USER: ${username}`,
            "OS: RootResume OS (Alpine)",
            "HOST: Portfolio-Runner-v1",
            "UPTIME: 1 hour max",
            "PACKAGES: GCC, Rust, Python, SQLite",
            "SHELL: Custom React-Bash",
            "CPU: 0.5 Virtual Cores",
            "MEMORY: 128MB",
            "ARCH: x86_64",
            "DE: TailwindCSS-v3",
            "WM: NextJS-AppRouter"
        ];

        setHistory(prev => [...prev, { text: "", type: 'output' }]);
        for (let i = 0; i < Math.max(logo.length, info.length); i++) {
            const l = (logo[i] || "").padEnd(18, ' ');
            const r = info[i] || "";
            // We'll format this carefully in the render loop or join it here
            setHistory(prev => [...prev, { text: `${l} ${r}`, type: i < logo.length ? 'logo' : 'output' }]);
        }
        setHistory(prev => [...prev, { text: "", type: 'output' }]);
        
        setIsLoading(false);
        setTimeout(() => inputRef.current?.focus(), 10);
        return;
    }

    if (command === 'help') {
        const helpLines = [
            "Available Commands:",
            "  ls projects    - View my projects",
            "  cat about-me.md- My bio",
            "  visualize <id> - Run algo demo (bubble, selection, quick, pathfinder, dfs)",
            "  challenge      - Enter coding mode",
            "  neofetch       - System info (The cool one)",
            "  clear          - Clear terminal",
            "  [linux]        - Run real commands (ls, python, etc.)"
        ];
        helpLines.forEach(l => pushToHistory(l));
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

    if (command === 'ls projects') {
        pushToHistory(JSON.stringify(PROJECTS, null, 2));
        setIsLoading(false);
        return;
    }

    if (command === 'cat about-me.md') {
        pushToHistory(ABOUT_ME);
        setIsLoading(false);
        return;
    }

    if (command === 'whoami') {
        pushToHistory(username);
        setIsLoading(false);
        return;
    }

    if (command.startsWith('login ')) {
        const name = command.split(' ')[1];
        if (name) {
            setUsername(name);
            pushToHistory(`> Authenticated as: ${name}`);
        }
        setIsLoading(false);
        return;
    }

    if (command === 'challenge') {
        try {
            const res = await fetch(`${API_URL}/challenges`);
            const list = await res.json();
            pushToHistory("\nAvailable Challenges:");
            list.forEach((c: any) => pushToHistory(`${c.id}. ${c.name} - ${c.description}`));
        } catch (e) {
            pushToHistory("Error fetching challenges.", 'error');
        }
        setIsLoading(false);
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
            pushToHistory(`\n${data.message}`);
            pushToHistory("Files: " + data.files.join(', '));
        } catch (e) {
            pushToHistory("Error starting challenge.", 'error');
        }
        setIsLoading(false);
        return;
    }

    if (command.startsWith('edit ')) {
        const filename = command.split(' ')[1];
        if (!filename) return setIsLoading(false);
        try {
            const res = await fetch(`${API_URL}/exec`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, code: `cat ${filename}` })
            });
            const data = await res.json();
            if (data.output) {
                setEditorFilename(filename);
                setEditorContent(data.output);
                setIsEditorOpen(true);
            } else {
                pushToHistory("File not found.", 'error');
            }
        } catch (e) {
            pushToHistory("Error reading file.", 'error');
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
                pushToHistory("\n✅ SUCCESS! Logic fixed.");
                confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
            } else {
                pushToHistory("\n❌ FAILED:", 'error');
                pushToHistory(data.output);
            }
        } catch (e) {
            pushToHistory("Error verifying.", 'error');
        }
        setIsLoading(false);
        return;
    }

    if (command.startsWith('visualize ')) {
        const vizId = command.split(' ')[1];
        pushToHistory(`Starting ${vizId} visualization...`);
        const evtSource = new EventSource(`${API_URL}/stream?sessionId=${sessionId}&vizId=${vizId}`);
        setHistory(prev => [...prev, { text: "", type: 'output' }]); 
        evtSource.onmessage = (event) => {
            const text = atob(event.data);
            setHistory(prev => {
                const newHistory = [...prev];
                newHistory[newHistory.length - 1] = { text, type: 'output' }; 
                return newHistory;
            });
        };
        evtSource.addEventListener('close', () => {
            evtSource.close();
            setIsLoading(false);
            pushToHistory("Finished.");
        });
        evtSource.onerror = () => {
            evtSource.close();
            setIsLoading(false);
            pushToHistory("Stream failed.", 'error');
        };
        return;
    }
    
    // Standard Exec
    try {
      const response = await fetch(`${API_URL}/exec`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, code: command }),
      });
      const data = await response.json();
      pushToHistory(data.error || data.output || "");
    } catch (error) {
      pushToHistory("Network Error", 'error');
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  };

  const pushToHistory = (text: string, type: HistoryItem['type'] = 'output') => {
    setHistory(prev => [...prev, { text, type }]);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-4 font-mono text-sm md:p-10">
      <CodeEditor isOpen={isEditorOpen} filename={editorFilename} initialContent={editorContent} onSave={handleEditorSave} onClose={handleEditorClose} />
      <div className="relative flex h-[80vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-zinc-800 bg-black shadow-2xl" onClick={handleTerminalClick}>
        <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-4 py-2">
          <div className="flex gap-2"><div className="h-3 w-3 rounded-full bg-red-500/80"></div><div className="h-3 w-3 rounded-full bg-yellow-500/80"></div><div className="h-3 w-3 rounded-full bg-green-500/80"></div></div>
          <div className="text-zinc-400">{username}@portfolio: ~</div>
          <div className="w-10"></div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
          {isInitializing && <div className="animate-pulse text-green-500">Booting RootResume OS...</div>}
          {history.map((item, i) => (
            <div key={i} className={`whitespace-pre-wrap break-words leading-relaxed mb-1 ${ 
                item.type === 'cmd' ? 'text-green-400 font-bold' : 
                item.type === 'error' ? 'text-red-400' : 
                item.type === 'header' ? 'text-blue-400 font-bold' : 
                item.type === 'logo' ? 'text-emerald-500' : 
                'text-zinc-300'
            }`}>
              {item.text}
            </div>
          ))}
          {!isInitializing && (
            <form onSubmit={handleSubmit} className="flex items-center">
              <span className="mr-2 text-green-500 shrink-0">{username}@portfolio:~$</span>
              <input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} disabled={isLoading} autoFocus className="w-full flex-1 border-none bg-transparent p-0 text-zinc-100 outline-none focus:ring-0 placeholder-zinc-600" autoComplete="off" spellCheck="false" />
            </form>
          )}
          <div ref={terminalEndRef} className="h-4" />
        </div>
      </div>
    </main>
  );
}
