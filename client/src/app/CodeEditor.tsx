'use client';

import { useState, useEffect } from 'react';

interface CodeEditorProps {
  isOpen: boolean;
  filename: string;
  initialContent: string;
  onSave: (content: string) => void;
  onClose: () => void;
}

export default function CodeEditor({ isOpen, filename, initialContent, onSave, onClose }: CodeEditorProps) {
  const [content, setContent] = useState(initialContent);

  // Update content when initialContent changes (file loaded)
  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="flex h-[80vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-zinc-200">NANO Editor: {filename}</span>
          </div>
        </div>

        {/* Editor Area */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="flex-1 resize-none bg-zinc-950 p-4 font-mono text-sm text-zinc-300 outline-none focus:ring-0"
          spellCheck="false"
        />

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-zinc-800 bg-zinc-800 px-4 py-3">
          <button
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-700"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(content)}
            className="rounded-md bg-green-600 px-6 py-2 text-sm font-bold text-white hover:bg-green-700"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
