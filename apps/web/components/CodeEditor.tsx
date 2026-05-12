"use client";

import Editor from "@monaco-editor/react";
import { useState, useEffect, useRef } from "react";
import { Play, RotateCcw, Loader2, Terminal } from "lucide-react";

interface CodeEditorProps {
  initialCode: string;
  language: string;
}

export default function CodeEditor({ initialCode, language }: CodeEditorProps) {
  const [code, setCode] = useState(initialCode);
  const [output, setOutput] = useState<string>("");
  const [isRunning, setIsRunning] = useState(false);
  const [pyodide, setPyodide] = useState<any>(null);
  const pyodideLoadingRef = useRef(false);

  useEffect(() => {
    if (language === 'python' && !pyodide && !pyodideLoadingRef.current) {
        pyodideLoadingRef.current = true;
        const script = document.createElement('script');
        script.src = "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js";
        script.async = true;
        script.onload = async () => {
            try {
                // @ts-ignore
                const py = await loadPyodide({
                    indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/"
                });
                setPyodide(py);
            } catch (e) {
                console.error("Failed to load pyodide", e);
                setOutput(`Failed to load Python runtime: ${e instanceof Error ? e.message : String(e)}`);
            } finally {
                pyodideLoadingRef.current = false;
            }
        };
        script.onerror = () => {
            console.error("Failed to load pyodide script");
            setOutput("Failed to load Python runtime script.");
            pyodideLoadingRef.current = false;
        };
        document.body.appendChild(script);
    }
  }, [language, pyodide]);

  const runCode = async () => {
    setIsRunning(true);
    setOutput("");

    if (language === "javascript") {
      try {
        let logs: string[] = [];
        const originalLog = console.log;
        console.log = (...args) => {
          logs.push(args.map(arg => String(arg)).join(" "));
        };
        
        new Function(code)();

        console.log = originalLog;
        setOutput(logs.join("\n") || "Code executed successfully (no output)");
      } catch (error: any) {
        setOutput(`Error: ${error.message}`);
      }
    } else if (language === "python") {
        if (!pyodide) {
            setOutput("Python runtime is still loading... please wait.");
            setIsRunning(false);
            return;
        }
        try {
            // Redirect stdout
            pyodide.setStdout({ batched: (msg: string) => setOutput(prev => prev + msg + "\n") });
            await pyodide.runPythonAsync(code);
        } catch (error: any) {
            setOutput(prev => prev + `\nError: ${error.message}`);
        }
    } else {
        setOutput(`Running ${language} is not supported.`);
    }
    setIsRunning(false);
  };

  const resetCode = () => {
    setCode(initialCode);
    setOutput("");
  };

  return (
    <div className="flex flex-col h-full border border-white/10 rounded-xl overflow-hidden bg-[#0A0A0A] shadow-2xl relative z-10">
      <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5 backdrop-blur-md">
        <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${language === 'python' ? 'bg-yellow-500' : 'bg-blue-500'}`} />
            <div className="text-xs font-mono text-gray-400">main.{language === "javascript" ? "js" : language === "python" ? "py" : language}</div>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={resetCode}
                className="p-1.5 hover:bg-white/10 rounded-md transition-colors text-gray-400 hover:text-white"
                title="Reset Code"
            >
                <RotateCcw className="w-3 h-3" />
            </button>
            <button 
                onClick={runCode}
                disabled={isRunning || (language === "python" && !pyodide)}
                className="flex items-center gap-1.5 px-3 py-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md text-xs font-bold transition-colors"
            >
                {isRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                RUN
            </button>
        </div>
      </div>
      
      <div className="flex-1 min-h-[300px] relative">
        <Editor
          height="100%"
          defaultLanguage={language === "html" ? "html" : language === "python" ? "python" : "javascript"}
          value={code}
          onChange={(value) => setCode(value || "")}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: "var(--font-space)",
            scrollBeyondLastLine: false,
            padding: { top: 16, bottom: 16 },
          }}
        />
      </div>

      <div className="h-48 border-t border-white/10 bg-black/80 backdrop-blur-sm flex flex-col transition-all">
          <div className="px-4 py-2 bg-white/5 border-b border-white/5 text-[10px] font-bold font-mono text-gray-500 uppercase flex justify-between items-center">
              <span className="flex items-center gap-2"><Terminal className="w-3 h-3" /> Console Output</span>
              {language === "python" && !pyodide && <span className="text-yellow-500 flex items-center gap-1"><Loader2 className="w-2 h-2 animate-spin"/> Loading Python...</span>}
          </div>
          <pre className="flex-1 p-4 font-mono text-sm text-gray-300 overflow-auto whitespace-pre-wrap selection:bg-primary/30 selection:text-white hero-scroll">
              {output || <span className="text-gray-700 italic opacity-50">{"// Output will appear here..."}</span>}
          </pre>
      </div>
    </div>
  );
}
