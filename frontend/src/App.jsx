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

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// Utility to flatten nested objects for the table view
const flattenObject = (obj, prefix = '') => {
  if (typeof obj !== 'object' || obj === null) return { [prefix || 'value']: obj };

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

      // Handle data from either Backend (extractedJson string) or Direct AI Service (extracted_data object)
      const rawJson = result.extractedJson || result.extracted_data;

      if (rawJson) {
        try {
          const parsed = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
          // We flatten the object immediately so that editing and downloading 
          // are always performed on the same flat structure.
          dataToEdit = flattenObject(parsed);
        } catch (e) {
          console.error("Failed to parse extracted JSON, using raw string if possible", e);
          dataToEdit = { error: "Parse Error", raw_output: rawJson };
        }
      } else if (result.raw_text || result.rawText) {
        dataToEdit = { note: "No structured data found, see raw text." };
      }

      setEditableData(dataToEdit);
    }
  }, [result]);

  const handleEdit = (key, value) => {
    setEditableData(prev => ({ ...prev, [key]: value }));
  };

  const handleDownloadJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(editableData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `extraction_${Date.now()}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleDownloadCSV = () => {
    const entries = Object.entries(editableData);
    if (entries.length === 0) return;

    const csvContent = "data:text/csv;charset=utf-8,"
      + "Field Name,Extracted Value\n"
      + entries.map(([key, val]) => {
        // Escape quotes and wrap in quotes for CSV safety
        const escapedKey = `"${String(key).replace(/"/g, '""')}"`;
        const escapedVal = `"${String(val || '').replace(/"/g, '""')}"`;
        return `${escapedKey},${escapedVal}`;
      }).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `extraction_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
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

  // Prepare table data (editableData is already flattened in useEffect)
  const displayEntries = viewMode === 'table' ? Object.entries(editableData) : [];

  return (
    <div className="min-h-screen bg-[#050508] text-slate-300 font-sans selection:bg-indigo-500/30 overflow-hidden flex flex-col">

      {/* --- DYNAMIC AMBIENT BACKGROUND --- */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <motion.div
          animate={{ scale: [1, 1.2, 1], rotate: [0, 45, 0], opacity: [0.1, 0.15, 0.1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-indigo-600/10 blur-[150px] rounded-full"
        />
        <motion.div
          animate={{ scale: [1.2, 1, 1.2], rotate: [0, -45, 0], opacity: [0.05, 0.1, 0.05] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-purple-600/10 blur-[150px] rounded-full"
        />
      </div>

      {/* --- HEADER --- */}
      <header className="relative flex justify-between items-center px-10 py-6 bg-[#0B0B11]/90 backdrop-blur-2xl border-b border-white/[0.03] z-50 shadow-2xl">
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="flex items-center gap-5"
        >
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 p-3 rounded-2xl text-white shadow-2xl shadow-indigo-500/40 active:scale-95 transition-all cursor-pointer ring-1 ring-white/20">
            <FileText size={22} className="drop-shadow-lg" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-2xl font-black text-white tracking-tight leading-none">TEXTRACT <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent italic">PRO</span></h1>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/50"></div>
              <span className="text-[9px] text-slate-500 font-mono tracking-[0.4em] uppercase">ADVANCED NEURAL INTELLIGENCE</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="flex items-center gap-6"
        >


          <button
            onClick={() => setShowHistory(true)}
            className="flex items-center gap-3 px-6 py-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-2xl border border-indigo-500/20 transition-all active:scale-95 group font-bold text-[11px] uppercase tracking-[0.15em]"
          >
            <HistoryIcon size={16} className="group-hover:rotate-[-45deg] transition-transform" />
            <span>Archive</span>
            {history.length > 0 && (
              <span className="bg-indigo-500 text-white min-w-[20px] px-1 h-5 rounded-full flex items-center justify-center text-[9px] font-black ml-1 border border-white/20">
                {history.length}
              </span>
            )}
          </button>
        </motion.div>
      </header>

      {/* --- MAIN DISPLAY --- */}
      <main className="relative flex-1 flex flex-col p-8 md:p-12 overflow-hidden z-10 w-full max-w-[1700px] mx-auto">
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-10 min-h-0">

          {/* PANEL 1: INGESTION */}
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-4 flex flex-col bg-[#0F0F16]/60 rounded-[40px] border border-white/[0.04] shadow-[0_40px_100px_rgba(0,0,0,0.5)] backdrop-blur-xl overflow-hidden"
          >
            <div className="p-8 border-b border-white/[0.04] flex justify-between items-center bg-white/[0.01]">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-indigo-500/10 rounded-2xl border border-indigo-500/10">
                  <Upload size={18} className="text-indigo-400" />
                </div>
                <div>
                  <h2 className="font-black text-white text-sm uppercase tracking-[0.2em]">Source Terminal</h2>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">INPUT_READY // WAITING</p>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-white/[0.05]"></div>
              </div>
            </div>

            <div className="flex-1 p-8 p flex flex-col space-y-8 min-h-0">
              <div className="flex-1 relative border-2 border-dashed border-white/[0.06] bg-black/40 rounded-[30px] group transition-all hover:border-indigo-500/40 hover:bg-indigo-500/[0.02] flex items-center justify-center overflow-hidden">
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 z-30 cursor-pointer"
                  accept="image/*,application/pdf"
                />

                <AnimatePresence mode="wait">
                  {preview ? (
                    <motion.div
                      key="preview"
                      initial={{ opacity: 0, scale: 1.1 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="absolute inset-0 z-20 p-6 flex flex-col items-center justify-center"
                    >
                      <img src={preview} alt="Preview" className="w-full h-full object-contain rounded-2xl shadow-2xl drop-shadow-[0_0_30px_rgba(99,102,241,0.2)]" />
                      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-white/10 text-[10px] text-white font-mono tracking-wider shadow-2xl whitespace-nowrap">
                        FILENAME: {file.name.toUpperCase()}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col items-center justify-center text-center p-10 pointer-events-none"
                    >
                      <div className="w-24 h-24 bg-indigo-900/10 rounded-[35px] flex items-center justify-center mb-8 relative group-hover:scale-110 transition-transform duration-700">
                        <div className="absolute inset-0 bg-indigo-500/5 blur-2xl rounded-full"></div>
                        <Upload size={36} className="text-indigo-500 relative z-10" />
                      </div>
                      <h3 className="text-2xl font-black text-white mb-3 tracking-tighter">DATA INGESTION</h3>
                      <p className="text-[12px] text-slate-500 max-w-[240px] leading-relaxed font-medium">
                        Feed the neural engine a <span className="text-indigo-400 font-bold italic">Visual Scan</span> or <span className="text-indigo-400 font-bold italic">Document Vector</span>.
                      </p>
                      <div className="mt-10 flex gap-2">
                        {['X-RAY', 'VECTOR', 'BINARY'].map(ext => (
                          <span key={ext} className="px-4 py-1.5 bg-white/[0.03] rounded-xl text-[9px] font-black text-slate-500 border border-white/[0.05] tracking-widest">{ext}</span>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleSubmit}
                  disabled={!file || loading}
                  className={`
                    flex-[2] py-6 rounded-[24px] font-black text-xs tracking-[0.25em] uppercase flex items-center justify-center gap-4 transition-all shadow-2xl
                    ${!file || loading
                      ? 'bg-slate-900/40 text-slate-700 cursor-not-allowed border border-white/[0.02]'
                      : 'bg-gradient-to-r from-indigo-700 to-indigo-500 hover:from-indigo-600 hover:to-indigo-400 text-white active:scale-[0.96] border border-white/10 shadow-indigo-900/20 hover:shadow-indigo-500/30'}
                  `}
                >
                  {loading ? <Loader2 size={18} className="animate-spin text-white/50" /> : <Search size={18} className="drop-shadow-lg" />}
                  {loading ? 'PROCESSING...' : 'INITIATE NEURAL PARSE'}
                </button>
                <button
                  onClick={clearInput}
                  className="px-10 flex-none py-6 rounded-[24px] font-black text-[10px] tracking-[0.2em] uppercase border border-white/[0.04] text-slate-500 hover:bg-white/[0.04] hover:text-white transition-all active:scale-[0.96]"
                >
                  PURGE
                </button>
              </div>
            </div>
          </motion.section>

          {/* PANEL 2: INTELLIGENCE */}
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-8 flex flex-col bg-[#0F0F16]/60 rounded-[40px] border border-white/[0.04] shadow-[0_40px_100px_rgba(0,0,0,0.5)] backdrop-blur-xl overflow-hidden"
          >
            <div className="p-8 border-b border-white/[0.04] flex justify-between items-center bg-white/[0.01]">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-emerald-500/10 rounded-2xl border border-emerald-500/10">
                  <Database size={18} className="text-emerald-400" />
                </div>
                <div>
                  <h2 className="font-black text-white text-sm uppercase tracking-[0.2em]">Data Telemetry</h2>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">SYNAPSE_LINK // STABLE</p>
                </div>
              </div>

              <div className="flex bg-black/40 p-1.5 rounded-[20px] border border-white/[0.04] backdrop-blur-md">
                {['table', 'json', 'raw'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`
                      px-6 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all duration-300
                      ${viewMode === mode
                        ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-600/40 ring-1 ring-white/20'
                        : 'text-slate-500 hover:text-slate-200'}
                    `}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 p-8 relative flex flex-col min-h-0 bg-transparent overflow-hidden">
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-40 bg-[#0F0F16]/40 backdrop-blur-3xl flex flex-col items-center justify-center p-12 text-center"
                  >
                    <div className="relative w-32 h-32 mb-10 flex items-center justify-center">
                      <div className="absolute inset-0 border-[3px] border-indigo-500/10 rounded-full scale-110"></div>
                      <div className="absolute inset-0 border-[3px] border-indigo-500/10 rounded-full scale-125"></div>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 border-t-[3px] border-indigo-400 rounded-full shadow-[0_0_20px_rgba(99,102,241,0.4)]"
                      />
                      <Search size={32} className="text-indigo-400 animate-pulse relative z-10" />
                    </div>
                    <h3 className="text-3xl font-black text-white mb-4 tracking-tighter uppercase italic">Scanning_Vortex</h3>
                    <p className="text-[13px] text-slate-500 max-w-[320px] leading-relaxed font-mono tracking-tight">
                      Interpreting human handwriting with <span className="text-indigo-400">next-generation intelligence</span>.
                    </p>
                  </motion.div>
                ) : !result ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="h-full border border-dashed border-white/[0.04] rounded-[35px] flex flex-col items-center justify-center text-center p-16 bg-black/[0.1]"
                  >
                    <div className="mb-10 opacity-10">
                      <div className="relative">
                        <Database size={84} className="text-white" />
                        <div className="absolute -top-4 -right-4">
                          <AlertCircle size={32} className="text-indigo-500" />
                        </div>
                      </div>
                    </div>
                    <h3 className="text-sm font-black text-slate-500 uppercase tracking-[0.4em]">Synapse Buffer: Offline</h3>
                    <p className="text-[13px] text-slate-600 mt-6 max-w-[280px] leading-relaxed font-medium italic italic">
                      Initialize a vision scan from the Source Terminal to populate the telemetry node.
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="h-full flex flex-col min-h-0 relative"
                  >
                    <div className="flex justify-between items-center mb-8 px-2">
                      <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border transition-all ${result.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                        STATE: {result.status}
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={handleDownloadJSON}
                          className="flex items-center gap-3 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl shadow-xl transition-all active:scale-95 group border border-white/10"
                        >
                          <Download size={16} />
                          <span className="text-[11px] font-black uppercase tracking-widest">JSON</span>
                        </button>
                        <button
                          onClick={handleDownloadCSV}
                          className="flex items-center gap-3 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl shadow-xl transition-all active:scale-95 group border border-white/10"
                        >
                          <TableIcon size={16} />
                          <span className="text-[11px] font-black uppercase tracking-widest">CSV</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-5 pb-10">
                      <AnimatePresence mode="wait">
                        {viewMode === 'table' && (
                          <motion.div
                            key="table"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="w-full"
                          >
                            {displayEntries.length > 0 ? (
                              <div className="overflow-hidden rounded-[30px] border border-white/[0.05] bg-black/40 backdrop-blur-md">
                                <table className="w-full border-collapse">
                                  <thead>
                                    <tr className="bg-white/[0.03] text-left border-b border-white/[0.05]">
                                      <th className="px-10 py-6 text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">Synapse_Field</th>
                                      <th className="px-10 py-6 text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">Decoded_Value</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-white/[0.03]">
                                    {displayEntries.map(([key, value], idx) => (
                                      <motion.tr
                                        key={key}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.03, ease: "easeOut" }}
                                        className="group hover:bg-indigo-500/[0.03] transition-all duration-300"
                                      >
                                        <td className="px-10 py-5 align-top">
                                          <div className="flex items-center gap-3">
                                            <div className="w-1 h-4 bg-indigo-500/30 rounded-full group-hover:bg-indigo-500 transition-colors"></div>
                                            <span className="text-[12px] font-black text-indigo-400 font-mono uppercase tracking-tight break-all">{key}</span>
                                          </div>
                                        </td>
                                        <td className="px-10 py-5">
                                          <input
                                            type="text"
                                            value={value || ''}
                                            onChange={(e) => handleEdit(key, e.target.value)}
                                            className="w-full bg-transparent text-[14px] text-white font-medium focus:outline-none focus:text-indigo-400 border-b border-white/5 focus:border-indigo-500/50 transition-all pb-1.5"
                                          />
                                        </td>
                                      </motion.tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <div className="p-20 text-center border border-dashed border-white/[0.05] rounded-[35px] bg-black/[0.1]">
                                <AlertCircle size={44} className="mx-auto text-slate-700 mb-6" />
                                <p className="text-slate-500 font-black uppercase text-xs tracking-[0.3em]">No Neural Links Detected</p>
                                <p className="text-[12px] font-medium text-slate-600 mt-4 leading-relaxed max-w-[280px] mx-auto opacity-70">
                                  Telemetery node yielded no structured key-pairs. Verify the Source Terminal binary.
                                </p>
                              </div>
                            )}
                          </motion.div>
                        )}



                        {viewMode === 'json' && (
                          <motion.div
                            key="json"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="bg-black/60 p-10 rounded-[35px] border border-white/[0.04] font-mono text-[14px] text-indigo-300 leading-[1.8] shadow-2xl relative overflow-hidden h-full"
                          >
                            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                              <Code size={120} />
                            </div>
                            <pre className="relative z-10 whitespace-pre-wrap">{JSON.stringify(editableData, null, 2)}</pre>
                          </motion.div>
                        )}

                        {viewMode === 'raw' && (
                          <motion.div
                            key="raw"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="bg-black/60 p-10 rounded-[35px] border border-white/[0.04] font-mono text-[12px] text-slate-500 leading-[2] tracking-tight min-h-full"
                          >
                            <p className="whitespace-pre-wrap">{result.rawText || result.raw_text || "TELEMETRY_STREAM: NULL"}</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
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
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100]"
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full sm:w-[500px] bg-[#0A0A0F] border-l border-white/[0.03] shadow-[0_0_100px_rgba(0,0,0,0.9)] z-[101] flex flex-col"
            >
              <div className="p-10 border-b border-white/[0.05] flex justify-between items-center bg-white/[0.01]">
                <div className="flex items-center gap-5">
                  <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                    <HistoryIcon size={20} className="text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white tracking-tighter uppercase italic">The_Chronicle</h2>
                    <p className="text-[10px] text-indigo-500/60 font-mono tracking-[0.4em] mt-1 font-bold">HISTORICAL_TELEMETRY</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowHistory(false)}
                  className="w-14 h-14 flex items-center justify-center hover:bg-white/[0.03] rounded-2xl text-slate-500 hover:text-white transition-all active:scale-90"
                >
                  <X size={28} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-10 space-y-6">
                {history.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-10 py-20 grayscale">
                    <HistoryIcon size={84} className="mb-10" />
                    <h3 className="text-sm font-black uppercase tracking-[0.5em] text-white">Archives_Empty</h3>
                    <p className="text-xs mt-6 text-slate-500 leading-relaxed font-mono font-bold">Zero neural fragments detected in the current local persistent node.</p>
                  </div>
                ) : (
                  history.map((item, idx) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={() => loadFromHistory(item)}
                      className="group relative bg-[#12121A] border border-white/[0.03] rounded-[30px] p-7 cursor-pointer transition-all hover:bg-indigo-500/[0.03] hover:border-indigo-500/30 hover:translate-x-[-10px] hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]"
                    >
                      <div className="flex gap-6 items-center">
                        <div className="w-16 h-16 bg-slate-900 border border-white/[0.02] rounded-2xl group-hover:border-indigo-500/30 text-slate-700 group-hover:text-indigo-400 flex items-center justify-center transition-all duration-500">
                          <FileText size={28} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-lg font-bold text-white truncate mb-2 tracking-tight">{item.fileName.split('.')[0].toUpperCase()}</p>
                          <div className="flex items-center gap-4">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono italic">{item.timestamp}</span>
                            <div className="w-1 h-1 rounded-full bg-slate-800"></div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest font-mono">PARSED_OK</span>
                            </div>
                          </div>
                        </div>
                        <ChevronRight size={20} className="text-slate-800 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              <div className="p-10 border-t border-white/[0.05] bg-black/40">
                <div className="flex justify-between items-center text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] font-mono">
                  <span>VECTORS_STORED</span>
                  <span className="text-white text-3xl font-black italic">{history.length}</span>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* --- FOOTER DECORATION --- */}
      <footer className="relative py-10 px-12 flex justify-between items-center bg-[#050510] border-t border-white/[0.02] z-50">
        <div className="flex items-center gap-10">
          <div className="text-[11px] font-mono tracking-[0.6em] text-indigo-600 font-black flex items-center gap-4">
            <span className="opacity-40">SESSION_ID</span>
            <span className="bg-indigo-500/10 px-3 py-1 rounded-lg border border-indigo-500/10">AX-240-PROT</span>
          </div>
          <div className="hidden md:flex items-center gap-4 border-l border-white/[0.04] pl-10">
            <div className="w-2 h-2 rounded-full bg-emerald-500/40"></div>
            <span className="text-[10px] font-mono text-slate-600 font-bold uppercase tracking-widest">Global Neural Sync Active</span>
          </div>
        </div>
        <div className="flex gap-8 text-slate-700">
          {[Globe, Lock, Command].map((Icon, i) => (
            <Icon key={i} size={15} className="hover:text-indigo-500 cursor-pointer transition-colors hover:scale-125 duration-300" />
          ))}
        </div>
      </footer>

      {/* --- GLOBAL STYLES --- */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(99, 102, 241, 0.3); }
        
        @keyframes vortex {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        input::selection { background: rgba(99, 102, 241, 0.5); color: white; }
      `}</style>
    </div>
  );
}

export default App;
