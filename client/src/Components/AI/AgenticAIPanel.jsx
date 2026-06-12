import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Bot, 
  Send, 
  Zap, 
  Code, 
  Search, 
  Bug, 
  Lightbulb, 
  CheckCircle,
  Settings,
  Trash2,
  Copy,
  Share2,
  Loader
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import useAgenticAI from '../../hooks/useAgenticAI';
import { AI_ACTIONS } from '../../services/githubAI';
import toast from 'react-hot-toast';

const AgenticAIPanel = ({ 
  isOpen, 
  onClose, 
  currentCode = '', 
  currentLanguage = 'javascript',
  problemStatement = '',
  socket,
  roomId,
  username,
  userRole 
}) => {
  const [input, setInput] = useState('');
  const [selectedAction, setSelectedAction] = useState(AI_ACTIONS.GENERAL);
  const [showSettings, setShowSettings] = useState(false);
  const [errorDescription, setErrorDescription] = useState('');
  const messagesEndRef = useRef(null);

  const {
    loading,
    conversations,
    currentModel,
    availableModels,
    usageStats,
    isEnabled,
    healthInfo,
    checkAIService,
    getAIAssistance,
    cancelRequest,
    clearHistory,
    removeConversation,
    setCurrentModel,
    aiActions
  } = useAgenticAI();

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversations]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() && selectedAction === AI_ACTIONS.GENERAL) return;
    if (!isEnabled) {
      toast.error('AI assistant is not available');
      return;
    }

    const result = await getAIAssistance({
      action: selectedAction,
      prompt: input.trim(),
      code: currentCode,
      language: currentLanguage,
      problemStatement,
      errorDescription: errorDescription.trim(),
      context: problemStatement
    });

    if (result) {
      setInput('');
      setErrorDescription('');
    }
  };

  const handleQuickAction = (action, prompt = '') => {
    if (!isEnabled) {
      toast.error('AI assistant is not available');
      return;
    }

    setSelectedAction(action);
    setInput(prompt);
    
    // Auto-submit for actions that don't need additional input
    if ([AI_ACTIONS.ANALYZE, AI_ACTIONS.OPTIMIZE, AI_ACTIONS.EXPLAIN].includes(action) && currentCode) {
      setTimeout(() => {
        getAIAssistance({
          action,
          prompt: prompt || `Please ${action} this code`,
          code: currentCode,
          language: currentLanguage,
          problemStatement
        });
      }, 100);
    }
  };

  const shareConversation = (conversation) => {
    if (!socket || !roomId) {
      toast.error('Cannot share - not connected to room');
      return;
    }

    const message = `🤖 **AI Assistant (${conversation.modelInfo?.name || conversation.model}):**\n\n${conversation.response}`;
    socket.emit('send-message', message);
    toast.success('AI suggestion shared with participants');
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Copied to clipboard');
    }).catch(() => {
      toast.error('Failed to copy');
    });
  };

  const actionButtons = [
    { action: AI_ACTIONS.ANALYZE, icon: Search, label: 'Analyze Code', color: 'blue', prompt: 'Analyze this code for quality and improvements' },
    { action: AI_ACTIONS.DEBUG, icon: Bug, label: 'Debug Issue', color: 'red', prompt: 'Help me debug this code' },
    { action: AI_ACTIONS.OPTIMIZE, icon: Zap, label: 'Optimize', color: 'yellow', prompt: 'Optimize this code for better performance' },
    { action: AI_ACTIONS.EXPLAIN, icon: Lightbulb, label: 'Explain Code', color: 'purple', prompt: 'Explain how this code works' },
    { action: AI_ACTIONS.COMPLETE, icon: CheckCircle, label: 'Complete', color: 'green', prompt: 'Help me complete this code' },
    { action: AI_ACTIONS.REVIEW, icon: Code, label: 'Review', color: 'indigo', prompt: 'Review this code like in an interview' }
  ];

  const markdownComponents = {
    code({ node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <SyntaxHighlighter
          style={tomorrow}
          language={match[1]}
          PreTag="div"
          customStyle={{
            borderRadius: '8px',
            fontSize: '14px',
            margin: '16px 0'
          }}
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code className="bg-blue-300 px-2 py-1 rounded text-sm font-mono" {...props}>
          {children}
        </code>
      );
    }
  };

  if (!isEnabled) {
    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white rounded-xl shadow-xl p-8 mx-4 max-w-md text-center"
            >
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bot className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">AI Assistant Unavailable</h3>
              <p className="text-gray-600 mb-2 text-sm">
                {healthInfo?.message ||
                  (healthInfo?.hasToken === false
                    ? 'GITHUB_TOKEN is missing in server/.env. Add your GitHub Models token and restart the server.'
                    : healthInfo?.aiEnabledFlag === false
                      ? 'Set AI_ENABLED=true in server/.env and restart the server.'
                      : healthInfo?.aiEnabled === false
                        ? 'API is reachable but AI is disabled. Check AI_ENABLED and GITHUB_TOKEN in server/.env, then restart.'
                        : 'Cannot reach the API at ' +
                          (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000') +
                          '. Make sure `cd server && npm run dev` is running (port 3000 must be free).')}
              </p>
              <p className="text-gray-500 mb-4 text-xs">
                After editing server/.env, stop the server (Ctrl+C) and run npm run dev again.
              </p>
              <div className="flex gap-2 justify-center">
                <button
                  type="button"
                  onClick={() => checkAIService()}
                  className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
                >
                  Retry
                </button>
                <button
                  onClick={onClose}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col mx-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-xl">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Bot className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Agentic AI Coding Assistant
                  </h2>
                  <p className="text-sm text-gray-600">
                    {availableModels[currentModel]?.name || currentModel} • {usageStats.totalRequests} requests
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
                  title="Settings"
                >
                  <Settings className="w-5 h-5" />
                </button>

                {conversations.length > 0 && (
                  <button
                    onClick={clearHistory}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                    title="Clear history"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}

                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Settings Panel */}
            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  className="bg-gray-50 border-b border-gray-200 overflow-hidden"
                >
                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          AI Model
                        </label>
                        <select
                          value={currentModel}
                          onChange={(e) => setCurrentModel(e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                        >
                          {Object.entries(availableModels).map(([id, model]) => (
                            <option key={id} value={id}>
                              {model.name} ({model.provider})
                            </option>
                          ))}
                        </select>
                        <div className="text-xs text-gray-600 mt-1">
                          {availableModels[currentModel]?.description}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Context Status
                        </label>
                        <div className="space-y-2 text-xs">
                          <div className={`flex items-center space-x-2 ${currentCode ? 'text-green-600' : 'text-gray-500'}`}>
                            <div className={`w-2 h-2 rounded-full ${currentCode ? 'bg-green-500' : 'bg-gray-300'}`} />
                            <span>Code: {currentCode ? `${currentCode.length} chars` : 'Not available'}</span>
                          </div>
                          <div className={`flex items-center space-x-2 ${problemStatement ? 'text-green-600' : 'text-gray-500'}`}>
                            <div className={`w-2 h-2 rounded-full ${problemStatement ? 'bg-green-500' : 'bg-gray-300'}`} />
                            <span>Problem: {problemStatement ? 'Available' : 'Not set'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Quick Actions */}
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Actions</h3>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                {actionButtons.map(({ action, icon: Icon, label, color, prompt }) => (
                  <button
                    key={action}
                    onClick={() => handleQuickAction(action, prompt)}
                    disabled={loading}
                    className={`p-3 rounded-lg border transition-all hover:shadow-sm disabled:opacity-50 ${
                      selectedAction === action
                        ? `bg-${color}-50 border-${color}-200 text-${color}-700`
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-4 h-4 mx-auto mb-1" />
                    <div className="text-xs font-medium">{label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Conversations */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mb-4">
                    <Bot className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    AI Coding Assistant Ready
                  </h3>
                  <p className="text-gray-600 max-w-md mb-6">
                    Ask questions about your code, request analysis, debugging help, or optimizations. 
                    I can see your current code and problem context.
                  </p>
                  <div className="grid grid-cols-2 gap-4 max-w-lg text-sm">
                    {actionButtons.slice(0, 4).map(({ action, icon: Icon, label, color }) => (
                      <div key={action} className={`text-center p-3 bg-${color}-50 rounded-lg`}>
                        <Icon className={`w-6 h-6 mx-auto mb-2 text-${color}-600`} />
                        <div className={`font-medium text-${color}-900`}>{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                conversations.map((conversation) => (
                  <ConversationMessage
                    key={conversation.id}
                    conversation={conversation}
                    onShare={shareConversation}
                    onRemove={removeConversation}
                    onCopy={copyToClipboard}
                    markdownComponents={markdownComponents}
                    canShare={!!(socket && roomId)}
                  />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-gray-200 p-4">
              {selectedAction === AI_ACTIONS.DEBUG && (
                <div className="mb-3">
                  <input
                    type="text"
                    value={errorDescription}
                    onChange={(e) => setErrorDescription(e.target.value)}
                    placeholder="Describe the error or issue you're seeing..."
                    className="w-full p-2 text-sm border border-orange-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-orange-50"
                  />
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex space-x-3">
                <div className="flex-1 text-black">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={
                      selectedAction === AI_ACTIONS.GENERAL 
                        ? "Ask me anything about coding, algorithms, or your current problem..."
                        : `Ask about ${selectedAction} for your code...`
                    }
                    disabled={loading}
                    className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                    rows={2}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                        handleSubmit(e);
                      }
                    }}
                  />
                  <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                    <span>Press Ctrl+Enter to send</span>
                    {selectedAction !== AI_ACTIONS.GENERAL && (
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        Mode: {selectedAction}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col space-y-2">
                  <button
                    type="submit"
                    disabled={loading || (!input.trim() && selectedAction === AI_ACTIONS.GENERAL)}
                    className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${
                      loading || (!input.trim() && selectedAction === AI_ACTIONS.GENERAL)
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 text-black hover:bg-blue-700 shadow-sm hover:shadow-md'
                    }`}
                  >
                    {loading ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Ask AI</span>
                      </>
                    )}
                  </button>

                  {loading && (
                    <button
                      type="button"
                      onClick={cancelRequest}
                      className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Conversation Message Component
const ConversationMessage = ({ conversation, onShare, onRemove, onCopy, markdownComponents, canShare }) => {
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionIcon = (action) => {
    const icons = {
      [AI_ACTIONS.ANALYZE]: Search,
      [AI_ACTIONS.DEBUG]: Bug,
      [AI_ACTIONS.OPTIMIZE]: Zap,
      [AI_ACTIONS.EXPLAIN]: Lightbulb,
      [AI_ACTIONS.COMPLETE]: CheckCircle,
      [AI_ACTIONS.REVIEW]: Code,
      [AI_ACTIONS.GENERAL]: Bot
    };
    return icons[action] || Bot;
  };

  const getActionColor = (action) => {
    const colors = {
      [AI_ACTIONS.ANALYZE]: 'blue',
      [AI_ACTIONS.DEBUG]: 'red',
      [AI_ACTIONS.OPTIMIZE]: 'yellow',
      [AI_ACTIONS.EXPLAIN]: 'purple',
      [AI_ACTIONS.COMPLETE]: 'green',
      [AI_ACTIONS.REVIEW]: 'indigo',
      [AI_ACTIONS.GENERAL]: 'gray'
    };
    return colors[action] || 'gray';
  };

  const ActionIcon = getActionIcon(conversation.action);
  const actionColor = getActionColor(conversation.action);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-lg p-4 ${
        conversation.type === 'error' 
          ? 'bg-red-50 border border-red-200' 
          : 'bg-gradient-to-r from-gray-50 to-white border border-gray-200'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg bg-${actionColor}-100`}>
            <ActionIcon className={`w-4 h-4 text-${actionColor}-600`} />
          </div>
          
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-900">
                {conversation.modelInfo?.name || conversation.model}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium bg-${actionColor}-100 text-${actionColor}-700`}>
                {conversation.action}
              </span>
            </div>
            <div className="text-xs text-gray-500">
              {formatTime(conversation.timestamp)}
              {conversation.usage && (
                <span className="ml-2">
                  • {conversation.usage.total_tokens} tokens
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => onCopy(conversation.response)}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors rounded"
            title="Copy response"
          >
            <Copy className="w-4 h-4" />
          </button>

          {canShare && (
            <button
              onClick={() => onShare(conversation)}
              className="p-1 text-gray-400 hover:text-blue-600 transition-colors rounded"
              title="Share with participants"
            >
              <Share2 className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => onRemove(conversation.id)}
            className="p-1 text-gray-400 hover:text-red-600 transition-colors rounded"
            title="Remove"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {conversation.type === 'error' ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="font-medium text-red-900 mb-1">Error</div>
          <div className="text-red-700 text-sm">{conversation.error}</div>
        </div>
      ) : (
        <div className="prose prose-sm prose-invert max-w-none bg-gray-900 p-4 rounded-md">
          <ReactMarkdown components={markdownComponents}>
            {conversation.response}
          </ReactMarkdown>
        </div>
      )}

      {/* Context Info */}
      {conversation.prompt && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="text-xs text-gray-600">
            <span className="font-medium">Query:</span> {conversation.prompt}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default AgenticAIPanel;
ReactMarkdown