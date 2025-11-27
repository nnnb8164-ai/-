
import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, RefreshCw, Loader2, Check, ChevronRight, ChevronDown, Sliders } from 'lucide-react';
import { AIConfig, AIProvider } from '../types';
import { testConnection } from '../services/geminiService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AIConfig;
  onSave: (newConfig: AIConfig) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, config, onSave }) => {
  const [localConfig, setLocalConfig] = useState<AIConfig>(config);
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<{ success: boolean; message: string } | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  
  // Sync when opening
  useEffect(() => {
    if (isOpen) {
      setLocalConfig({
        ...config,
        targetParagraphLength: config.targetParagraphLength || 400
      });
      setCheckResult(null);
      setAvailableModels([]);
    }
  }, [isOpen, config]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(localConfig);
    onClose();
  };

  const handleCheckConnection = async () => {
    setIsChecking(true);
    setCheckResult(null);
    setAvailableModels([]);
    
    // We pass the local config to test
    const result = await testConnection(localConfig);
    
    setIsChecking(false);
    setCheckResult({ success: result.success, message: result.message || '' });
    
    if (result.success && result.models && result.models.length > 0) {
        setAvailableModels(result.models);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in-up">
      <div className="w-full max-w-md bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden ring-1 ring-white/10 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5 flex-shrink-0">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="bg-blue-500 w-1 h-5 rounded-full"></span>
            AI 模型与处理设置
          </h2>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body - Scrollable */}
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
          
          {/* Section: Paragraph Formatting Settings */}
          <div className="space-y-4 pb-4 border-b border-white/10">
            <div className="flex items-center gap-2 text-white font-medium">
               <Sliders className="w-4 h-4 text-purple-400" />
               处理参数 (Processing)
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs text-gray-400">
                <span>目标段落字数</span>
                <span className="text-purple-300 font-mono">{localConfig.targetParagraphLength} 字</span>
              </div>
              <input 
                type="range"
                min="300"
                max="500"
                step="10"
                value={localConfig.targetParagraphLength || 400}
                onChange={(e) => setLocalConfig({...localConfig, targetParagraphLength: parseInt(e.target.value)})}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
              <div className="flex justify-between text-[10px] text-gray-600">
                <span>300 (短段落)</span>
                <span>500 (长段落)</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                控制 AI 在标准模式下生成段落的大致长度。这只是一个软性建议，AI 会根据语义自动调整。
              </p>
            </div>
          </div>

          {/* Section: AI Provider Settings */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              AI 提供商 (Provider)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                   setLocalConfig({ ...localConfig, provider: 'gemini' });
                   setCheckResult(null);
                   setAvailableModels([]);
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                  localConfig.provider === 'gemini'
                    ? 'bg-blue-600/20 border-blue-500 text-blue-100 shadow-[0_0_15px_rgba(37,99,235,0.2)]'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                }`}
              >
                <span className="font-semibold text-sm">Google Gemini</span>
                <span className="text-[10px] opacity-70 mt-1">系统内置 (默认)</span>
              </button>

              <button
                onClick={() => {
                    setLocalConfig({ ...localConfig, provider: 'custom' });
                    setCheckResult(null);
                    setAvailableModels([]);
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                  localConfig.provider === 'custom'
                    ? 'bg-purple-600/20 border-purple-500 text-purple-100 shadow-[0_0_15px_rgba(147,51,234,0.2)]'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                }`}
              >
                <span className="font-semibold text-sm">自定义 API</span>
                <span className="text-[10px] opacity-70 mt-1">OpenAI 兼容协议</span>
              </button>
            </div>
          </div>

          {/* Conditional Fields */}
          {localConfig.provider === 'gemini' ? (
            <div className="space-y-4">
                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-200/80">
                        <p className="font-medium text-blue-200 mb-1">使用系统默认配置</p>
                        程序将使用内置的 Gemini API Key 进行处理。此模式最稳定，无需额外配置。
                    </div>
                </div>
                
                {/* Connection Check for Gemini */}
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                    <span className="text-sm text-gray-400">服务状态检测</span>
                    <button
                        type="button"
                        onClick={handleCheckConnection}
                        disabled={isChecking}
                        className="text-xs flex items-center gap-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 px-3 py-1.5 rounded border border-blue-500/20 transition-colors disabled:opacity-50"
                    >
                        {isChecking ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                        检查连接
                    </button>
                </div>
                {checkResult && (
                    <div className={`text-xs px-3 py-2 rounded border ${checkResult.success ? 'bg-green-500/10 border-green-500/20 text-green-300' : 'bg-red-500/10 border-red-500/20 text-red-300'} flex items-center gap-2`}>
                        {checkResult.success ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                        {checkResult.message}
                    </div>
                )}
                
                {availableModels.length > 0 && (
                  <div className="space-y-1.5 animate-fade-in-up">
                    <label className="text-xs text-gray-400 block">可用模型列表 (Gemini)</label>
                    <div className="max-h-32 overflow-y-auto bg-black/20 p-2 rounded border border-white/5 custom-scrollbar grid grid-cols-2 gap-2">
                      {availableModels.map(m => (
                        <div key={m} className="text-xs text-gray-300 bg-white/5 px-2 py-1 rounded">
                          {m}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          ) : (
            <div className="space-y-4 animate-fade-in-up">
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400">接口地址 (Base URL)</label>
                <input
                  type="text"
                  value={localConfig.baseUrl}
                  onChange={(e) => setLocalConfig({ ...localConfig, baseUrl: e.target.value })}
                  placeholder="https://api.openai.com/v1"
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all placeholder:text-gray-600"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-gray-400">API 密钥 (Key)</label>
                <input
                  type="password"
                  value={localConfig.apiKey}
                  onChange={(e) => setLocalConfig({ ...localConfig, apiKey: e.target.value })}
                  placeholder="sk-..."
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all placeholder:text-gray-600"
                />
              </div>

              {/* Check Connection Button */}
              <div className="flex flex-col gap-2">
                 <div className="flex items-center gap-2">
                     <button
                        type="button"
                        onClick={handleCheckConnection}
                        disabled={isChecking || !localConfig.apiKey || !localConfig.baseUrl}
                        className="text-xs flex items-center gap-1.5 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded border border-white/10 transition-colors disabled:opacity-50 text-gray-300 hover:text-white"
                     >
                        {isChecking ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                        检查连接 & 获取模型列表
                     </button>
                     
                     {checkResult && (
                        <span className={`text-xs flex items-center gap-1 ${checkResult.success ? 'text-green-400' : 'text-red-400'}`}>
                            {checkResult.success ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                            {checkResult.message}
                        </span>
                     )}
                 </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 flex justify-between">
                    <span>模型名称 (Model Name)</span>
                    {availableModels.length > 0 && <span className="text-green-400">发现 {availableModels.length} 个模型</span>}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    list="model-suggestions"
                    value={localConfig.model}
                    onChange={(e) => setLocalConfig({ ...localConfig, model: e.target.value })}
                    placeholder="例如: gpt-4o, deepseek-chat"
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all placeholder:text-gray-600"
                  />
                  <datalist id="model-suggestions">
                      {availableModels.map((model) => (
                          <option key={model} value={model} />
                      ))}
                  </datalist>
                </div>

                {/* Visible List Selector */}
                {availableModels.length > 0 && (
                  <details className="mt-2 text-xs group">
                    <summary className="cursor-pointer text-gray-400 hover:text-purple-400 list-none flex items-center gap-1">
                       <ChevronRight className="w-3 h-3 group-open:rotate-90 transition-transform" />
                       点此展开查看所有可用模型
                    </summary>
                    <div className="mt-2 max-h-40 overflow-y-auto bg-black/20 p-1 rounded border border-white/5 custom-scrollbar">
                      {availableModels.map(m => (
                        <div 
                          key={m} 
                          className="py-1 px-2 hover:bg-white/10 cursor-pointer rounded text-gray-300 hover:text-white transition-colors"
                          onClick={() => setLocalConfig({...localConfig, model: m})}
                        >
                          {m}
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
              
              <div className="text-[10px] text-gray-500 pt-1">
                注意：请确保所选模型支持 System Prompt，并具有较大的上下文窗口（建议 16k+）。
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-white/5 flex justify-end gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-lg shadow-lg shadow-purple-900/20 transition-all active:scale-95"
          >
            <Save className="w-4 h-4" />
            保存设置
          </button>
        </div>

      </div>
    </div>
  );
};

export default SettingsModal;
