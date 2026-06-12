import { useState, useCallback, useRef, useEffect } from 'react';
import { githubAI, AI_ACTIONS, getOptimalModel } from '../services/githubAI';
import toast from 'react-hot-toast';

export default function useAgenticAI() {
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [currentModel, setCurrentModel] = useState('gpt-4.1'); // Default to GPT-4.1
  const [availableModels, setAvailableModels] = useState({});
  const [isEnabled, setIsEnabled] = useState(false);
  const [healthInfo, setHealthInfo] = useState(null);
  const [usageStats, setUsageStats] = useState({
    totalRequests: 0,
    totalTokens: 0,
    byModel: {}
  });
  
  const abortControllerRef = useRef(null);
  const conversationIdRef = useRef(0);

  const checkAIService = useCallback(async () => {
    try {
      const health = await githubAI.checkHealth();
      setHealthInfo(health);
      setIsEnabled(health.aiEnabled);

      if (health.aiEnabled) {
        const models = await githubAI.getAvailableModels();
        setAvailableModels(models.models || {});
      }
      return health;
    } catch (error) {
      console.error('AI service check failed:', error);
      setHealthInfo({
        aiEnabled: false,
        message:
          'Cannot reach API server. Start it with: cd server && npm run dev (port 3000)',
      });
      setIsEnabled(false);
      return null;
    }
  }, []);

  useEffect(() => {
    checkAIService();
  }, [checkAIService]);

  // Add conversation to history
  const addConversation = useCallback((conversation) => {
    const newConversation = {
      id: ++conversationIdRef.current,
      timestamp: new Date(),
      ...conversation
    };
    
    setConversations(prev => [...prev, newConversation].slice(-50)); // Keep last 50
    
    // Update usage statistics
    if (conversation.usage) {
      setUsageStats(prev => ({
        totalRequests: prev.totalRequests + 1,
        totalTokens: prev.totalTokens + (conversation.usage.total_tokens || 0),
        byModel: {
          ...prev.byModel,
          [conversation.model]: (prev.byModel[conversation.model] || 0) + 1
        }
      }));
    }
    
    return newConversation;
  }, []);

  // Main AI assistance function
  const getAIAssistance = useCallback(async ({
    action,
    prompt,
    code = '',
    language = 'javascript',
    problemStatement = '',
    errorDescription = '',
    context = '',
    model = null
  }) => {
    
    if (!isEnabled) {
      toast.error('AI assistant is not available');
      return null;
    }

    // Validate inputs
    if (!prompt && action === AI_ACTIONS.GENERAL) {
      toast.error('Please provide a question or request');
      return null;
    }

    if (!code && [AI_ACTIONS.ANALYZE, AI_ACTIONS.DEBUG, AI_ACTIONS.OPTIMIZE, AI_ACTIONS.EXPLAIN].includes(action)) {
      toast.error('Please provide code for this type of assistance');
      return null;
    }

    const selectedModel = model || getOptimalModel(action) || currentModel;
    
    setLoading(true);
    
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();

    try {
      console.log(`🤖 Getting AI assistance: ${action} with ${selectedModel}`);
      
      const result = await githubAI.getAIAssistance({
        action,
        prompt,
        code,
        language,
        problemStatement,
        errorDescription,
        context,
        model: selectedModel
      });

      if (result.success) {
        const conversation = addConversation({
          type: 'success',
          action,
          prompt,
          code: code.substring(0, 300) + (code.length > 300 ? '...' : ''),
          language,
          response: result.content,
          model: selectedModel,
          modelInfo: availableModels[selectedModel],
          usage: result.usage
        });

        const modelName = availableModels[selectedModel]?.name || selectedModel;
        toast.success(`✨ AI assistance from ${modelName}`);
        
        return conversation;
        
      } else {
        const errorConversation = addConversation({
          type: 'error',
          action,
          prompt,
          error: result.error,
          model: selectedModel
        });
        
        toast.error(`AI Error: ${result.error}`);
        return errorConversation;
      }

    } catch (error) {
      if (error.name === 'AbortError') {
        toast.info('Request cancelled');
        return null;
      }
      
      console.error('Agentic AI Error:', error);
      
      const errorConversation = addConversation({
        type: 'error',
        action,
        prompt,
        error: error.message,
        model: selectedModel
      });
      
      toast.error('Failed to get AI assistance');
      return errorConversation;
      
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [currentModel, addConversation, availableModels, isEnabled]);

  // Cancel ongoing request
  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setLoading(false);
      toast.info('Request cancelled');
    }
  }, []);

  // Clear conversation history
  const clearHistory = useCallback(() => {
    setConversations([]);
    setUsageStats({ totalRequests: 0, totalTokens: 0, byModel: {} });
    toast.success('Conversation history cleared');
  }, []);

  // Remove specific conversation
  const removeConversation = useCallback((id) => {
    setConversations(prev => prev.filter(conv => conv.id !== id));
  }, []);

  return {
    // State
    loading,
    conversations,
    currentModel,
    availableModels,
    usageStats,
    isEnabled,
    healthInfo,
    
    // Actions
    checkAIService,
    getAIAssistance,
    cancelRequest,
    clearHistory,
    removeConversation,
    setCurrentModel,
    
    // Helpers
    aiActions: AI_ACTIONS
  };
}
