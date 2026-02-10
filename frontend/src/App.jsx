import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Search,
  History as HistoryIcon,
  Download,
  Database,
  Trash2,
  X,
  File,
  Code,
  Table as TableIcon,
  Globe,
  Lock,
  Command,
  ChevronRight,
  Maximize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = import.meta.env.VITE_API_URL || '';

// Utility to flatten nested objects for the table view
const flattenObject = (obj, prefix = '') => {
  return Object.keys(obj).reduce((acc, k) => {
    const pre = prefix.length ? prefix + '_' : '';
    if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
      Object.assign(acc, flattenObject(obj[k], pre + k));
    } else {
      acc[pre + k] = obj[k];
    }
    return acc;
  }, {});
};

function App() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [viewMode, setViewMode] = useState('table'); // 'table', 'json', 'raw'
  const [editableData, setEditableData] = useState({});
  const [showHistory, setShowHistory] = useState(false);
  const fileInputRef = useRef(null);

  // Parse result data whenever it changes
  useEffect(() => {
    if (result) {
      console.log("Parsing result:", result);
      let dataToEdit = {};

      if (result.extractedJson) {
        try {
          const parsed = typeof result.extractedJson === 'string'
            ? JSON.parse(result.extractedJson)
            : result.extractedJson;
          dataToEdit = parsed;
        } catch (e) {
          console.error("Failed to parse extracted JSON", e);
        }
      } else if (result.extracted_data) {
        dataToEdit = result.extracted_data;
      }

      // If it's the table view, we flatten it to make it editable easily
      // Otherwise keep it as is for JSON view
      setEditableData(dataToEdit);
    }
  }, [result]);

  const handleEdit = (key, value) => {
    setEditableData(prev => ({ ...prev, [key]: value }));
  };

  const handleDownload = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(editableData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `extraction_${Date.now()}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setResult(null);
      setEditableData({});
    }
  };

  const handleSubmit = async () => {
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      console.log("Sending to:", `${API_URL}/api/files/upload`);
      const response = await fetch(`${API_URL}/api/files/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      console.log("Received data:", data);
      setResult(data);

      const historyItem = {
        ...data,
        fileName: file.name,
        timestamp: new Date().toLocaleTimeString(),
        id: Date.now()
      };
      setHistory(prev => [historyItem, ...prev]);

    } catch (error) {
      console.error("Extraction error:", error);
      alert("Extraction failed. Check the console or logs.");
    } finally {
      setLoading(false);
    }
  };

  const clearInput = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setEditableData({});
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const loadFromHistory = (item) => {
    setResult(item);
    setFile({ name: item.fileName });
    setPreview(null);
    setShowHistory(false);
  };

  // Prepare table data (flattened)
  const displayEntries = viewMode === 'table' ? Object.entries(flattenObject(editableData)) : [];

  return (
    <div className="min-h-screen bg-[#0A0A0E] text-slate-300 font-sans selection:bg-indigo-500/30 overflow-hidden flex flex-col">

      {/* GLOW DECORATION */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none z-0"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none z-0"></div>

      {/* --- HEADER --- */}
      <header className="relative flex justify-between items-center px-8 py-5 bg-[#121218]/80 backdrop-blur-xl border-b border-white/5 z-50 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 rounded-2xl text-white shadow-lg shadow-indigo-500/20 active:scale-95 transition-transform cursor-pointer">
            <FileText size={22} fill="currentColor" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-black text-white tracking-tight leading-none">TEXTRACT <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">AI</span></h1>
            <span className="text-[9px] text-slate-500 font-mono tracking-[0.3em] uppercase mt-1">Deep Neural Extraction</span>
          </div>
        </div>

        <div className="flex items-center gap-5">
          <div className="hidden md:flex items-center gap-3 bg-white/5 px-4 py-2 rounded-2xl border border-white/5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Core Status: Ready</span>
          </div>

          <button
            onClick={() => setShowHistory(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-2xl border border-indigo-500/20 transition-all active:scale-95 group font-bold text-[11px] uppercase tracking-wider"
          >
            <HistoryIcon size={16} />
            <span>History</span>
            {history.length > 0 && (
              <span className="bg-indigo-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[9px] ml-1 border border-white/10">
                {history.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* --- MAIN LAYOUT --- */}
      <main className="relative flex-1 p-8 overflow-hidden z-10 w-full max-w-[1600px] mx-auto">
        <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* PANEL 1: UPLOAD */}
          <motion.section
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col bg-[#121218] rounded-[32px] border border-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden"
          >
            <div className="p-7 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 rounded-xl">
                  <Upload size={18} className="text-indigo-400" />
                </div>
                <h2 className="font-bold text-white text-lg tracking-tight">Image Portal</h2>
              </div>
              <div className="flex gap-1.5">
                {[1, 2].map(i => <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === 1 ? 'bg-indigo-500' : 'bg-white/10'}`}></div>)}
              </div>
            </div>

            <div className="flex-1 p-8 flex flex-col space-y-8 overflow-hidden">
              <div className="flex-1 relative border-2 border-dashed border-white/10 bg-black/20 rounded-[24px] group transition-all hover:border-indigo-500/40 hover:bg-indigo-500/5 overflow-hidden">
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 z-30 cursor-pointer"
                  accept="image/*,application/pdf"
                />

                {preview ? (
                  <div className="absolute inset-0 z-20 p-6 flex flex-col items-center justify-center">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="relative w-full h-full"
                    >
                      <img src={preview} alt="Preview" className="w-full h-full object-contain rounded-2xl shadow-2xl" />
                      <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-[10px] text-white font-mono">
                        {file.name}
                      </div>
                    </motion.div>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-10 pointer-events-none">
                    <div className="w-20 h-20 bg-indigo-600/10 rounded-3xl flex items-center justify-center mb-6 group-hover:rotate-12 transition-transform duration-500 shadow-inner">
                      <Upload size={32} className="text-indigo-500" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2 tracking-tight">Drop Document</h3>
                    <p className="text-[13px] text-slate-500 max-w-[280px] leading-relaxed">
                      Upload handwritten forms as <span className="text-slate-300">Images or PDF</span> for cloud-neural extraction.
                    </p>
                    <div className="mt-8 flex gap-3">
                      {['JPG', 'PNG', 'PDF'].map(ext => (
                        <span key={ext} className="px-3 py-1 bg-white/5 rounded-lg text-[9px] font-bold text-slate-400 border border-white/5">{ext}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-5">
                <button
                  onClick={handleSubmit}
                  disabled={!file || loading}
                  className={`
                            flex-[2] py-5 rounded-[22px] font-black text-xs tracking-[0.2em] uppercase flex items-center justify-center gap-3 transition-all shadow-2xl shadow-indigo-500/10
                            ${!file || loading
                      ? 'bg-slate-800/50 text-slate-600 cursor-not-allowed border border-white/5'
                      : 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white active:scale-[0.97] border border-white/10'}
                        `}
                >
                  {loading ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} />}
                  {loading ? 'Analyzing...' : 'Execute Extraction'}
                </button>
                <button
                  onClick={clearInput}
                  className="px-8 flex-none py-5 rounded-[22px] font-bold text-[11px] tracking-widest uppercase border border-white/10 text-slate-500 hover:bg-white/5 hover:text-white transition-all active:scale-[0.97]"
                >
                  Reset
                </button>
              </div>
            </div>
          </motion.section>

          {/* PANEL 2: RESULTS */}
          <motion.section
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col bg-[#121218] rounded-[32px] border border-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden"
          >
            <div className="p-7 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-xl">
                  <Database size={18} className="text-emerald-400" />
                </div>
                <h2 className="font-bold text-white text-lg tracking-tight">Result Matrix</h2>
              </div>

              <div className="flex bg-black/30 p-1.5 rounded-2xl border border-white/5 backdrop-blur-md">
                {['table', 'json', 'raw'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`
                                px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all
                                ${viewMode === mode
                        ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                        : 'text-slate-500 hover:text-slate-300'}
                            `}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 p-8 relative flex flex-col min-h-0 bg-transparent">
              {loading && (
                <div className="absolute inset-0 z-40 bg-[#121218]/90 backdrop-blur-xl flex flex-col items-center justify-center p-12 text-center">
                  <div className="w-24 h-24 relative mb-8">
                    <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Search size={28} className="text-indigo-400 animate-pulse" />
                    </div>
                  </div>
                  <h3 className="text-xl font-black text-white mb-3 tracking-tight">NEURAL SCANNING</h3>
                  <p className="text-[13px] text-slate-500 max-w-[280px] leading-relaxed">
                    Processing handwriting with Qwen-2.5-7B-Instruct LLM. Formatting into structured schema...
                  </p>
                </div>
              )}

              {!result && !loading ? (
                <div className="h-full border border-dashed border-white/5 rounded-[24px] flex flex-col items-center justify-center text-center p-12 bg-black/5">
                  <Database size={52} className="text-slate-800 mb-8" />
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em]">Data Buffer: Standby</h3>
                  <p className="text-[12px] text-slate-600 mt-4 max-w-[220px] leading-relaxed">Initiate extraction process to populate the neural result node.</p>
                </div>
              ) : result ? (
                <div className="h-full flex flex-col min-h-0 relative">
                  {/* Status indicators */}
                  <div className="absolute top-2 left-2 z-10 flex gap-2">
                    <div className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest border transition-colors ${result.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                      Status: {result.status}
                    </div>
                  </div>

                  <div className="absolute top-0 right-0 z-30">
                    <button
                      onClick={handleDownload}
                      className="p-3.5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-2xl shadow-2xl transition-all active:scale-90 flex items-center gap-3 group border border-white/10 shadow-indigo-500/20"
                      title="Download Results"
                    >
                      <Download size={18} />
                      <span className="text-[11px] font-black uppercase tracking-widest hidden group-hover:block transition-all">Export</span>
                    </button>
                  </div>

                  <div className="flex-1 mt-14 overflow-y-auto custom-scrollbar pr-4 space-y-5">
                    <AnimatePresence mode="wait">
                      {viewMode === 'table' && (
                        <motion.div
                          key="table"
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.98 }}
                          className="space-y-4"
                        >
                          {displayEntries.length > 0 ? (
                            displayEntries.map(([key, value]) => (
                              <div key={key} className="group relative bg-white/[0.03] border border-white/5 rounded-2xl p-5 transition-all hover:bg-white/[0.05] hover:border-white/10 hover:shadow-xl">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.25em] mb-2.5 block group-hover:text-indigo-400 transition-colors">{key.replace(/_/g, ' ')}</label>
                                <input
                                  type="text"
                                  value={value || ''}
                                  onChange={(e) => handleEdit(key, e.target.value)}
                                  className="w-full bg-transparent text-[15px] text-white font-medium focus:outline-none focus:text-indigo-400 border-b border-transparent focus:border-indigo-500/30 pb-1 transition-all"
                                />
                                <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <ChevronRight size={14} className="text-slate-600" />
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="p-10 text-center border border-white/5 rounded-3xl bg-white/[0.02]">
                              <AlertCircle size={32} className="mx-auto text-slate-700 mb-4" />
                              <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">No Key-Value Pairs Detected</p>
                              <p className="text-[11px] text-slate-600 mt-2">Check the Raw Text or JSON view for unstructured output.</p>
                            </div>
                          )}
                        </motion.div>
                      )}

                      {viewMode === 'json' && (
                        <motion.div
                          key="json"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="bg-black/40 p-7 rounded-[24px] border border-white/5 font-mono text-[13px] text-indigo-300 leading-relaxed shadow-inner overflow-auto max-h-[100%]"
                        >
                          <pre className="whitespace-pre-wrap">{JSON.stringify(editableData, null, 2)}</pre>
                        </motion.div>
                      )}

                      {viewMode === 'raw' && (
                        <motion.div
                          key="raw"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="bg-black/40 p-7 rounded-[24px] border border-white/5 font-mono text-[13px] text-slate-500 leading-relaxed shadow-inner min-h-full"
                        >
                          <p className="whitespace-pre-wrap">{result.rawText || result.raw_text || "Buffer contains no raw telemetry string."}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              ) : null}
            </div>
          </motion.section>
        </div>
      </main>

      {/* --- HISTORY DRAWER --- */}
      <AnimatePresence>
        {showHistory && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistory(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 180 }}
              className="fixed right-0 top-0 bottom-0 w-full sm:w-[450px] bg-[#0F0F13] border-l border-white/5 shadow-[0_0_100px_rgba(0,0,0,0.8)] z-[101] flex flex-col"
            >
              <div className="p-9 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-500/10 rounded-2xl">
                    <HistoryIcon size={20} className="text-indigo-400" />
                  </div>
                  <div className="flex flex-col">
                    <h2 className="text-xl font-black text-white tracking-tight leading-none uppercase">CHRONOS</h2>
                    <span className="text-[10px] text-slate-500 font-mono tracking-widest mt-1">Extraction History</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowHistory(false)}
                  className="w-12 h-12 flex items-center justify-center hover:bg-white/5 rounded-2xl text-slate-500 hover:text-white transition-all active:scale-90"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-9 space-y-5">
                {history.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-20 grayscale scale-90">
                    <HistoryIcon size={64} className="mb-8" />
                    <h3 className="text-sm font-black uppercase tracking-[0.4em] text-white">Chronicle Empty</h3>
                    <p className="text-xs mt-4 text-slate-500 leading-relaxed font-mono">No neural records found in the local telemetry persistent store.</p>
                  </div>
                ) : (
                  history.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      onClick={() => loadFromHistory(item)}
                      className="group relative bg-white/[0.02] border border-white/5 rounded-[24px] p-6 cursor-pointer transition-all hover:bg-white/[0.04] hover:border-indigo-500/30 hover:translate-x-[-8px] hover:shadow-2xl"
                    >
                      <div className="flex gap-5 items-center">
                        <div className="w-14 h-14 bg-slate-800/80 rounded-[18px] group-hover:bg-indigo-600/20 text-slate-600 group-hover:text-indigo-400 flex items-center justify-center transition-all duration-300">
                          <File size={24} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-base font-bold text-white truncate mb-1.5">{item.fileName}</p>
                          <div className="flex items-center gap-3">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tighter">{item.timestamp}</span>
                            <span className="text-slate-700">•</span>
                            <div className="flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                              <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Record Saved</span>
                            </div>
                          </div>
                        </div>
                        <div className="bg-indigo-500/20 p-2 rounded-xl text-indigo-400 group-hover:bg-indigo-500 transition-all group-hover:text-white group-hover:rotate-45">
                          <Maximize2 size={16} />
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              <div className="p-9 border-t border-white/5 bg-black/40">
                <div className="flex justify-between items-center text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">
                  <span>TELEMETRY COUNT</span>
                  <span className="text-white text-lg font-black">{history.length}</span>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* --- FOOTER DECORATION --- */}
      <footer className="relative py-8 px-10 flex justify-between items-center opacity-30 mt-auto border-t border-white/5 bg-black/20">
        <div className="text-[10px] font-mono tracking-[0.5em] text-indigo-400 font-bold">
          SESSION_ID // AX-240-PROT
        </div>
        <div className="flex gap-6 text-slate-500">
          <Globe size={14} className="hover:text-indigo-400 cursor-pointer" />
          <Lock size={14} className="hover:text-indigo-400 cursor-pointer" />
          <Command size={14} className="hover:text-indigo-400 cursor-pointer" />
        </div>
      </footer>
    </div>
  );
}

export default App;
