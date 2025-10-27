import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Send, Bot, Building2, RefreshCw, Search, X, LogOut, Filter, ChevronDown, TrendingUp, Moon, Sun, Sparkles, Activity, AlertCircle, Clock, Maximize2, Minimize2 } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const FinancialAIAssistant = () => {
  const PRIMARY_API = 'https://finsight.tatvahitech.com';
  const FALLBACK_API = 'https://finsight.tatvahitech.com';
  const STREAM_TIMEOUT = 80000;
  const POLL_INTERVAL = 2000;
  const MAX_RETRIES = 10;
  const MAX_CHARS = 100000;

  const [isDarkMode, setIsDarkMode] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [userName, setUserName] = useState('');
  const [isUserNameSet, setIsUserNameSet] = useState(false);
  const [selectedCompanies, setSelectedCompanies] = useState([]);

  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [validationError, setValidationError] = useState('');

  const [selectedSector, setSelectedSector] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [timeoutWarning, setTimeoutWarning] = useState(false);
  const [currentQueryId, setCurrentQueryId] = useState(null);
  const [pollingActive, setPollingActive] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [expandedInput, setExpandedInput] = useState(false);
  const [apiStatus, setApiStatus] = useState('primary');

  const inputRef = useRef(null);
  const textareaRef = useRef(null);
  const dropdownRef = useRef(null);
  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);
  const timeoutTimerRef = useRef(null);
  const pollingIntervalRef = useRef(null);

  const queryCount = useMemo(() => {
    return messages.filter(m => m.type === 'user').length;
  }, [messages]);

  const sectors = useMemo(() => {
    const uniqueSectors = [...new Set(companies.map(c => c.sector).filter(Boolean))];
    return uniqueSectors.sort();
  }, [companies]);

  const industries = useMemo(() => {
    const uniqueIndustries = [...new Set(companies.map(c => c.industry).filter(Boolean))];
    return uniqueIndustries.sort();
  }, [companies]);

  const filteredCompanies = useMemo(() => {
    let filtered = companies;

    if (selectedSector) {
      filtered = filtered.filter(c => c.sector === selectedSector);
    }

    if (selectedIndustry) {
      filtered = filtered.filter(c => c.industry === selectedIndustry);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(company =>
        company.name?.toLowerCase().includes(query) ||
        company.sector?.toLowerCase().includes(query) ||
        company.industry?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [companies, searchQuery, selectedSector, selectedIndustry]);

  // Retry logic with fallback
  const fetchWithRetry = async (endpoint, options = {}, retryCount = 0) => {
    const apiUrl = apiStatus === 'fallback' ? FALLBACK_API : PRIMARY_API;
    const fullUrl = `${apiUrl}${endpoint}`;

    try {
      const response = await fetch(fullUrl, {
        ...options,
        signal: abortControllerRef.current?.signal,
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setApiStatus('primary');
      return response;
    } catch (error) {
      if (retryCount < MAX_RETRIES) {
        // Try fallback API
        if (apiStatus === 'primary') {
          setApiStatus('fallback');
          console.log('Primary API failed, attempting fallback...');
          return fetchWithRetry(endpoint, options, retryCount + 1);
        }
      }
      throw error;
    }
  };

  useEffect(() => {
    if (isUserNameSet && userName) {
      loadCompanies();
    }
  }, [isUserNameSet, userName]);

  const loadCompanies = async () => {
    setIsLoadingCompanies(true);
    try {
      const response = await fetchWithRetry('/companies/search');
      const data = await response.json();
      if (data.status === 'success' && data.companies) {
        const validCompanies = data.companies.filter(c => c.name && c.name.trim());
        setCompanies(validCompanies);
      }
    } catch (error) {
      console.error('Error loading companies:', error);
      setValidationError('Failed to load companies. Please refresh the page.');
    } finally {
      setIsLoadingCompanies(false);
    }
  };

  const handleLogout = () => {
    setUserName('');
    setIsUserNameSet(false);
    setSelectedCompanies([]);
    setMessages([]);
    setSearchQuery('');
    setValidationError('');
    setSelectedSector('');
    setSelectedIndustry('');
    setTimeoutWarning(false);
    setCurrentQueryId(null);
    setCharCount(0);
    setExpandedInput(false);
    setApiStatus('primary');
    clearTimersAndIntervals();
  };

  const clearTimersAndIntervals = () => {
    if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    if (abortControllerRef.current) abortControllerRef.current.abort();
  };

  const handleSelectCompany = (company) => {
    setSelectedCompanies(prev => {
      const isAlreadySelected = prev.find(c => c.name === company.name);
      if (isAlreadySelected) {
        return prev.filter(c => c.name !== company.name);
      } else {
        return [...prev, company];
      }
    });
    setValidationError('');
  };

  const handleRemoveCompany = (companyName) => {
    setSelectedCompanies(prev => prev.filter(c => c.name !== companyName));
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    if (value.length <= MAX_CHARS) {
      if (inputRef.current) inputRef.current.value = value;
      if (textareaRef.current) textareaRef.current.value = value;
      setCharCount(value.length);
    }
  };

  const pollForResponse = async (queryId, messageId) => {
    try {
      const response = await fetchWithRetry(
        `/financial/chat/query/${queryId}`,
        { method: 'GET' }
      );

      if (!response.ok) throw new Error('Failed to fetch query');

      const data = await response.json();

      setMessages(prev =>
        prev.map(msg =>
          msg.id === messageId
            ? {
                ...msg,
                content: data.response || msg.content,
                status: data.status,
              }
            : msg
        )
      );

      if (data.status === 'completed' || data.status === 'failed') {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          setPollingActive(false);
        }
        setIsLoading(false);
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Polling error:', error);
      }
    }
  };

  const handleSubmit = useCallback((e) => {
    e.preventDefault();

    if (selectedCompanies.length === 0) {
      setValidationError('Please select at least one company to proceed');
      return;
    }

    const inputValue = (inputRef.current?.value || textareaRef.current?.value || '').trim();
    if (!inputValue) return;

    const userQuery = inputValue;
    if (inputRef.current) inputRef.current.value = '';
    if (textareaRef.current) textareaRef.current.value = '';
    setCharCount(0);
    setExpandedInput(false);

    setValidationError('');
    setTimeoutWarning(false);
    processRequest(userQuery);
  }, [selectedCompanies, userName]);

  const processRequest = async (userQuery) => {
    setIsLoading(true);
    clearTimersAndIntervals();
    abortControllerRef.current = new AbortController();

    const userMessage = {
      type: 'user',
      content: userQuery,
      id: `user-${Date.now()}`,
      timestamp: new Date(),
      selectedCompanies: selectedCompanies.map(c => c.name)
    };
    setMessages(prev => [...prev, userMessage]);

    const streamingMessageId = `ai-${Date.now()}`;
    const streamingMessage = {
      type: 'ai',
      content: '',
      id: streamingMessageId,
      status: 'streaming',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, streamingMessage]);

    try {
      const payload = {
        query: userQuery,
        user_name: userName,
        companies: selectedCompanies.map(c => c.name)
      };

      timeoutTimerRef.current = setTimeout(() => {
        setTimeoutWarning(true);
        abortControllerRef.current?.abort();

        const queryId = currentQueryId;
        if (queryId) {
          setPollingActive(true);
          pollingIntervalRef.current = setInterval(
            () => pollForResponse(queryId, streamingMessageId),
            POLL_INTERVAL
          );
        } else {
          setMessages(prev =>
            prev.map(msg =>
              msg.id === streamingMessageId
                ? {
                    ...msg,
                    status: 'timeout',
                    content: msg.content || 'Request timeout. High server traffic detected. Attempting to fetch response...'
                  }
                : msg
            )
          );
        }
      }, STREAM_TIMEOUT);

      const response = await fetchWithRetry('/financial/chat/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const queryId = response.headers.get('X-Query-ID');
      if (queryId) {
        setCurrentQueryId(queryId);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulatedContent += chunk;

        setMessages(prev =>
          prev.map(msg =>
            msg.id === streamingMessageId
              ? { ...msg, content: accumulatedContent, status: 'streaming' }
              : msg
          )
        );
      }

      clearTimeout(timeoutTimerRef.current);
      setTimeoutWarning(false);

      setMessages(prev =>
        prev.map(msg =>
          msg.id === streamingMessageId
            ? { ...msg, status: 'completed' }
            : msg
        )
      );

    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Stream aborted due to timeout');
      } else {
        console.error('API Error:', error);
        setMessages(prev =>
          prev.map(msg =>
            msg.id === streamingMessageId
              ? {
                  ...msg,
                  content: msg.content || `Error: ${error.message}`,
                  status: 'failed'
                }
              : msg
          )
        );
      }
    } finally {
      clearTimeout(timeoutTimerRef.current);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowCompanyDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      clearTimersAndIntervals();
    };
  }, []);

  if (!isUserNameSet) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(0, 255, 200, .05) 25%, rgba(0, 255, 200, .05) 26%, transparent 27%, transparent 74%, rgba(0, 255, 200, .05) 75%, rgba(0, 255, 200, .05) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(0, 255, 200, .05) 25%, rgba(0, 255, 200, .05) 26%, transparent 27%, transparent 74%, rgba(0, 255, 200, .05) 75%, rgba(0, 255, 200, .05) 76%, transparent 77%, transparent)',
            backgroundSize: '50px 50px'
          }}></div>
        </div>

        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-600 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-600 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-32 left-1/2 w-96 h-96 bg-cyan-500 rounded-full mix-blend-screen filter blur-3xl opacity-10 animate-blob animation-delay-4000"></div>

        <div className="relative z-10 w-full max-w-md">
          <div className="text-center mb-12">
            <div className="flex justify-center mb-8 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl blur-xl opacity-50 animate-pulse"></div>
              <div className="relative bg-gradient-to-br from-cyan-500 to-black rounded-xl p-4 shadow-2xl">
                <img src="/logo.png" alt="FinSight Logo" className="h-10 w-15 object-contain" />
              </div>
            </div>

            <h1 className="text-7xl font-black mb-2 bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent drop-shadow-lg">
              FinSight
            </h1>
            <p className="text-cyan-400 text-sm font-mono tracking-widest mb-2">FUNDAMENTAL ANALYSIS ENGINE</p>
            <p className="text-gray-400 text-sm">Powered by Advanced Financial Intelligence</p>
          </div>

          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
            <div className="relative bg-black border border-cyan-500/30 rounded-2xl p-8 space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Begin Analysis</h2>
                <p className="text-gray-400 text-sm">Enter your details to access fundamental financial insights</p>
              </div>

              <div>
                <label className="block text-xs font-mono text-cyan-400 mb-3 tracking-wider">FULL NAME</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && userName.trim() && setIsUserNameSet(true)}
                  placeholder="Enter your name"
                  className="w-full px-4 py-3 bg-black border border-cyan-500/20 rounded-lg text-white placeholder-gray-600 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 transition-all font-mono text-sm"
                />
              </div>

              <button
                onClick={() => userName.trim() && setIsUserNameSet(true)}
                disabled={!userName.trim()}
                className={`w-full py-3 px-6 rounded-lg font-mono font-bold text-sm tracking-wider transition-all duration-300 ${
                  userName.trim()
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-black hover:shadow-lg hover:shadow-cyan-500/50 cursor-pointer transform hover:scale-105'
                    : 'bg-gray-800 text-gray-600 cursor-not-allowed opacity-50'
                }`}
              >
                {userName.trim() ? 'ENTER PLATFORM' : 'WAITING FOR INPUT'}
              </button>
            </div>
          </div>

          <p className="text-center text-gray-600 text-xs mt-6 font-mono">
            100% Accurate Financial Data • Real-time Analysis • Enterprise Grade
          </p>
        </div>

        <style>{`
          @keyframes blob {
            0%, 100% { transform: translate(0, 0) scale(1); }
            33% { transform: translate(30px, -50px) scale(1.1); }
            66% { transform: translate(-20px, 20px) scale(0.9); }
          }
          .animate-blob { animation: blob 7s infinite; }
          .animation-delay-2000 { animation-delay: 2s; }
          .animation-delay-4000 { animation-delay: 4s; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black text-white flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 opacity-3 pointer-events-none">
        <div style={{
          backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(0, 255, 200, .1) 25%, rgba(0, 255, 200, .1) 26%, transparent 27%, transparent 74%, rgba(0, 255, 200, .1) 75%, rgba(0, 255, 200, .1) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(0, 255, 200, .1) 25%, rgba(0, 255, 200, .1) 26%, transparent 27%, transparent 74%, rgba(0, 255, 200, .1) 75%, rgba(0, 255, 200, .1) 76%, transparent 77%, transparent)',
          backgroundSize: '50px 50px',
          width: '100%',
          height: '100%'
        }}></div>
      </div>

      <div className="relative z-40 border-b border-cyan-500/10 bg-black/50 backdrop-blur-xl px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative bg-gradient-to-br to-black rounded-xl p-4 shadow-2xl">
              <img src="/logo.png" alt="FinSight Logo" className="h-10 w-15 object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">FinSight</h1>
              <p className="text-xs text-gray-500 font-mono">{userName}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className={`text-xs font-mono px-3 py-1 border rounded-full ${
              apiStatus === 'fallback'
                ? 'border-orange-500/30 bg-orange-500/5 text-orange-400'
                : 'border-cyan-500/30 bg-cyan-500/5 text-cyan-400'
            }`}>
              {apiStatus === 'fallback' ? 'Backup API' : 'Primary API'} • {queryCount} Queries
            </div>
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-lg border border-cyan-500/20 hover:border-cyan-500/50 transition-all"
            >
              {isDarkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-gray-300" />}
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg border border-red-500/20 hover:border-red-500/50 text-red-400 font-mono text-sm transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span>EXIT</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex gap-4 px-4 md:px-6 py-4 overflow-hidden">
        <div className={`fixed md:static inset-0 md:inset-auto w-full md:w-80 h-full md:h-auto flex flex-col gap-4 overflow-hidden z-50 md:z-auto transition-all duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}>
          {sidebarOpen && (
            <div
              className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
              onClick={() => setSidebarOpen(false)}
            ></div>
          )}

          <div className="relative z-50 border border-cyan-500/10 rounded-lg bg-black/50 backdrop-blur-xl p-4 overflow-y-auto flex-1 space-y-4 md:rounded-lg">
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden absolute top-4 right-4 p-2 hover:bg-cyan-500/10 rounded transition-all"
            >
              <X className="w-5 h-5 text-cyan-400" />
            </button>

            <div className="space-y-3">
              <p className="text-xs font-mono text-cyan-400 tracking-widest">ASSET SELECTION</p>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-cyan-500/20 hover:border-cyan-500/50 text-sm text-cyan-400 font-mono transition-all"
              >
                <span>FILTERS</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>

              {showFilters && (
                <div className="space-y-3 border border-cyan-500/10 rounded-lg p-3 bg-cyan-500/5">
                  <div>
                    <label className="text-xs font-mono text-gray-400 mb-2 block">SECTOR</label>
                    <select
                      value={selectedSector}
                      onChange={(e) => setSelectedSector(e.target.value)}
                      className="w-full px-3 py-2 bg-black border border-cyan-500/20 rounded-lg text-sm text-white focus:border-cyan-400 outline-none font-mono"
                    >
                      <option value="">All Sectors</option>
                      {sectors.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-mono text-gray-400 mb-2 block">INDUSTRY</label>
                    <select
                      value={selectedIndustry}
                      onChange={(e) => setSelectedIndustry(e.target.value)}
                      className="w-full px-3 py-2 bg-black border border-cyan-500/20 rounded-lg text-sm text-white focus:border-cyan-400 outline-none font-mono"
                    >
                      <option value="">All Industries</option>
                      {industries.map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                  </div>
                  {(selectedSector || selectedIndustry) && (
                    <button
                      onClick={() => {
                        setSelectedSector('');
                        setSelectedIndustry('');
                      }}
                      className="w-full text-xs text-cyan-400 hover:text-cyan-300 font-mono py-1 border border-cyan-500/20 rounded hover:border-cyan-500/50 transition-all"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              )}

              <div className="relative" ref={dropdownRef}>
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-600" />
                <input
                  type="text"
                  placeholder="Search companies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setShowCompanyDropdown(true)}
                  className="w-full pl-10 pr-4 py-2 bg-black border border-cyan-500/20 rounded-lg text-white placeholder-gray-600 text-sm focus:border-cyan-400 focus:outline-none transition-all font-mono"
                />

                {showCompanyDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-black border border-cyan-500/20 rounded-lg shadow-2xl z-50 max-h-64 overflow-y-auto">
                    {isLoadingCompanies ? (
                      <div className="p-4 text-center text-gray-500 text-sm flex items-center justify-center space-x-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Loading...</span>
                      </div>
                    ) : filteredCompanies.length > 0 ? (
                      <div className="divide-y divide-cyan-500/10">
                        {filteredCompanies.map((company) => {
                          const isChecked = selectedCompanies.some(c => c.name === company.name);
                          return (
                            <div
                              key={company.name}
                              onClick={() => handleSelectCompany(company)}
                              className="px-4 py-3 hover:bg-cyan-500/5 cursor-pointer transition-colors border-l-2 border-transparent hover:border-cyan-500 group"
                            >
                              <div className="flex items-center space-x-3">
                                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                                  isChecked
                                    ? 'bg-cyan-500 border-cyan-500'
                                    : 'border-gray-600 bg-transparent'
                                }`}>
                                  {isChecked && (
                                    <svg className="w-3 h-3 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                      <path d="M5 13l4 4L19 7"></path>
                                    </svg>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-mono text-cyan-300 font-semibold">{company.name}</div>
                                  <div className="text-xs text-gray-600 font-mono">{company.sector}</div>
                                  <div className="text-xs mt-1 space-x-1">
                                    {company.sector && <span className="inline-block px-2 py-0.5 rounded text-cyan-400 border border-cyan-500/30 bg-cyan-500/5 text-xs">{company.sector}</span>}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-gray-600 text-sm">No results</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {selectedCompanies.length > 0 && (
              <div className="border-t border-cyan-500/10 pt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-mono text-cyan-400 tracking-widest">SELECTED ASSETS ({selectedCompanies.length})</p>
                  <button
                    onClick={() => setSelectedCompanies([])}
                    className="text-xs text-red-400 hover:text-red-300 font-mono"
                  >
                    Clear All
                  </button>
                </div>
                {selectedCompanies.map(c => (
                  <div key={c.name} className="flex items-center justify-between px-3 py-2 bg-cyan-500/5 border border-cyan-500/20 rounded-lg group hover:border-cyan-500/50 transition-all">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-mono text-cyan-300">{c.name}</div>
                      <div className="text-xs text-gray-600 font-mono">{c.sector}</div>
                    </div>
                    <button
                      onClick={() => handleRemoveCompany(c.name)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity ml-2"
                    >
                      <X className="w-4 h-4 text-red-400 hover:text-red-300" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-4 overflow-hidden min-w-0">
          <div className="flex-1 border border-cyan-500/10 rounded-lg bg-black/50 backdrop-blur-xl overflow-hidden flex flex-col">
            {timeoutWarning && (
              <div className="bg-orange-500/20 border border-orange-500/50 px-4 py-3 flex items-center space-x-3 animate-pulse">
                <Clock className="w-5 h-5 text-orange-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-mono text-orange-300">High Traffic Detected</p>
                  <p className="text-xs text-orange-200">Server is processing your request. Polling for response...</p>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <div className="flex justify-center mb-4">
                      <Activity className="w-12 h-12 text-cyan-500 animate-pulse" />
                    </div>
                    <h3 className="text-xl font-bold text-white">Ready for Analysis</h3>
                    <p className="text-gray-500 font-mono text-sm">Select companies and ask fundamental questions</p>
                    {selectedCompanies.length > 0 && (
                      <p className="text-cyan-400 text-xs font-mono">Analyzing: {selectedCompanies.map(c => c.name).join(', ')}</p>
                    )}
                  </div>
                </div>
              ) : (
                messages.map((message) => (
                  <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in duration-300`}>
                    <div className={`max-w-xs md:max-w-2xl ${
                      message.type === 'user'
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg rounded-tr-none'
                        : `rounded-lg rounded-tl-none ${
                            message.status === 'timeout'
                              ? 'bg-orange-500/10 border border-orange-500/30 text-orange-100'
                              : 'bg-black border border-cyan-500/20 text-gray-100'
                          }`
                    } px-4 md:px-6 py-4`}>
                      {message.type === 'ai' && (
                        <div className="flex items-center space-x-2 mb-3 pb-3 border-b border-cyan-500/10">
                          <Sparkles className="w-4 h-4 text-cyan-400" />
                          <span className="text-xs font-mono text-cyan-400 tracking-wider">
                            {message.status === 'streaming' ? 'ANALYZING' : message.status === 'timeout' ? 'POLLING RESPONSE' : 'RESULTS'}
                          </span>
                          {(message.status === 'streaming' || message.status === 'timeout') && (
                            <div className="flex space-x-1 ml-2">
                              <div className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce"></div>
                              <div className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                              <div className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                            </div>
                          )}
                        </div>
                      )}
                      <div className={`text-sm font-mono leading-relaxed ${message.type === 'user' ? 'text-white' : 'text-gray-200'} markdown-content`}>
                        <Markdown remarkPlugins={[remarkGfm]}>
                          {message.content}
                        </Markdown>
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-cyan-500/10 bg-black/50 p-4 md:p-6">
              <div className="space-y-3">
                {validationError && (
                  <div className="bg-red-500/20 border border-red-500/50 px-3 py-2 rounded flex items-center space-x-2 text-sm">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span className="text-red-300 font-mono text-xs">{validationError}</span>
                  </div>
                )}

                {!expandedInput ? (
                  <div className="flex gap-3 items-end">
                    <div className="flex-1 flex gap-3">
                      <input
                        ref={inputRef}
                        type="text"
                        placeholder={selectedCompanies.length === 0 ? "Select companies first..." : pollingActive ? "Waiting for response..." : "Ask about fundamentals..."}
                        onChange={handleInputChange}
                        onKeyPress={(e) => e.key === 'Enter' && !isLoading && !pollingActive && handleSubmit(e)}
                        maxLength={MAX_CHARS}
                        className="flex-1 px-4 py-3 bg-black border border-cyan-500/20 rounded-lg text-white placeholder-gray-600 text-sm focus:border-cyan-400 focus:outline-none font-mono transition-all disabled:opacity-50"
                        disabled={selectedCompanies.length === 0 || isLoading || pollingActive}
                      />
                      <button
                        onClick={() => setExpandedInput(true)}
                        className="px-3 py-3 text-cyan-400 hover:text-cyan-300 border border-cyan-500/20 hover:border-cyan-500/50 rounded-lg transition-all"
                        title="Expand to textarea"
                        disabled={selectedCompanies.length === 0 || isLoading || pollingActive}
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>
                    </div>
                    <button
                      onClick={handleSubmit}
                      disabled={selectedCompanies.length === 0 || isLoading || pollingActive}
                      className="px-4 md:px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg font-mono font-bold text-sm hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 transition-all"
                    >
                      {isLoading || pollingActive ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-cyan-400 font-mono">CHARACTER LIMIT: {charCount}/{MAX_CHARS}</span>
                      <button
                        onClick={() => setExpandedInput(false)}
                        className="p-1 text-cyan-400 hover:text-cyan-300 transition-all"
                        title="Collapse textarea"
                      >
                        <Minimize2 className="w-4 h-4" />
                      </button>
                    </div>
                    <textarea
                      ref={textareaRef}
                      placeholder={selectedCompanies.length === 0 ? "Select companies first..." : pollingActive ? "Waiting for response..." : "Ask about fundamentals..."}
                      onChange={handleInputChange}
                      maxLength={MAX_CHARS}
                      disabled={selectedCompanies.length === 0 || isLoading || pollingActive}
                      className="w-full h-32 px-4 py-3 bg-black border border-cyan-500/20 rounded-lg text-white placeholder-gray-600 text-sm focus:border-cyan-400 focus:outline-none font-mono transition-all disabled:opacity-50 resize-none"
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={handleSubmit}
                        disabled={selectedCompanies.length === 0 || isLoading || pollingActive}
                        className="flex-1 px-4 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg font-mono font-bold text-sm hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 transition-all flex items-center justify-center space-x-2"
                      >
                        {isLoading || pollingActive ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Processing...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            <span>Send Query</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setExpandedInput(false);
                          if (inputRef.current) inputRef.current.value = '';
                          if (textareaRef.current) textareaRef.current.value = '';
                          setCharCount(0);
                        }}
                        className="px-4 py-3 border border-red-500/20 hover:border-red-500/50 text-red-400 rounded-lg font-mono text-sm transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {selectedCompanies.length > 0 && !isLoading && !pollingActive && charCount === 0 && (
                  <div className="flex gap-2 flex-wrap text-xs">
                    <button
                      onClick={() => {
                        const text = `Technical Ananlysis of ${selectedCompanies.map(c => c.name).join(' vs ')} with charts`;
                        if (inputRef.current) inputRef.current.value = text;
                        if (textareaRef.current) textareaRef.current.value = text;
                        setCharCount(text.length);
                      }}
                      className="px-3 py-1 border border-cyan-500/30 rounded text-cyan-400 hover:border-cyan-500/50 hover:bg-cyan-500/5 font-mono transition-all"
                    >
                      Technical Ananlysis 
                    </button>
                    <button
                      onClick={() => {
                        const text = `Fundamental Analysis of ${selectedCompanies.map(c => c.name).join(' vs ')}`;
                        if (inputRef.current) inputRef.current.value = text;
                        if (textareaRef.current) textareaRef.current.value = text;
                        setCharCount(text.length);
                      }}
                      className="px-3 py-1 border border-cyan-500/30 rounded text-cyan-400 hover:border-cyan-500/50 hover:bg-cyan-500/5 font-mono transition-all"
                    >
                      Fundamental Analysis
                    </button>
                    <button
                      onClick={() => {
                        const text = `What are the P/E ratios and profit margins of ${selectedCompanies.map(c => c.name).join(', ')} for 2025?`;
                        if (inputRef.current) inputRef.current.value = text;
                        if (textareaRef.current) textareaRef.current.value = text;
                        setCharCount(text.length);
                      }}
                      className="px-3 py-1 border border-cyan-500/30 rounded text-cyan-400 hover:border-cyan-500/50 hover:bg-cyan-500/5 font-mono transition-all"
                    >
                      Valuation
                    </button>
                    <button
                      onClick={() => {
                        const text = `Analyze FCFF of ${selectedCompanies.map(c => c.name).join(', ')} for 2025`;
                        if (inputRef.current) inputRef.current.value = text;
                        if (textareaRef.current) textareaRef.current.value = text;
                        setCharCount(text.length);
                      }}
                      className="px-3 py-1 border border-cyan-500/30 rounded text-cyan-400 hover:border-cyan-500/50 hover:bg-cyan-500/5 font-mono transition-all"
                    >
                      FCFF
                    </button>
                     <button
                      onClick={() => {
                        const text = `Show available financial data tables of  ${selectedCompanies.map(c => c.name).join(', ')}`;
                        if (inputRef.current) inputRef.current.value = text;
                        if (textareaRef.current) textareaRef.current.value = text;
                        setCharCount(text.length);
                      }}
                      className="px-3 py-1 border border-cyan-500/30 rounded text-cyan-400 hover:border-cyan-500/50 hover:bg-cyan-500/5 font-mono transition-all"
                    >
                      Financial Data Availablity
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="md:hidden fixed bottom-6 right-6 z-40 p-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-full shadow-lg hover:from-cyan-500 hover:to-blue-500 transition-all"
      >
        {sidebarOpen ? <X className="w-6 h-6" /> : <Filter className="w-6 h-6" />}
      </button>

      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob { animation: blob 7s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-in {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>

      <style>{`
        .markdown-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 1rem 0;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(0, 255, 200, 0.2);
        }
        .markdown-content th {
          background: rgba(0, 255, 200, 0.1);
          color: #22d3ee;
          font-weight: 600;
          padding: 0.75rem;
          text-align: left;
          border: 1px solid rgba(0, 255, 200, 0.2);
          font-size: 0.875rem;
        }
        .markdown-content td {
          padding: 0.75rem;
          border: 1px solid rgba(0, 255, 200, 0.1);
          color: #e5e7eb;
          font-size: 0.875rem;
        }
        .markdown-content tr:hover {
          background: rgba(0, 255, 200, 0.05);
        }
        .markdown-content h1, .markdown-content h2, .markdown-content h3 {
          color: #22d3ee;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          font-weight: 700;
        }
        .markdown-content h1 {
          font-size: 1.5rem;
        }
        .markdown-content h2 {
          font-size: 1.25rem;
        }
        .markdown-content h3 {
          font-size: 1.1rem;
        }
        .markdown-content p {
          margin-bottom: 1rem;
          line-height: 1.6;
        }
        .markdown-content ul, .markdown-content ol {
          margin-left: 1.5rem;
          margin-bottom: 1rem;
        }
        .markdown-content li {
          margin-bottom: 0.5rem;
        }
        .markdown-content code {
          background: rgba(0, 255, 200, 0.1);
          padding: 0.2rem 0.4rem;
          border-radius: 0.25rem;
          color: #22d3ee;
          font-size: 0.875rem;
        }
        .markdown-content pre {
          background: rgba(0, 0, 0, 0.5);
          padding: 1rem;
          border-radius: 0.5rem;
          overflow-x: auto;
          border: 1px solid rgba(0, 255, 200, 0.2);
          margin: 1rem 0;
        }
        .markdown-content pre code {
          background: none;
          padding: 0;
        }
        .markdown-content strong {
          color: #22d3ee;
          font-weight: 600;
        }
        .markdown-content blockquote {
          border-left: 4px solid rgba(0, 255, 200, 0.5);
          padding-left: 1rem;
          margin: 1rem 0;
          color: #9ca3af;
          font-style: italic;
        }
      `}</style>
    </div>
  );
};

export default FinancialAIAssistant;