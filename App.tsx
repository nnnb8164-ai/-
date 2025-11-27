
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Background } from './components/Backgrounds';
import SettingsModal from './components/SettingsModal';
import { BackgroundType, FileStatus, ProcessedFile, AIConfig } from './types';
import { processText } from './services/geminiService';
import { removeFillerWords, generateId, downloadFile, formatTextAlgorithmic } from './utils/textUtils';
import { generateWordDocument } from './utils/docxGenerator';
import { Upload, X, FileText, CheckCircle, AlertCircle, Loader2, Download, Settings2, Trash2, Eye, Archive, FileType, Settings, Sparkles, Cpu } from 'lucide-react';
import JSZip from 'jszip';

const App: React.FC = () => {
  const [background, setBackground] = useState<BackgroundType>(BackgroundType.GALAXY);
  const [removeFillers, setRemoveFillers] = useState<boolean>(true);
  const [generateWord, setGenerateWord] = useState<boolean>(true);
  const [useAI, setUseAI] = useState<boolean>(true);
  const [files, setFiles] = useState<ProcessedFile[]>([]);
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // AI Config State
  const [aiConfig, setAiConfig] = useState<AIConfig>(() => {
    // Load from local storage on init
    const saved = localStorage.getItem('app_ai_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure defaults if new fields are missing from old save data
        return {
           targetParagraphLength: 400,
           ...parsed
        }
      } catch (e) { console.error("Failed to parse saved config", e); }
    }
    return {
      provider: 'gemini',
      apiKey: '',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-3.5-turbo',
      targetParagraphLength: 400
    };
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-select the most recently added file or the one being processed
  useEffect(() => {
    if (files.length > 0 && !selectedFileId) {
      setSelectedFileId(files[0].id);
    }
  }, [files.length]);

  // Save config when changed
  const handleConfigSave = (newConfig: AIConfig) => {
    setAiConfig(newConfig);
    localStorage.setItem('app_ai_config', JSON.stringify(newConfig));
  };

  // --- Computed ---
  const activeFile = useMemo(() => files.find(f => f.id === selectedFileId), [files, selectedFileId]);
  
  const progressStats = useMemo(() => {
    const total = files.length;
    if (total === 0) return { total: 0, completed: 0, percent: 0 };
    const completed = files.filter(f => f.status === FileStatus.COMPLETED).length;
    const processing = files.filter(f => f.status === FileStatus.PROCESSING).length;
    const error = files.filter(f => f.status === FileStatus.ERROR).length;
    const percent = Math.round(((completed + error) / total) * 100);
    return { total, completed, processing, percent };
  }, [files]);

  const isAnyProcessing = useMemo(() => 
    isProcessingAll || files.some(f => f.status === FileStatus.PROCESSING), 
  [isProcessingAll, files]);

  // --- Handlers ---

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = event.target.files;
    if (!uploadedFiles) return;

    // Explicitly type file as File
    const newFiles: ProcessedFile[] = Array.from(uploadedFiles).map((file: File) => ({
      id: generateId(),
      originalName: file.name,
      originalContent: '',
      processedContent: null,
      status: FileStatus.READING
    }));

    setFiles(prev => [...prev, ...newFiles]);
    if (newFiles.length > 0) {
      setSelectedFileId(newFiles[0].id); // Switch preview to new file
    }

    // Read content
    Array.from(uploadedFiles).forEach((file: File, index) => {
      const reader = new FileReader();
      const fileId = newFiles[index].id;

      reader.onload = (e) => {
        const content = e.target?.result as string;
        setFiles(prev => prev.map(f => 
          f.id === fileId ? { ...f, originalContent: content, status: FileStatus.IDLE } : f
        ));
      };

      reader.onerror = () => {
        setFiles(prev => prev.map(f => 
          f.id === fileId ? { ...f, status: FileStatus.ERROR, errorMessage: '无法读取文件' } : f
        ));
      };

      reader.readAsText(file);
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const processFile = async (id: string) => {
    const file = files.find(f => f.id === id);
    if (!file || file.status === FileStatus.PROCESSING) return;

    setSelectedFileId(id);
    setFiles(prev => prev.map(f => f.id === id ? { ...f, status: FileStatus.PROCESSING, processingDetail: '等待开始...' } : f));

    try {
      let textToProcess = file.originalContent;

      // 1. Pre-processing (Filler Word Removal)
      // This applies to both AI and Rule-based modes
      if (removeFillers) {
        textToProcess = removeFillerWords(textToProcess);
      }

      let processedText = '';

      // 2. Processing (AI vs Rule-based)
      if (useAI) {
        // AI Logic
        processedText = await processText(textToProcess, aiConfig, (msg) => {
           setFiles(prev => prev.map(f => f.id === id ? { ...f, processingDetail: msg } : f));
        });
      } else {
        // Rule-based Logic
        // Simulate a tiny delay for UX so it doesn't feel instant/glitchy
        await new Promise(r => setTimeout(r, 600));
        processedText = formatTextAlgorithmic(textToProcess);
      }

      setFiles(prev => prev.map(f => 
        f.id === id ? { ...f, status: FileStatus.COMPLETED, processedContent: processedText, processingDetail: undefined } : f
      ));
    } catch (error: any) {
      console.error(error);
      const msg = error.message || '处理失败';
      setFiles(prev => prev.map(f => 
        f.id === id ? { ...f, status: FileStatus.ERROR, errorMessage: msg, processingDetail: undefined } : f
      ));
    }
  };

  const processAllFiles = async () => {
    setIsProcessingAll(true);
    const idleFiles = files.filter(f => f.status === FileStatus.IDLE || f.status === FileStatus.ERROR);
    
    // Process sequentially
    const batchSize = 3;
    for (let i = 0; i < idleFiles.length; i += batchSize) {
      const batch = idleFiles.slice(i, i + batchSize);
      await Promise.all(batch.map(f => processFile(f.id)));
    }
    setIsProcessingAll(false);
  };

  const handleDownload = (file: ProcessedFile) => {
    if (file.processedContent) {
      downloadFile(file.originalName, file.processedContent);
    }
  };

  const handleDownloadAll = async () => {
    const completedFiles = files.filter(f => f.status === FileStatus.COMPLETED && f.processedContent);
    if (completedFiles.length === 0) return;

    const zip = new JSZip();
    
    // Add TXT files
    completedFiles.forEach(file => {
      if (file.processedContent) {
        zip.file(`[排版完成]_${file.originalName}`, file.processedContent);
      }
    });

    // Generate Word Doc if enabled
    if (generateWord) {
      try {
        const wordBlob = await generateWordDocument(completedFiles);
        zip.file(`[合集]新伟哥说国史频道.docx`, wordBlob);
      } catch (e) {
        console.error("Word generation failed:", e);
        alert("Word 文档生成失败，仅下载 TXT。");
      }
    }

    try {
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `排版结果打包_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to zip files", error);
    }
  };

  const handleRemoveFile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row selection
    if (isAnyProcessing) return;
    setFiles(prev => prev.filter(f => f.id !== id));
    if (selectedFileId === id) {
      setSelectedFileId(null);
    }
  };

  const handleClearAll = () => {
    if (isAnyProcessing) return;
    if (window.confirm("确定要清空所有已添加的文件吗？")) {
        setFiles([]);
        setSelectedFileId(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }
  };

  // --- UI Components ---

  const StatusIcon = ({ status }: { status: FileStatus }) => {
    switch (status) {
      case FileStatus.PROCESSING:
        return <Loader2 className="w-5 h-5 animate-spin text-blue-300" />;
      case FileStatus.COMPLETED:
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case FileStatus.ERROR:
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      default:
        return <FileText className="w-5 h-5 text-gray-300" />;
    }
  };

  return (
    <div className="relative min-h-screen text-white font-sans selection:bg-purple-500/50 transition-colors duration-1000 overflow-x-hidden">
      {/* Background Layer */}
      <Background type={background} />

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        config={aiConfig}
        onSave={handleConfigSave}
      />

      {/* Header / Top Right Controls */}
      <div className="fixed top-0 right-0 p-6 flex flex-wrap justify-end gap-4 z-50 w-full md:w-auto pointer-events-none">
        <div className="pointer-events-auto flex gap-4">
          
          {/* Main Settings Button */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center justify-center w-10 h-10 rounded-full border border-white/20 bg-black/60 backdrop-blur-md text-gray-300 hover:text-white hover:bg-black/80 hover:scale-105 hover:border-purple-500 hover:shadow-[0_0_15px_rgba(147,51,234,0.3)] transition-all shadow-lg"
            title="AI 模型设置"
          >
             <Settings className="w-5 h-5" />
          </button>

          {/* AI Toggle */}
          <button
            onClick={() => setUseAI(!useAI)}
            className={`
              flex items-center space-x-2 px-4 py-2 rounded-full border backdrop-blur-md transition-all duration-300 shadow-lg
              ${useAI 
                ? 'bg-blue-600/60 border-blue-400 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]' 
                : 'bg-yellow-600/60 border-yellow-400 text-white shadow-[0_0_15px_rgba(234,179,8,0.5)]'}
            `}
            title={useAI ? "智能模式：使用 Gemini 进行语义重组" : "规则模式：每8句一段，快速合并"}
          >
            {useAI ? <Sparkles className="w-4 h-4" /> : <Cpu className="w-4 h-4" />}
            <span className="text-sm font-medium hidden md:inline">{useAI ? 'AI 智能排版' : '规则快速排版'}</span>
          </button>

          {/* Cleaner Toggle */}
          <button
            onClick={() => setRemoveFillers(!removeFillers)}
            className={`
              flex items-center space-x-2 px-4 py-2 rounded-full border backdrop-blur-md transition-all duration-300 shadow-lg
              ${removeFillers ? 'bg-purple-600/60 border-purple-400 text-white shadow-[0_0_15px_rgba(168,85,247,0.5)]' : 'bg-black/40 border-white/20 text-gray-300 hover:bg-black/60'}
            `}
            title={removeFillers ? "语气词删除：开启 (排版并删除无意义词汇)" : "语气词删除：关闭 (仅重新排版)"}
          >
            <Settings2 className="w-4 h-4" />
            <span className="text-sm font-medium hidden md:inline">{removeFillers ? '语气词过滤: ON' : '语气词过滤: OFF'}</span>
          </button>

          {/* Background Selector */}
          <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg blur opacity-50 group-hover:opacity-100 transition duration-500"></div>
              <select
                value={background}
                onChange={(e) => setBackground(e.target.value as BackgroundType)}
                className="relative bg-black/60 backdrop-blur-md text-white border border-white/20 rounded-lg px-4 py-2 text-sm outline-none hover:bg-black/80 transition-all cursor-pointer appearance-none pr-8 w-32 shadow-lg"
                style={{ textAlignLast: 'center' }}
              >
                {Object.values(BackgroundType).map((bg) => (
                  <option key={bg} value={bg} className="bg-gray-900">{bg}</option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-white/50 text-xs">▼</div>
          </div>
        </div>
      </div>

      {/* Main Content Scrollable Container */}
      <div className="container mx-auto px-4 py-20 flex flex-col items-center min-h-screen">
        
        {/* Title */}
        <div className="text-center mb-10 relative z-10 animate-fade-in-up mt-10">
          <h1 className="text-5xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-200 via-white to-purple-200 mb-4 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
            智能字幕排版助手
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto backdrop-blur-sm rounded-lg p-2 bg-black/20 border border-white/5">
            AI 驱动的断句修复与段落重组工具，自动过滤冗余语气词，让字幕文件瞬间变身精美小说。
          </p>
        </div>

        {/* 1. Upload & File List Card */}
        <div className="w-full max-w-5xl bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[500px] relative z-10 mb-8 ring-1 ring-white/10 animate-fade-in-up">
          
          {/* Toolbar */}
          <div className="flex flex-col md:flex-row items-center justify-between p-4 border-b border-white/10 bg-white/5 gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="file"
                multiple
                accept=".txt"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center space-x-2 bg-blue-600/80 hover:bg-blue-600 text-white px-5 py-2.5 rounded-lg transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:shadow-[0_0_20px_rgba(37,99,235,0.5)] font-medium text-sm"
              >
                <Upload className="w-4 h-4" />
                <span>上传TXT文件</span>
              </button>

              {files.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    disabled={isAnyProcessing}
                    className="flex items-center space-x-2 bg-red-500/10 hover:bg-red-500/30 disabled:opacity-30 disabled:cursor-not-allowed text-red-200 px-5 py-2.5 rounded-lg transition-all border border-red-500/20 font-medium text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>清空列表</span>
                  </button>
              )}
              
              {files.length > 0 && (
                <>
                  <div className="w-px h-8 bg-white/10 mx-2 hidden md:block"></div>

                  <button 
                    onClick={processAllFiles}
                    disabled={isProcessingAll}
                    className={`flex items-center space-x-2 text-white px-5 py-2.5 rounded-lg transition-all shadow-lg font-medium text-sm border 
                    ${isProcessingAll 
                        ? 'bg-gray-600/50 cursor-wait' 
                        : useAI 
                           ? 'bg-purple-600/80 hover:bg-purple-600 shadow-[0_0_15px_rgba(147,51,234,0.3)] border-purple-500/30'
                           : 'bg-yellow-600/80 hover:bg-yellow-600 shadow-[0_0_15px_rgba(234,179,8,0.3)] border-yellow-500/30'
                    }`}
                  >
                    {isProcessingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : (useAI ? <Sparkles className="w-4 h-4" /> : <Cpu className="w-4 h-4" />)}
                    <span>{isProcessingAll ? '正在处理...' : (useAI ? '一键 AI 处理所有' : '一键 规则 处理所有')}</span>
                  </button>

                  <button 
                    onClick={handleDownloadAll}
                    disabled={files.filter(f => f.status === FileStatus.COMPLETED).length === 0}
                    className="flex items-center space-x-2 bg-green-600/80 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-lg transition-all shadow-[0_0_15px_rgba(34,197,94,0.3)] font-medium text-sm border border-green-500/30"
                  >
                    <Archive className="w-4 h-4" />
                    <span>打包下载全部</span>
                  </button>

                  {/* Word Toggle Button */}
                  <button
                    onClick={() => setGenerateWord(!generateWord)}
                    className={`
                      flex items-center space-x-2 px-4 py-2.5 rounded-lg transition-all border text-sm font-medium
                      ${generateWord 
                        ? 'bg-blue-500/20 text-blue-200 border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.2)]' 
                        : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'}
                    `}
                    title="是否同时生成包含封面和目录的 Word 文档"
                  >
                    <FileType className="w-4 h-4" />
                    <span>Word: {generateWord ? 'ON' : 'OFF'}</span>
                  </button>
                </>
              )}
            </div>

            <div className="text-sm text-gray-400">
               已添加 {files.length} 个文件
            </div>
          </div>

          {/* File List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {files.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 opacity-60">
                <FileText className="w-16 h-16 mb-4" />
                <p>拖拽文件到这里，或点击左上角上传</p>
              </div>
            ) : (
              files.map((file) => (
                <div 
                  key={file.id} 
                  onClick={() => setSelectedFileId(file.id)}
                  className={`
                    flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer border
                    ${selectedFileId === file.id 
                      ? 'bg-blue-500/20 border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.2)]' 
                      : 'bg-white/5 hover:bg-white/10 border-white/5 hover:border-white/10'}
                  `}
                >
                  <div className="flex items-center space-x-4 overflow-hidden">
                    <div className={`p-2 rounded-lg ${file.status === FileStatus.COMPLETED ? 'bg-green-500/20' : file.status === FileStatus.PROCESSING ? 'bg-blue-500/20' : 'bg-gray-700/50'}`}>
                      <StatusIcon status={file.status} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className={`font-medium truncate ${selectedFileId === file.id ? 'text-blue-100' : 'text-gray-200'}`}>
                        {file.originalName}
                      </span>
                      <span className="text-xs text-gray-500">
                         {file.status === FileStatus.IDLE && '等待处理'}
                         {file.status === FileStatus.READING && '读取中...'}
                         {file.status === FileStatus.PROCESSING && (file.processingDetail || (useAI ? 'AI 排版中...' : '规则格式化中...'))}
                         {file.status === FileStatus.COMPLETED && '处理完成'}
                         {file.status === FileStatus.ERROR && file.errorMessage}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* View Button (Mobile friendly indicator) */}
                    <button className={`p-2 rounded-full ${selectedFileId === file.id ? 'text-blue-300' : 'text-gray-600'}`}>
                      <Eye className="w-4 h-4" />
                    </button>

                    {file.status === FileStatus.COMPLETED && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDownload(file); }}
                        className="p-2 text-green-400 hover:text-green-300 bg-green-500/10 hover:bg-green-500/30 rounded-full transition-colors"
                        title="下载"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    )}

                    <button 
                      onClick={(e) => handleRemoveFile(file.id, e)}
                      disabled={isAnyProcessing}
                      className={`p-2 rounded-full transition-colors ${isAnyProcessing ? 'text-gray-600 cursor-not-allowed opacity-50' : 'text-gray-500 hover:text-red-400 hover:bg-red-500/10'}`}
                      title="删除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 2. Progress & Preview Dashboard */}
        <div className="w-full max-w-5xl animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          
          {/* Global Progress Bar (Only visible if files exist) */}
          {files.length > 0 && (
            <div className="mb-6 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden">
               <div className="flex justify-between items-end mb-2">
                  <div>
                    <h3 className="text-lg font-semibold text-white">处理进度</h3>
                    <p className="text-sm text-gray-400">
                      {isProcessingAll ? '正在进行批量处理...' : progressStats.percent === 100 ? '所有任务已完成' : '等待开始任务'}
                    </p>
                  </div>
                  <div className="text-2xl font-bold font-mono text-blue-300">
                    {progressStats.percent}%
                  </div>
               </div>
               {/* Bar Track */}
               <div className="w-full h-3 bg-gray-700/50 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500 ease-out relative"
                    style={{ width: `${progressStats.percent}%` }}
                  >
                    {/* Shimmer Effect */}
                    {isProcessingAll && (
                      <div className="absolute inset-0 w-full h-full bg-white/20 animate-[shimmer_2s_infinite] transform -skew-x-12"></div>
                    )}
                  </div>
               </div>
               <div className="flex justify-between mt-2 text-xs text-gray-500 font-mono">
                  <span>总计: {progressStats.total}</span>
                  <span>已完成: {progressStats.completed}</span>
               </div>
            </div>
          )}

          {/* Preview Section */}
          <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl overflow-hidden min-h-[500px] flex flex-col">
            <div className="p-4 border-b border-white/10 bg-white/5 flex justify-between items-center">
               <h2 className="text-lg font-semibold flex items-center">
                 <Eye className="w-5 h-5 mr-2 text-purple-400" />
                 内容预览 & 对比
               </h2>
               {activeFile && (
                 <span className="text-sm text-gray-400 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                   当前文件: {activeFile.originalName}
                 </span>
               )}
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/10">
              
              {/* Left Pane: Original */}
              <div className="flex flex-col h-[500px]">
                <div className="p-3 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-black/20 flex justify-between">
                  <span>原始文本 (字幕格式)</span>
                  {activeFile && removeFillers && <span className="text-purple-400">已应用过滤预览</span>}
                </div>
                <div className="flex-1 relative">
                  {activeFile ? (
                    <textarea 
                      readOnly
                      className="w-full h-full bg-transparent p-4 text-sm text-gray-300 resize-none outline-none font-mono leading-relaxed custom-scrollbar"
                      value={
                         // Show real-time filler removal effect if toggle is ON
                         removeFillers ? removeFillerWords(activeFile.originalContent) : activeFile.originalContent
                      }
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-600 select-none">
                      请选择一个文件进行预览
                    </div>
                  )}
                </div>
              </div>

              {/* Right Pane: Processed */}
              <div className="flex flex-col h-[500px] bg-black/10">
                <div className="p-3 text-xs font-semibold text-green-400 uppercase tracking-wider bg-black/20">
                  {useAI ? 'AI 排版结果' : '规则排版结果'}
                </div>
                <div className="flex-1 relative">
                  {activeFile?.processedContent ? (
                    <textarea 
                      readOnly
                      className="w-full h-full bg-transparent p-4 text-sm text-gray-100 resize-none outline-none font-sans leading-loose custom-scrollbar selection:bg-green-500/30"
                      value={activeFile.processedContent}
                    />
                  ) : activeFile?.status === FileStatus.PROCESSING ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-blue-400 space-y-4">
                      <Loader2 className="w-10 h-10 animate-spin" />
                      <span className="text-sm animate-pulse">{activeFile.processingDetail || (useAI ? 'AI 正在阅读并重组段落...' : '正在进行格式化与分段...')}</span>
                    </div>
                  ) : activeFile?.status === FileStatus.ERROR ? (
                     <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400 space-y-2">
                       <AlertCircle className="w-8 h-8" />
                       <span>处理出错</span>
                       <span className="text-xs opacity-70 px-4 text-center">{activeFile.errorMessage}</span>
                     </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-600 select-none">
                      {activeFile ? '等待处理...' : '暂无内容'}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%) skewX(-12deg); }
          100% { transform: translateX(200%) skewX(-12deg); }
        }
      `}</style>
    </div>
  );
};

export default App;
