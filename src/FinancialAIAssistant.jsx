import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Send, Bot, Building2, RefreshCw, Search, X, LogOut, Filter, ChevronDown } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const FinancialAIAssistant = () => {
  const API_BASE_URL = 'https://finsight.tatvahitech.com';

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
  const chatContainerRef = useRef(null);

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
    setValidationError('');
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
    setValidationError('');
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
      selectedCompanies: selectedCompanies.map(c => c.name || c.slug)
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
      const response = await fetch(`${API_BASE_URL}/financial/chat/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: userQuery,
          user_name: userName,
          companies: selectedCompanies.map(c => c.slug)  // ← Send slug to API
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 text-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="bg-white rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Building2 className="w-12 h-12 text-blue-600" />
            </div>
            <h1 className="text-4xl font-bold mb-2 text-blue-600">FinSight</h1>
            <p className="text-gray-600">Professional Financial Analysis Platform</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-xl">
            <h2 className="text-xl font-semibold mb-2">Welcome</h2>
            <p className="text-gray-600 text-sm mb-6">Enter your name to get started</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleUserNameSubmit(e)}
                  placeholder="Enter your full name"
                  className="w-full bg-gray-50 text-gray-900 rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <button
                onClick={handleUserNameSubmit}
                disabled={!userName.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg py-3 font-medium transition-all flex items-center justify-center space-x-2"
              >
                <span>Continue</span>
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 text-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b-2 border-gray-200 px-4 py-3 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Building2 className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-xl font-bold text-blue-600">FinSight</h1>
              <p className="text-xs text-gray-600">Welcome, {userName}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 bg-red-50 hover:bg-red-100 text-red-700 px-4 py-2 rounded-lg border-2 border-red-200 transition-all font-semibold text-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Company Selector */}
      <div className="bg-white border-b-2 border-gray-200 px-4 py-4 shadow-md">
        <div className="max-w-7xl mx-auto">
          <div className="space-y-3">
            {/* Search and Filter Row */}
            <div className="flex items-center gap-3">
              <div className="flex-1 relative" ref={dropdownRef}>
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
                <input
                  type="text"
                  placeholder="Search by company, sector, or industry..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setShowCompanyDropdown(true)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                />

                {showCompanyDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-gray-300 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
                    {isLoadingCompanies ? (
                      <div className="p-4 text-center text-gray-500 flex items-center justify-center space-x-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Loading companies...</span>
                      </div>
                    ) : filteredCompanies.length > 0 ? (
                      <div>
                        <div className="sticky top-0 bg-gray-50 p-2 border-b text-xs text-gray-600 font-semibold">
                          {filteredCompanies.length} companies found
                        </div>
                        {filteredCompanies.map((company) => (
                          <div
                            key={company.slug}
                            onClick={() => handleSelectCompany(company)}
                            className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
                          >
                            <div className="flex items-start space-x-3">
                              <input
                                type="checkbox"
                                checked={selectedCompanies.some(c => c.slug === company.slug)}
                                onChange={() => {}}
                                className="w-4 h-4 text-blue-600 rounded cursor-pointer mt-0.5"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold text-gray-900">{company.name}</div>
                                <div className="text-xs text-gray-500 mt-0.5">{company.slug}</div>
                                <div className="text-xs text-gray-600 mt-0.5">
                                  {company.sector && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded mr-1">{company.sector}</span>}
                                  {company.industry && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded">{company.industry}</span>}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-gray-500 text-sm">
                        No companies found
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-lg border-2 border-gray-300 transition-all font-semibold text-sm"
              >
                <Filter className="w-4 h-4" />
                <span>Filters</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>

              <div className="text-xs bg-blue-100 text-blue-700 px-4 py-2.5 rounded-lg border-2 border-blue-300 font-semibold whitespace-nowrap">
                {queryCount} queries
              </div>
            </div>

            {/* Filters Panel */}
            {showFilters && (
              <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2">Sector</label>
                    <select
                      value={selectedSector}
                      onChange={(e) => setSelectedSector(e.target.value)}
                      className="w-full px-3 py-2 bg-white border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    >
                      <option value="">All Sectors</option>
                      {sectors.map(sector => (
                        <option key={sector} value={sector}>{sector}</option>
                      ))}
                    </select>
                    {selectedSector && (
                      <button
                        onClick={() => handleSelectAllBySector(selectedSector)}
                        className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-semibold"
                      >
                        + Select all in {selectedSector}
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2">Industry</label>
                    <select
                      value={selectedIndustry}
                      onChange={(e) => setSelectedIndustry(e.target.value)}
                      className="w-full px-3 py-2 bg-white border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    >
                      <option value="">All Industries</option>
                      {industries.map(industry => (
                        <option key={industry} value={industry}>{industry}</option>
                      ))}
                    </select>
                    {selectedIndustry && (
                      <button
                        onClick={() => handleSelectAllByIndustry(selectedIndustry)}
                        className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-semibold"
                      >
                        + Select all in {selectedIndustry}
                      </button>
                    )}
                  </div>
                </div>

                {(selectedSector || selectedIndustry || searchQuery) && (
                  <button
                    onClick={clearFilters}
                    className="text-xs text-red-600 hover:text-red-700 font-semibold"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            )}

            {/* Selected Companies */}
            {selectedCompanies.length > 0 && (
              <div className="flex flex-wrap gap-2 px-1">
                <span className="text-xs font-semibold text-gray-600 self-center">Selected ({selectedCompanies.length}):</span>
                {selectedCompanies.map((company) => (
                  <div
                    key={company.slug}
                    className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-1.5 rounded-full text-sm font-semibold shadow-md"
                  >
                    <span>{company.name || company.slug}</span>
                    <button
                      onClick={() => handleRemoveCompany(company.slug)}
                      className="hover:opacity-75 transition-opacity"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setSelectedCompanies([])}
                  className="text-xs text-red-600 hover:text-red-700 font-semibold self-center ml-2"
                >
                  Clear all
                </button>
              </div>
            )}

            {validationError && (
              <div className="p-3 bg-red-50 border-2 border-red-300 rounded-lg text-sm text-red-700 font-semibold">
                {validationError}
              </div>
            )}

            {selectedCompanies.length === 0 && (
              <div className="p-3 bg-yellow-50 border-2 border-yellow-300 rounded-lg text-sm text-yellow-700 font-semibold">
                Please select at least one company to start analyzing
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full max-w-7xl mx-auto px-4 py-3 flex flex-col">
          <div className="flex-1 bg-white rounded-xl border-2 border-gray-200 shadow-lg overflow-hidden flex flex-col">
            <div
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50"
            >
              {messages.length === 0 ? (
                <div className="text-center text-gray-600 py-12 flex items-center justify-center h-full">
                  <div className="bg-white p-8 rounded-lg max-w-2xl border-2 border-gray-200 shadow-md">
                    <Bot className="w-16 h-16 mx-auto mb-4 text-blue-600" />
                    <p className="text-2xl mb-3 font-bold text-gray-900">Ready to Analyze</p>
                    <p className="text-base mb-6 text-gray-600">Select companies above and ask about their financial metrics</p>
                    {selectedCompanies.length > 0 && (
                      <div className="text-sm mb-4 text-blue-600 font-semibold">
                        Analyzing: <span className="text-blue-700">{selectedCompanies.map(c => c.name || c.slug).join(', ')}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                messages.map((message) => (
                  <div key={message.id} className="space-y-2">
                    {message.type === 'user' ? (
                      <div className="flex justify-end">
                        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl rounded-tr-none px-5 py-3 max-w-2xl shadow-md">
                          <p className="leading-relaxed font-medium">{message.content}</p>
                          {message.selectedCompanies && (
                            <p className="text-xs text-blue-100 mt-2 font-semibold">
                              Companies: {message.selectedCompanies.join(', ')}
                            </p>
                          )}
                          {message.timestamp && (
                            <p className="text-xs text-blue-200 mt-1">{formatTime(message.timestamp)}</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-start">
                        <div className="bg-white text-gray-900 rounded-2xl rounded-tl-none px-5 py-3 max-w-4xl border-2 border-gray-200 shadow-md">
                          <div className="flex items-center space-x-2 mb-3">
                            <Building2 className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-bold text-gray-700">
                              {message.status === 'streaming' ? 'Streaming...' : message.status || 'Response'}
                            </span>
                            {message.timestamp && message.status === 'completed' && (
                              <span className="text-xs text-gray-500">
                                • {formatTime(message.timestamp)}
                              </span>
                            )}
                            {message.status === 'streaming' && (
                              <div className="flex space-x-1 ml-2">
                                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                              </div>
                            )}
                          </div>
                          
                          <div className="prose prose-sm prose-slate max-w-none">
                            <Markdown 
                              remarkPlugins={[remarkGfm]}
                              components={{
                                h1: ({node, ...props}) => <h1 className="text-2xl font-bold mt-4 mb-2 text-gray-900" {...props} />,
                                h2: ({node, ...props}) => <h2 className="text-xl font-bold mt-4 mb-2 text-gray-800" {...props} />,
                                h3: ({node, ...props}) => <h3 className="text-lg font-bold mt-3 mb-2 text-gray-800" {...props} />,
                                p: ({node, ...props}) => <p className="mb-3 text-gray-700 leading-relaxed" {...props} />,
                                ul: ({node, ...props}) => <ul className="list-disc ml-6 mb-3 space-y-1" {...props} />,
                                ol: ({node, ...props}) => <ol className="list-decimal ml-6 mb-3 space-y-1" {...props} />,
                                li: ({node, ...props}) => <li className="text-gray-700" {...props} />,
                                strong: ({node, ...props}) => <strong className="font-bold text-gray-900" {...props} />,
                                em: ({node, ...props}) => <em className="italic text-gray-700" {...props} />,
                                table: ({node, ...props}) => <table className="min-w-full border-collapse border border-gray-300 my-3" {...props} />,
                                thead: ({node, ...props}) => <thead className="bg-gray-100" {...props} />,
                                th: ({node, ...props}) => <th className="border border-gray-300 px-4 py-2 text-left font-semibold text-gray-900" {...props} />,
                                td: ({node, ...props}) => <td className="border border-gray-300 px-4 py-2 text-gray-700" {...props} />,
                                code: ({node, inline, ...props}) => 
                                  inline ? 
                                    <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-red-600" {...props} /> :
                                    <code className="block bg-gray-100 p-3 rounded text-sm font-mono overflow-x-auto" {...props} />,
                                blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-600 my-3" {...props} />,
                              }}
                            >
                              {message.content || 'Starting analysis...'}
                            </Markdown>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
              
            {/* Input Area */}
            <div className="border-t-2 border-gray-200 bg-white px-4 py-4">
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <input
                      ref={inputRef}
                      type="text"
                      placeholder={selectedCompanies.length === 0 ? "Select companies first..." : "Ask about the selected companies..."}
                      onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSubmit(e)}
                      className={`w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 font-medium transition-all ${
                        selectedCompanies.length === 0 || isLoading ? 'opacity-50 cursor-not-allowed bg-gray-100' : 'bg-white'
                      }`}
                      disabled={selectedCompanies.length === 0 || isLoading}
                    />
                  </div>
                  <button
                    onClick={handleSubmit}
                    disabled={selectedCompanies.length === 0 || isLoading}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-400 text-white rounded-lg px-6 py-3 flex items-center space-x-2 transition-all font-bold shadow-md hover:shadow-lg"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline">Send</span>
                  </button>
                </div>

                {selectedCompanies.length > 0 && !isLoading && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        if (inputRef.current) {
                          inputRef.current.value = `Compare ${selectedCompanies.map(c => c.slug).join(' and ')} quarterly results`;
                        }
                      }}
                      className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-100 border-2 border-blue-200 font-semibold text-xs transition-all"
                    >
                      📊 Compare
                    </button>
                    <button
                      onClick={() => {
                        if (inputRef.current) {
                          inputRef.current.value = `Show profit margins for ${selectedCompanies.map(c => c.slug).join(', ')}`;
                        }
                      }}
                      className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-100 border-2 border-blue-200 font-semibold text-xs transition-all"
                    >
                      💰 Margins
                    </button>
                    <button
                      onClick={() => {
                        if (inputRef.current) {
                          inputRef.current.value = `What is YoY growth for ${selectedCompanies.map(c => c.slug).join(', ')}?`;
                        }
                      }}
                      className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-100 border-2 border-blue-200 font-semibold text-xs transition-all"
                    >
                      📈 YoY Growth
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialAIAssistant;