import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Send, Bot, Building2, RefreshCw, Search, X, LogOut, Filter, ChevronDown, TrendingUp, Moon, Sun, Sparkles, Activity } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const FinancialAIAssistant = () => {
  const API_BASE_URL = 'https://finsight.tatvahitech.com';
  const [isDarkMode, setIsDarkMode] = useState(true);

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

  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const messagesEndRef = useRef(null);

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
        company.slug?.toLowerCase().includes(query) ||
        company.sector?.toLowerCase().includes(query) ||
        company.industry?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [companies, searchQuery, selectedSector, selectedIndustry]);

  useEffect(() => {
    if (isUserNameSet && userName) {
      loadCompanies();
    }
  }, [isUserNameSet, userName]);

  const loadCompanies = async () => {
    setIsLoadingCompanies(true);
    try {
      const response = await fetch(`${API_BASE_URL}/companies/search`);
      const data = await response.json();
      if (data.status === 'success' && data.companies) {
        setCompanies(data.companies);
      }
    } catch (error) {
      console.error('Error loading companies:', error);
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
  };

  const handleSelectCompany = (company) => {
    setSelectedCompanies(prev => {
      const isAlreadySelected = prev.find(c => c.slug === company.slug);
      if (isAlreadySelected) {
        return prev.filter(c => c.slug !== company.slug);
      } else {
        return [...prev, company];
      }
    });
    setValidationError('');
  };

  const handleRemoveCompany = (companySlug) => {
    setSelectedCompanies(prev => prev.filter(c => c.slug !== companySlug));
  };

  const handleSelectAllBySector = (sector) => {
    const companiesInSector = companies.filter(c => c.sector === sector);
    setSelectedCompanies(prev => {
      const newSelection = [...prev];
      companiesInSector.forEach(company => {
        if (!newSelection.find(c => c.slug === company.slug)) {
          newSelection.push(company);
        }
      });
      return newSelection;
    });
  };

  const handleSelectAllByIndustry = (industry) => {
    const companiesInIndustry = companies.filter(c => c.industry === industry);
    setSelectedCompanies(prev => {
      const newSelection = [...prev];
      companiesInIndustry.forEach(company => {
        if (!newSelection.find(c => c.slug === company.slug)) {
          newSelection.push(company);
        }
      });
      return newSelection;
    });
  };

  const clearFilters = () => {
    setSelectedSector('');
    setSelectedIndustry('');
    setSearchQuery('');
  };

  const handleUserNameSubmit = (e) => {
    e.preventDefault();
    if (!userName.trim()) return;
    setIsUserNameSet(true);
  };

  const handleSubmit = useCallback((e) => {
    e.preventDefault();

    if (selectedCompanies.length === 0) {
      setValidationError('Please select at least one company to proceed');
      return;
    }

    const inputValue = inputRef.current?.value || '';
    if (!inputValue.trim()) return;

    const userQuery = inputValue;
    if (inputRef.current) {
      inputRef.current.value = '';
    }

    setValidationError('');
    processRequest(userQuery);
  }, [selectedCompanies]);

  const processRequest = async (userQuery) => {
    setIsLoading(true);

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

      const response = await fetch(`${API_BASE_URL}/financial/chat/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to get response');

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

      setMessages(prev => 
        prev.map(msg => 
          msg.id === streamingMessageId
            ? { ...msg, status: 'completed' }
            : msg
        )
      );

    } catch (error) {
      console.error('API Error:', error);
      setMessages(prev => 
        prev.map(msg => 
          msg.id === streamingMessageId
            ? { 
                ...msg, 
                content: `Error: ${error.message}`, 
                status: 'failed' 
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowCompanyDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isUserNameSet) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 relative overflow-hidden">
        {/* Grid background */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(0, 255, 200, .05) 25%, rgba(0, 255, 200, .05) 26%, transparent 27%, transparent 74%, rgba(0, 255, 200, .05) 75%, rgba(0, 255, 200, .05) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(0, 255, 200, .05) 25%, rgba(0, 255, 200, .05) 26%, transparent 27%, transparent 74%, rgba(0, 255, 200, .05) 75%, rgba(0, 255, 200, .05) 76%, transparent 77%, transparent)',
            backgroundSize: '50px 50px'
          }}></div>
        </div>

        {/* Animated gradient orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-600 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-600 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-32 left-1/2 w-96 h-96 bg-cyan-500 rounded-full mix-blend-screen filter blur-3xl opacity-10 animate-blob animation-delay-4000"></div>

        <div className="relative z-10 w-full max-w-md">
          <div className="text-center mb-12">
            {/* Animated logo */}
            <div className="flex justify-center mb-8 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl blur-xl opacity-50 animate-pulse"></div>
              <div className="relative bg-gradient-to-br from-cyan-500 to-black-600 rounded-xl p-4 shadow-2xl">
<img 
          src="/logo.png" 
          alt="FinSight Logo" 
          className="h-10 w-15 object-contain"
        />                </div>
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
                  onKeyPress={(e) => e.key === 'Enter' && handleUserNameSubmit(e)}
                  placeholder="Enter your name"
                  className="w-full px-4 py-3 bg-black border border-cyan-500/20 rounded-lg text-white placeholder-gray-600 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 transition-all font-mono text-sm"
                />
              </div>

              <button
                onClick={handleUserNameSubmit}
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

        <style jsx>{`
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
      {/* Background grid */}
      <div className="absolute inset-0 opacity-3 pointer-events-none">
        <div style={{
          backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(0, 255, 200, .1) 25%, rgba(0, 255, 200, .1) 26%, transparent 27%, transparent 74%, rgba(0, 255, 200, .1) 75%, rgba(0, 255, 200, .1) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(0, 255, 200, .1) 25%, rgba(0, 255, 200, .1) 26%, transparent 27%, transparent 74%, rgba(0, 255, 200, .1) 75%, rgba(0, 255, 200, .1) 76%, transparent 77%, transparent)',
          backgroundSize: '50px 50px',
          width: '100%',
          height: '100%'
        }}></div>
      </div>

      {/* Header */}
      <div className="relative z-40 border-b border-cyan-500/10 bg-black/50 backdrop-blur-xl px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-gradient-to-br from-grey-500 to-white-600 rounded-lg flex items-center justify-center">
<img 
          src="/logo.png" 
          alt="FinSight Logo" 
          className="h-10 w-15 object-contain"
        />              </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">FinSight</h1>
              <p className="text-xs text-gray-500 font-mono">Welcome, {userName}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="text-xs text-cyan-400 font-mono px-3 py-1 border border-cyan-500/30 rounded-full bg-cyan-500/5">
              {queryCount} Queries
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

      {/* Main Content */}
      <div className="flex-1 flex gap-6 px-6 py-4 overflow-hidden">
        {/* Sidebar - Company Selection */}
        <div className="w-80 flex flex-col gap-4 overflow-hidden">
          <div className="border border-cyan-500/10 rounded-lg bg-black/50 backdrop-blur-xl p-4 overflow-y-auto flex-1 space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-mono text-cyan-400 tracking-widest">ASSET SELECTION</p>
              <div className="relative" ref={dropdownRef}>
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-600" />
                <input
                  type="text"
                  placeholder="Search..."
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
                        {filteredCompanies.map((company) => (
                          <div
                            key={company.slug}
                            onClick={() => handleSelectCompany(company)}
                            className="px-4 py-3 hover:bg-cyan-500/5 cursor-pointer transition-colors border-l-2 border-transparent hover:border-cyan-500 group"
                          >
                            <div className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                checked={selectedCompanies.some(c => c.slug === company.slug)}
                                onChange={() => {}}
                                className="w-4 h-4 cursor-pointer accent-cyan-500"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-mono text-cyan-300 font-semibold">{company.name}</div>
                                <div className="text-xs text-gray-600 font-mono">{company.slug}</div>
                                <div className="text-xs mt-1 space-x-1">
                                  {company.sector && <span className="inline-block px-2 py-0.5 rounded text-cyan-400 border border-cyan-500/30 bg-cyan-500/5 text-xs">{company.sector}</span>}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-gray-600 text-sm">No results</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-cyan-500/20 hover:border-cyan-500/50 text-sm text-cyan-400 font-mono transition-all"
            >
              <span>FILTERS</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>

            {showFilters && (
              <div className="space-y-3 border-t border-cyan-500/10 pt-3">
                <div>
                  <label className="text-xs font-mono text-gray-500 mb-2 block">Sector</label>
                  <select
                    value={selectedSector}
                    onChange={(e) => setSelectedSector(e.target.value)}
                    className="w-full px-3 py-2 bg-black border border-cyan-500/20 rounded-lg text-sm text-white focus:border-cyan-400 outline-none font-mono"
                  >
                    <option value="">All</option>
                    {sectors.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-mono text-gray-500 mb-2 block">Industry</label>
                  <select
                    value={selectedIndustry}
                    onChange={(e) => setSelectedIndustry(e.target.value)}
                    className="w-full px-3 py-2 bg-black border border-cyan-500/20 rounded-lg text-sm text-white focus:border-cyan-400 outline-none font-mono"
                  >
                    <option value="">All</option>
                    {industries.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
              </div>
            )}

            {selectedCompanies.length > 0 && (
              <div className="border-t border-cyan-500/10 pt-4 space-y-2">
                <p className="text-xs font-mono text-cyan-400 tracking-widest">SELECTED ASSETS ({selectedCompanies.length})</p>
                {selectedCompanies.map(c => (
                  <div key={c.slug} className="flex items-center justify-between px-3 py-2 bg-cyan-500/5 border border-cyan-500/20 rounded-lg group hover:border-cyan-500/50 transition-all">
                    <span className="text-sm font-mono text-cyan-300">{c.name}</span>
                    <button
                      onClick={() => handleRemoveCompany(c.slug)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4 text-red-400 hover:text-red-300" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          <div className="flex-1 border border-cyan-500/10 rounded-lg bg-black/50 backdrop-blur-xl overflow-hidden flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
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
                    <div className={`max-w-2xl ${
                      message.type === 'user'
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg rounded-tr-none'
                        : 'bg-black border border-cyan-500/20 text-gray-100 rounded-lg rounded-tl-none'
                    } px-6 py-4`}>
                      {message.type === 'ai' && (
                        <div className="flex items-center space-x-2 mb-3 pb-3 border-b border-cyan-500/10">
                          <Sparkles className="w-4 h-4 text-cyan-400" />
                          <span className="text-xs font-mono text-cyan-400 tracking-wider">
                            {message.status === 'streaming' ? 'ANALYZING' : 'RESULTS'}
                          </span>
                          {message.status === 'streaming' && (
                            <div className="flex space-x-1 ml-2">
                              <div className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce"></div>
                              <div className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                              <div className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                            </div>
                          )}
                        </div>
                      )}
                      <div className={`text-sm font-mono leading-relaxed ${message.type === 'user' ? 'text-white' : 'text-gray-200'}`}>
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

            {/* Input */}
            <div className="border-t border-cyan-500/10 bg-black/50 p-4">
              <div className="space-y-3">
                <div className="flex gap-3">
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder={selectedCompanies.length === 0 ? "Select companies first..." : "Ask about fundamentals..."}
                    onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSubmit(e)}
                    className="flex-1 px-4 py-3 bg-black border border-cyan-500/20 rounded-lg text-white placeholder-gray-600 text-sm focus:border-cyan-400 focus:outline-none font-mono transition-all disabled:opacity-50"
                    disabled={selectedCompanies.length === 0 || isLoading}
                  />
                  <button
                    onClick={handleSubmit}
                    disabled={selectedCompanies.length === 0 || isLoading}
                    className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg font-mono font-bold text-sm hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 transition-all"
                  >
                    {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
                
                {selectedCompanies.length > 0 && !isLoading && (
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => inputRef.current && (inputRef.current.value = `Compare ${selectedCompanies.map(c => c.name).join(' vs ')} revenue growth`)}
                      className="px-3 py-1 text-xs border border-cyan-500/30 rounded text-cyan-400 hover:border-cyan-500/50 hover:bg-cyan-500/5 font-mono transition-all"
                    >
                      Revenue Compare
                    </button>
                    <button
                      onClick={() => inputRef.current && (inputRef.current.value = `What are the P/E ratios and profit margins for ${selectedCompanies.map(c => c.name).join(', ')}?`)}
                      className="px-3 py-1 text-xs border border-cyan-500/30 rounded text-cyan-400 hover:border-cyan-500/50 hover:bg-cyan-500/5 font-mono transition-all"
                    >
                      Valuation Metrics
                    </button>
                    <button
                      onClick={() => inputRef.current && (inputRef.current.value = `Analyze debt-to-equity and cash flow trends for ${selectedCompanies.map(c => c.name).join(', ')}`)}
                      className="px-3 py-1 text-xs border border-cyan-500/30 rounded text-cyan-400 hover:border-cyan-500/50 hover:bg-cyan-500/5 font-mono transition-all"
                    >
                      Financial Health
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
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
    </div>
  );
};

export default FinancialAIAssistant;