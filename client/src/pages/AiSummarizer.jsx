import { useState, useEffect, useRef } from 'react';
import { Send, Loader2, FileText, MessageSquare, TrendingUp, Calendar } from 'lucide-react';
import { aiApi, contactsApi } from '../services/api';
import toast from 'react-hot-toast';

const AiSummarizer = () => {
  const [activeTab, setActiveTab] = useState('chat');
  
  // Chat/RAG state
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);
  
  // Summarize state
  const [summaryType, setSummaryType] = useState('brief');
  const [summaryDays, setSummaryDays] = useState(7);
  const [summaryContactId, setSummaryContactId] = useState(null);
  const [summaryResult, setSummaryResult] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [contacts, setContacts] = useState([]);
  
  // Insights state
  const [insightsTopic, setInsightsTopic] = useState('');
  const [insightsResult, setInsightsResult] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  useEffect(() => {
    loadContacts();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const loadContacts = async () => {
    try {
      const response = await contactsApi.getAll();
      setContacts(response.data);
    } catch (error) {
      console.error("Error loading contacts:", error);
    }
  };

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    
    const newMessages = [...chatMessages, { role: 'user', content: userMessage }];
    setChatMessages(newMessages);
    setChatLoading(true);

    try {
      const conversationHistory = chatMessages.map(msg => ({
        question: msg.role === 'user' ? msg.content : '',
        answer: msg.role === 'assistant' ? msg.content : ''
      })).filter(item => item.question || item.answer);

      const response = await aiApi.ragMultiTurn(userMessage, conversationHistory);
      
      setChatMessages([...newMessages, { 
        role: 'assistant', 
        content: response.data.answer,
        sources: response.data.sources 
      }]);
    } catch (error) {
      console.error("Error in chat:", error);
      
      let errorMessage = "I'm sorry, I encountered an error. ";
      
      if (error.response?.status === 404) {
        errorMessage = "AI service not available. Please restart the server to load AI routes. See RESTART_SERVER.md for instructions.";
        toast.error("Server needs restart");
      } else if (error.response?.status === 500) {
        errorMessage = "Server error. Check if GEMINI_API_KEY is configured and interactions are synced to ChromaDB.";
        toast.error("Server configuration error");
      } else if (error.code === 'ERR_NETWORK') {
        errorMessage = "Cannot connect to server. Please make sure the server is running.";
        toast.error("Server not running");
      } else {
        toast.error("Failed to get response");
      }
      
      setChatMessages([...newMessages, { 
        role: 'assistant', 
        content: errorMessage 
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleGenerateSummary = async () => {
    setSummaryLoading(true);
    try {
      const requestData = {
        summary_type: summaryType,
        days: summaryDays,
        contact_id: summaryContactId
      };

      const response = await aiApi.summarize(requestData);
      setSummaryResult(response.data);
      toast.success('Summary generated!');
    } catch (error) {
      console.error("Error generating summary:", error);
      
      if (error.response?.status === 404) {
        toast.error("AI service not available. Please restart the server.");
      } else if (error.response?.status === 500) {
        toast.error("Server error. Check GEMINI_API_KEY configuration.");
      } else {
        toast.error("Failed to generate summary");
      }
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleGenerateInsights = async () => {
    setInsightsLoading(true);
    try {
      const response = await aiApi.getInsights(insightsTopic || null);
      setInsightsResult(response.data);
      toast.success('Insights generated!');
    } catch (error) {
      console.error("Error generating insights:", error);
      
      if (error.response?.status === 404) {
        toast.error("AI service not available. Please restart the server.");
      } else if (error.response?.status === 500) {
        toast.error("Server error. Check GEMINI_API_KEY configuration.");
      } else {
        toast.error("Failed to generate insights");
      }
    } finally {
      setInsightsLoading(false);
    }
  };

  const suggestedQuestions = [
    "What did I discuss with John last week?",
    "Who have I talked to most recently?",
    "What health topics came up in my conversations?",
    "Summarize my interactions from this month",
    "What are the main themes in my recent conversations?"
  ];

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            AI Summarizer
          </h1>
        </div>
        <p className="text-lg text-gray-600">
          Ask questions, generate summaries, and discover insights from your interaction history
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-gray-200 mb-6">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 px-6 py-4 font-medium transition-all duration-200 flex items-center justify-center gap-2
              ${activeTab === 'chat' 
                ? 'text-gray-900 border-b-2 border-gray-900 bg-gray-50' 
                : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <MessageSquare className="h-5 w-5" />
            Chat & Ask
          </button>
          <button
            onClick={() => setActiveTab('summarize')}
            className={`flex-1 px-6 py-4 font-medium transition-all duration-200 flex items-center justify-center gap-2
              ${activeTab === 'summarize' 
                ? 'text-gray-900 border-b-2 border-gray-900 bg-gray-50' 
                : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <FileText className="h-5 w-5" />
            Summarize
          </button>
          <button
            onClick={() => setActiveTab('insights')}
            className={`flex-1 px-6 py-4 font-medium transition-all duration-200 flex items-center justify-center gap-2
              ${activeTab === 'insights' 
                ? 'text-gray-900 border-b-2 border-gray-900 bg-gray-50' 
                : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <TrendingUp className="h-5 w-5" />
            Insights
          </button>
        </div>
      </div>

      {/* Chat Tab */}
      {activeTab === 'chat' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="h-[600px] overflow-y-auto p-6 space-y-4">
            {chatMessages.length === 0 && (
              <div className="text-center py-12">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Ask me anything about your interactions
                </h3>
                <p className="text-gray-600 mb-6">
                  I can help you find information, recall conversations, and understand patterns
                </p>
                <div className="max-w-2xl mx-auto space-y-2">
                  <p className="text-sm font-medium text-gray-700 mb-3">Try asking:</p>
                  {suggestedQuestions.map((question, index) => (
                    <button
                      key={index}
                      onClick={() => setChatInput(question)}
                      className="block w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 
                        rounded-xl text-sm text-gray-700 hover:text-gray-900 transition-colors
                        border border-gray-200 hover:border-gray-300"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {chatMessages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-6 py-4 ${
                    message.role === 'user'
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-300">
                      <p className="text-xs font-medium mb-2 opacity-75">Sources:</p>
                      <div className="space-y-1">
                        {message.sources.map((source, idx) => (
                          <div key={idx} className="text-xs opacity-75">
                            • {source.contact_name} ({new Date(source.timestamp).toLocaleDateString()})
                            {source.relevance_score && ` - ${Math.round(source.relevance_score * 100)}% relevant`}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl px-6 py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-600" />
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleChatSubmit} className="border-t border-gray-200 p-4">
            <div className="flex gap-3">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask a question about your interactions..."
                className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl
                  focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                disabled={chatLoading}
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || chatLoading}
                className="px-6 py-3 bg-gray-900 text-white rounded-xl font-medium
                  hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                  flex items-center gap-2"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Summarize Tab */}
      {activeTab === 'summarize' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Summary Type
                </label>
                <select
                  value={summaryType}
                  onChange={(e) => setSummaryType(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl
                    focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="brief">Brief (2-3 paragraphs)</option>
                  <option value="detailed">Detailed</option>
                  <option value="analytical">Analytical</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time Period
                </label>
                <select
                  value={summaryDays}
                  onChange={(e) => setSummaryDays(parseInt(e.target.value))}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl
                    focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value={7}>Last 7 days</option>
                  <option value={14}>Last 14 days</option>
                  <option value={30}>Last 30 days</option>
                  <option value={90}>Last 90 days</option>
                  <option value={365}>Last year</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filter by Contact (Optional)
                </label>
                <select
                  value={summaryContactId || ''}
                  onChange={(e) => setSummaryContactId(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl
                    focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="">All Contacts</option>
                  {contacts.map(contact => (
                    <option key={contact.id} value={contact.id}>{contact.name}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleGenerateSummary}
                disabled={summaryLoading}
                className="w-full px-6 py-3 bg-gray-900 text-white rounded-xl font-medium
                  hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                  flex items-center justify-center gap-2"
              >
                {summaryLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="h-5 w-5" />
                    Generate Summary
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              {!summaryResult && !summaryLoading && (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">
                    Configure your summary options and click "Generate Summary"
                  </p>
                </div>
              )}

              {summaryLoading && (
                <div className="text-center py-12">
                  <Loader2 className="h-16 w-16 text-gray-900 mx-auto mb-4 animate-spin" />
                  <p className="text-gray-600">Generating your summary...</p>
                </div>
              )}

              {summaryResult && !summaryLoading && (
                <div className="space-y-6">
                  <div className="flex flex-wrap gap-4 pb-6 border-b border-gray-200">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      {summaryResult.interaction_count} interactions
                    </div>
                    {summaryResult.time_period && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        {summaryResult.time_period.days} days
                      </div>
                    )}
                  </div>

                  <div className="prose max-w-none">
                    <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                      {summaryResult.summary}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Insights Tab */}
      {activeTab === 'insights' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Focus Topic (Optional)
                </label>
                <input
                  type="text"
                  value={insightsTopic}
                  onChange={(e) => setInsightsTopic(e.target.value)}
                  placeholder="e.g., health, family, work"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl
                    focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Leave empty for general insights
                </p>
              </div>

              <button
                onClick={handleGenerateInsights}
                disabled={insightsLoading}
                className="w-full px-6 py-3 bg-gray-900 text-white rounded-xl font-medium
                  hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                  flex items-center justify-center gap-2"
              >
                {insightsLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <TrendingUp className="h-5 w-5" />
                    Generate Insights
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              {!insightsResult && !insightsLoading && (
                <div className="text-center py-12">
                  <TrendingUp className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">
                    Click "Generate Insights" to analyze your interaction patterns
                  </p>
                </div>
              )}

              {insightsLoading && (
                <div className="text-center py-12">
                  <Loader2 className="h-16 w-16 text-gray-900 mx-auto mb-4 animate-spin" />
                  <p className="text-gray-600">Analyzing your interactions...</p>
                </div>
              )}

              {insightsResult && !insightsLoading && (
                <div className="space-y-6">
                  {insightsResult.analyzed_interactions && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 pb-6 border-b border-gray-200">
                      <TrendingUp className="h-4 w-4" />
                      Analyzed {insightsResult.analyzed_interactions} interactions
                      {insightsResult.topic && ` focusing on "${insightsResult.topic}"`}
                    </div>
                  )}

                  <div className="prose max-w-none">
                    <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                      {insightsResult.insights}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AiSummarizer;
