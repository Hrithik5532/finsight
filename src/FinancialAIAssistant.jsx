
import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { Send, ThumbsUp, ThumbsDown, Clock, CheckCircle, XCircle, User, Bot, Copy, Check, Building2, RefreshCw, Brain, Search, TrendingUp, FileText, Database, BarChart3, Table, ChevronRight, ChevronLeft, X, Filter, Download, Grid3X3 } from 'lucide-react';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const MessageComponent = memo(({ message, feedback, handleFeedback, handleCopyMessage, copiedMessageId, handleTableView, formatTime, getStatusIcon }) => {
  return (
    <div key={message.id} className="space-y-2">
      {message.type === 'user' ? (
        <div className="flex justify-end">
          <div className="bg-purple-700 text-white rounded-lg rounded-br-sm px-4 py-3 max-w-2xl">
            <p className="leading-relaxed">{message.content}</p>
            {message.timestamp && (
              <p className="text-xs text-purple-200 mt-1">{formatTime(message.timestamp)}</p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {message.status === 'processing' && (
            <AgentActivityAnimation isVisible={true} />
          )}

          <div className="flex justify-start">
            <div className="bg-gray-700 text-white rounded-lg rounded-bl-sm px-4 py-3 max-w-4xl border border-gray-600">
              <div className="flex items-center space-x-2 mb-3">
                <div className="bg-purple-800/30 p-1 rounded border border-purple-700">
                  <Bot className="w-4 h-4 text-purple-400" />
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(message.status)}
                  <span className="text-sm text-gray-300 font-medium capitalize">
                    {message.status || 'Response'}
                  </span>
                  {message.timestamp && (
                    <span className="text-xs text-gray-500">
                      • {formatTime(message.timestamp)}
                    </span>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center space-x-2 mb-3">
                <button
                  onClick={() => handleCopyMessage(message.content, message.id)}
                  className="text-xs light-text-secondary hover:text-white transition-colors px-2 py-1 rounded secondary-gradient hover:opacity-90 flex items-center space-x-1"
                  title="Copy response"
                >
                  {copiedMessageId === message.id ? (
                    <>
                      <Check className="w-3 h-3" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>

                {hasValidTableData(message.table) && (
                  <button
                    onClick={() => handleTableView(message.table)}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors px-2 py-1 rounded bg-blue-900/30 hover:bg-blue-900/50 flex items-center space-x-1"
                    title="View table data"
                  >
                    <Table className="w-3 h-3" />
                    <span>View Table</span>
                  </button>
                )}
              </div>

              <div className="prose prose-invert max-w-none">
                {message.status === 'processing' ? (
                  <div className="flex items-center space-x-3 py-4">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                    <span className="text-gray-300">Agents are working on your request...</span>
                  </div>
                ) : (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({children}) => (
                        <h1 className="text-2xl font-black mt-8 mb-6 border-b-3 border-gradient-to-r from-orange-400 to-red-400 pb-4 tracking-tight">
                          <span className="text-gray-900 font-black">
                            {children}
                          </span>
                        </h1>
                      ),
                      h2: ({children}) => (
                        <h2 className="text-xl font-black chat-response-text mt-6 mb-4 border-l-4 border-orange-400 pl-4 py-2 bg-gradient-to-r from-orange-50 to-transparent rounded-r-lg">
                          <span className="text-gray-900 font-black">{children}</span>
                        </h2>
                      ),
                      h3: ({children}) => (
                        <h3 className="text-lg font-black chat-response-text mt-5 mb-3">
                          <span className="font-black text-gray-900">{children}</span>
                        </h3>
                      ),
                      h4: ({children}) => (
                        <h4 className="text-base font-bold chat-response-text mt-4 mb-2 text-gray-800 uppercase tracking-wide text-sm">
                          {children}
                        </h4>
                      ),
                      p: ({children}) => {
                        const text = typeof children === 'string' ? children : (Array.isArray(children) ? children.join('') : '');

                        // Check for financial data format (Label: Value)
                        const isFinancialData = /^[^:]+:\s*₹/.test(text) || /^[A-Za-z\s]+:\s*\d/.test(text);

                        // Check for source information
                        const isSourceInfo = text.includes('📍 Source:') || text.includes('Extracted on:');

                        if (isFinancialData) {
                          const parts = text.split(':');
                          if (parts.length === 2) {
                            return (
                              <div className="chat-response-text mb-3 leading-relaxed text-gray-700 text-base flex justify-between items-center py-2 border-b border-gray-100">
                                <span className="font-medium text-gray-800">{parts[0].trim()}</span>
                                <span className="font-bold text-gray-900 ml-4">{parts[1].trim()}</span>
                              </div>
                            );
                          }
                        }

                        if (isSourceInfo) {
                          return (
                            <div className="chat-response-text mb-4 text-xs text-gray-500 bg-gray-50 p-3 rounded border-l-2 border-blue-200">
                              {children}
                            </div>
                          );
                        }

                        return (
                          <p className="chat-response-text mb-5 leading-relaxed text-gray-700 text-base">
                            {children}
                          </p>
                        );
                      },
                      ul: ({children}) => (
                        <ul className="chat-response-text mb-6 space-y-2 unordered-list">
                          {children}
                        </ul>
                      ),
                      ol: ({children}) => (
                        <ol className="chat-response-text mb-6 space-y-2 ordered-list">
                          {children}
                        </ol>
                      ),
                      li: ({children}) => (
                        <li className="chat-response-text mb-2 text-gray-700 leading-relaxed">
                          {children}
                        </li>
                      ),
                      strong: ({children}) => (
                        <strong className="chat-response-text font-bold text-gray-900">
                          {children}
                        </strong>
                      ),
                      em: ({children}) => (
                        <em className="text-orange-600 italic font-semibold">
                          {children}
                        </em>
                      ),
                      code: ({children}) => (
                        <code className="bg-gray-800 text-green-400 px-2 py-1 rounded text-sm font-mono border border-gray-600 shadow-sm">
                          {children}
                        </code>
                      ),
                      pre: ({children}) => (
                        <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto border border-gray-700 shadow-lg my-6 relative">
                          <div className="flex items-center mb-3 text-gray-400 text-xs border-b border-gray-700 pb-2">
                            <div className="flex space-x-1 mr-3">
                              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            </div>
                            <span className="font-mono">Code Block</span>
                          </div>
                          <div className="font-mono text-sm leading-relaxed">
                            {children}
                          </div>
                        </pre>
                      ),
                      blockquote: ({children}) => (
                        <blockquote className="border-l-4 border-blue-400 pl-6 py-4 bg-gradient-to-r from-blue-50 to-transparent rounded-r-lg my-6 relative shadow-sm">
                          <div className="absolute top-3 left-2 text-blue-400 text-3xl font-serif opacity-50">"</div>
                          <div className="italic text-gray-700 font-medium pl-4 leading-relaxed">
                            {children}
                          </div>
                          <div className="absolute bottom-3 right-4 text-blue-400 text-3xl font-serif opacity-50 rotate-180">"</div>
                        </blockquote>
                      ),
                      table: ({children}) => (
                        <div className="overflow-x-auto my-4 pro-shadow">
                          <table className="pro-table">
                            {children}
                          </table>
                        </div>
                      ),
                      thead: ({children}) => <thead className="pro-thead">{children}</thead>,
                      tbody: ({children}) => <tbody>{children}</tbody>,
                      tr: ({children}) => <tr className="pro-tr">{children}</tr>,
                      th: ({children}) => (
                        <th className="pro-th" style={{color: '#ffffff'}}>
                          <span style={{color: '#ffffff'}}>{children}</span>
                        </th>
                      ),
                      td: ({children}) => (
                        <td className="pro-td">{children}</td>
                      ),
                      a: ({children, href}) => (
                        <a href={href} className="text-orange-600 hover:text-orange-700 underline font-medium" target="_blank" rel="noopener noreferrer">
                          {children}
                        </a>
                      )
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                )}
              </div>
            </div>
          </div>

          {message.status === 'completed' && (
            <div className="flex justify-start ml-4">
              <div className="flex items-center space-x-2 light-bg-primary rounded-lg px-3 py-2 light-border border">
                <span className="text-xs light-text-secondary">Was this helpful?</span>
                <button
                  onClick={() => handleFeedback(message.id, 'positive')}
                  className={`p-1 rounded transition-colors ${
                    feedback[message.id] === 'positive'
                      ? 'text-green-500 bg-green-100'
                      : 'light-text-secondary hover:text-green-500 light-hover'
                  }`}
                  title="Helpful"
                >
                  <ThumbsUp className="w-3 h-3" />
                </button>
                <button
                  onClick={() => handleFeedback(message.id, 'negative')}
                  className={`p-1 rounded transition-colors ${
                    feedback[message.id] === 'negative'
                      ? 'text-red-500 bg-red-100'
                      : 'light-text-secondary hover:text-red-500 light-hover'
                  }`}
                  title="Not helpful"
                >
                  <ThumbsDown className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

const FinancialAIAssistant = ({ userName, setUserName, isUserNameSet, setIsUserNameSet }) => {
  const API_BASE_URL = 'http://54.243.27.109:8989';

  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState({});
  const [pollingIntervals, setPollingIntervals] = useState({});
  const pollingIntervalsRef = useRef({});
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
  const [showTablePanel, setShowTablePanel] = useState(false);
  const [currentTable, setCurrentTable] = useState(null);
  const [tablePanelWidth, setTablePanelWidth] = useState(600);
  const [tableViewMode, setTableViewMode] = useState('combined'); // 'combined' or 'separate'
  const [copyNotification, setCopyNotification] = useState({ show: false, message: '' });

  // Deprecated queue removed; sequential lock enforced via isLoading + activeProcessingQueryId
  const [requestQueue, setRequestQueue] = useState([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [currentRequestId, setCurrentRequestId] = useState(null);
  const abortControllerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  // Track cancelled queries to ignore late server responses
  const cancelledQueriesRef = useRef(new Set());
  const scrollPositionRef = useRef({ top: 0, height: 0 });

  const inputRef = useRef(null);
  const [activeProcessingQueryId, setActiveProcessingQueryId] = useState(null);
  const isLocked = isLoading || Boolean(activeProcessingQueryId);

  const notifyBlocked = () => {
    setCopyNotification({ show: true, message: "Wait for the first response to complete. It's still processing." });
    setTimeout(() => setCopyNotification({ show: false, message: '' }), 2500);
  };


  const queryCount = useMemo(() => {
    return messages.filter(m => m.type === 'user').length;
  }, [messages]);

  const [visibleMessageCount, setVisibleMessageCount] = useState(20);
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isInfiniteScrollLoading, setIsInfiniteScrollLoading] = useState(false);

  const visibleMessages = useMemo(() => {
    const result = messages.slice(-visibleMessageCount);
    setHasMoreMessages(messages.length > visibleMessageCount);
    return result;
  }, [messages, visibleMessageCount]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadMoreMessages = useCallback(() => {
    if (!isLoadingOlderMessages && hasMoreMessages) {
      // Set flag to prevent auto-scroll to bottom
      setIsInfiniteScrollLoading(true);

      // Store current scroll position
      const chatContainer = chatContainerRef.current;
      if (chatContainer) {
        const scrollHeightBefore = chatContainer.scrollHeight;
        const scrollTopBefore = chatContainer.scrollTop;

        loadPreviousQueries(true).then(() => {
          // Use requestAnimationFrame to ensure DOM is fully updated
          requestAnimationFrame(() => {
            const scrollHeightAfter = chatContainer.scrollHeight;
            const heightDifference = scrollHeightAfter - scrollHeightBefore;
            // Maintain relative position by adding the height difference
            chatContainer.scrollTop = scrollTopBefore + heightDifference;
            setIsInfiniteScrollLoading(false);
          });
        }).catch(() => {
          setIsInfiniteScrollLoading(false);
        });
      }
    }
  }, [isLoadingOlderMessages, hasMoreMessages]);

  // Scroll listener for infinite scroll
  useEffect(() => {
    const chatContainer = chatContainerRef.current;
    if (!chatContainer) return;

    const handleScroll = () => {
      const { scrollTop } = chatContainer;
      const isNearTop = scrollTop < 100; // Within 100px of top

      if (isNearTop && !isLoadingOlderMessages && hasMoreMessages) {
        loadMoreMessages();
      }
    };

    chatContainer.addEventListener('scroll', handleScroll);
    return () => chatContainer.removeEventListener('scroll', handleScroll);
  }, [loadMoreMessages, isLoadingOlderMessages, hasMoreMessages]);

  // Scroll to bottom on messages change, but not during infinite scroll loading
  useEffect(() => {
    if (!isInfiniteScrollLoading) {
      scrollToBottom();
    }
  }, [messages, isInfiniteScrollLoading]);



  // Load previous queries and companies when username is set
  useEffect(() => {
    if (isUserNameSet && userName) {
      loadPreviousQueries();
      loadCompanies();
    }
  }, [isUserNameSet, userName]);



  const loadCompanies = async () => {
    setIsLoadingCompanies(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/companies/search`);
      const data = await response.json();

      if (data.status === 'success' && data.companies) {
        setCompanies(data.companies); // Show first 30 companies
      }
    } catch (error) {
      console.error('Error loading companies:', error);
    } finally {
      setIsLoadingCompanies(false);
    }
  };

  const handleUserNameSubmit = (e) => {
    e.preventDefault();
    if (!userName.trim()) return;

    const trimmedName = userName.trim();
    setUserName(trimmedName);
    localStorage.setItem('financial_ai_username', trimmedName);
    setIsUserNameSet(true);
  };



  const parseTableData = (tableData) => {
    try {
      if (!tableData) return null;

      // Handle both string and object inputs
      let parsed;
      if (typeof tableData === 'string') {
        parsed = JSON.parse(tableData);
      } else if (typeof tableData === 'object') {
        parsed = tableData;
      } else {
        return null;
      }

      // Helper function to transform any data with fetched_data structure
      const transformFinancialData = (data) => {
        const companiesBySlug = {};
        const flattenedData = [];

        const flattenItem = (item, depth = 0) => {
          // Prevent infinite recursion
          if (depth > 10) return;

          if (Array.isArray(item)) {
            item.forEach(subItem => flattenItem(subItem, depth + 1));
          } else if (item && typeof item === 'object') {
            // Check if this is a financial data item with the expected structure
            if (item.metric_name && item.company_slug) {
              flattenedData.push(item);
            } else if (item.fetched_data) {
              // Handle items with fetched_data structure
              flattenedData.push(item);
            }
          }
        };

        // Handle both direct arrays and nested structures
        if (Array.isArray(data)) {
          data.forEach(item => flattenItem(item));
        } else if (data && typeof data === 'object' && data.retrieved_data && Array.isArray(data.retrieved_data)) {
          // Handle the new API format with retrieved_data
          data.retrieved_data.forEach(item => flattenItem(item));
        } else {
          flattenItem(data);
        }

        flattenedData.forEach(item => {
          if (!item || !item.company_slug || !item.metric_name) {
            return;
          }

          const companySlug = item.company_slug;
          if (!companiesBySlug[companySlug]) {
            companiesBySlug[companySlug] = {
              company: companySlug,
              results: []
            };
          }

          // Handle cases where data is available
          if (item.fetched_data && item.fetched_data.retrieved_data && Array.isArray(item.fetched_data.retrieved_data)) {
            item.fetched_data.retrieved_data.forEach(dataItem => {
              if (dataItem.data && typeof dataItem.data === 'object') {
                Object.keys(dataItem.data).forEach(metricName => {
                  const metricData = dataItem.data[metricName];
                  if (metricData && typeof metricData === 'object') {
                    Object.keys(metricData).forEach(period => {
                      const periodData = metricData[period];
                      if (periodData && typeof periodData === 'object') {
                        companiesBySlug[companySlug].results.push({
                          metric_name: metricName,
                          period: period,
                          raw_value: periodData.raw_value || String(periodData.numeric_value) || 'N/A',
                          formatted_value: periodData.raw_value || String(periodData.numeric_value) || 'N/A'
                        });
                      }
                    });
                  }
                });
              }
            });
          } else {
            // Handle cases where data is N/A or not available
            companiesBySlug[companySlug].results.push({
              metric_name: item.metric_name,
              period: item.period || 'Current',
              raw_value: 'N/A',
              formatted_value: 'N/A'
            });
          }
        });

        return Object.values(companiesBySlug).filter(company => company.results.length > 0);
      };

      // Check if this data contains financial data that should be transformed
      const containsFinancialData = (data) => {
        if (!data) return false;

        const checkItem = (item, depth = 0) => {
          // Prevent infinite recursion
          if (depth > 10) return false;

          if (Array.isArray(item)) {
            return item.some(subItem => checkItem(subItem, depth + 1));
          }

          if (item && typeof item === 'object') {
            // Check for direct financial data properties
            if (item.metric_name && item.company_slug) {
              return true;
            }

            // Check for fetched_data structure
            if (item.fetched_data &&
                item.fetched_data.retrieved_data &&
                Array.isArray(item.fetched_data.retrieved_data)) {
              return item.fetched_data.retrieved_data.some(dataItem =>
                dataItem &&
                typeof dataItem === 'object' &&
                dataItem.company_slug &&
                dataItem.data &&
                typeof dataItem.data === 'object'
              );
            }

            // Check for retrieved_data structure
            if (item.retrieved_data && Array.isArray(item.retrieved_data)) {
              return item.retrieved_data.some(dataItem => checkItem(dataItem, depth + 1));
            }
          }

          return false;
        };

        return checkItem(data);
      };

      // Always try to transform if it contains financial data
      if (containsFinancialData(parsed)) {
        const transformed = transformFinancialData(parsed);
        if (transformed && transformed.length > 0) {
          return transformed;
        }
      }

      return parsed;
    } catch (error) {
      // Only log errors in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Error parsing table data:', error);
      }
      return null;
    }
  };

  // Helper function to check if table data is valid and displayable
  const hasValidTableData = (tableData) => {
    if (!tableData || !Array.isArray(tableData)) return false;

    // Check if there's at least one item with valid data
    return tableData.some(item => {
      if (!item) return false;

      // Check for new API format with fetched_data
      if (item.fetched_data && item.fetched_data.retrieved_data) {
        return item.fetched_data.retrieved_data.length > 0;
      }

      // Check for other valid formats
      return typeof item === 'object' && Object.keys(item).length > 0;
    });
  };

  const loadPreviousQueries = async (loadAll = false) => {
    try {
      if (loadAll) setIsLoadingOlderMessages(true);

      const url = `${API_BASE_URL}/api/financial/queries/?user_name=${encodeURIComponent(userName)}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.queries) {
        const previousMessages = data.queries.flatMap(queryData => {
          const messages = [{
            type: 'user',
            content: queryData.query,
            id: `${queryData.query_id}-user`,
            queryId: queryData.query_id,
            timestamp: new Date(queryData.created_at || Date.now())
          }];

          if (queryData.status === 'completed') {
            const tableData = parseTableData(queryData.table);
            messages.push({
              type: 'ai',
              content: queryData.markdown_response,
              query: queryData.query,
              id: `${queryData.query_id}-ai`,
              queryId: queryData.query_id,
              status: 'completed',
              table: tableData,
              timestamp: new Date(queryData.updated_at || Date.now())
            });
          } else if (queryData.status === 'failed') {
            messages.push({
              type: 'ai',
              content: `Error: ${queryData.error_message || 'Processing failed'}`,
              query: queryData.query,
              id: `${queryData.query_id}-ai`,
              queryId: queryData.query_id,
              status: 'failed',
              timestamp: new Date(queryData.updated_at || Date.now())
            });
          } else if (queryData.status === 'processing') {
            if (!cancelledQueriesRef.current.has(queryData.query_id)) {
              messages.push({
                type: 'ai',
                content: 'Processing your request...',
                query: queryData.query,
                id: `${queryData.query_id}-ai`,
                queryId: queryData.query_id,
                status: 'processing',
                timestamp: new Date(queryData.updated_at || Date.now())
              });
              // Start polling for this query
              startPolling(queryData.query_id);
            }
          }

          return messages;
        });

        if (loadAll) {
          // When loading more, merge with existing messages and remove duplicates
          setMessages(prev => {
            const existingIds = new Set(prev.map(m => m.id));
            const newMessages = previousMessages.filter(m => !existingIds.has(m.id));
            const merged = [...newMessages, ...prev].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            return merged;
          });
          // Increase visible count by 20 more messages
          setVisibleMessageCount(prev => Math.min(prev + 20, previousMessages.length));
        } else {
          // Initial load - replace messages
          setMessages(previousMessages);
        }
      }
    } catch (error) {
      console.error('Error loading previous queries:', error);
    } finally {
      if (loadAll) setIsLoadingOlderMessages(false);
    }
  };

  const startPolling = (queryId) => {
    if (pollingIntervalsRef.current[queryId]) return; // Already polling

    const intervalId = setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/financial/status/${queryId}/`);
        const data = await response.json();

        if (data.status === 'completed' || data.status === 'failed') {
          // Parse table data if available
          const tableData = parseTableData(data.table);

          // Update the message
          setMessages(prev => prev.map(msg => {
            if (msg.queryId === queryId && msg.type === 'ai') {
              // Ignore updates for cancelled queries
              if (cancelledQueriesRef.current.has(msg.queryId)) {
                return { ...msg, status: 'cancelled' };
              }
              return {
                ...msg,
                content: data.status === 'completed'
                  ? data.markdown_response
                  : `Error: ${data.error_message || 'Processing failed'}`,
                status: data.status,
                table: tableData,
                timestamp: new Date()
              };
            }
            return msg;
          }));

          // Clear the interval
          clearInterval(intervalId);
          delete pollingIntervalsRef.current[queryId];
          setPollingIntervals(prev => {
            const newIntervals = { ...prev };
            delete newIntervals[queryId];
            return newIntervals;
          });
          // Release active processing lock if this was the active query
          setActiveProcessingQueryId(prev => (prev === queryId ? null : prev));
        }
      } catch (error) {
        console.error('Error polling query status:', error);
      }
    }, 15000); // Poll every 15 seconds (reduced frequency for better performance)

    pollingIntervalsRef.current[queryId] = intervalId;
    setPollingIntervals(prev => ({
      ...prev,
      [queryId]: intervalId
    }));
  };

  const handleSubmit = useCallback(async (e) => {
    if (e) e.preventDefault();

    // Get value directly from input to avoid state updates during typing
    const inputValue = inputRef.current?.value || '';
    if (!inputValue.trim()) return;

    // Prevent new queries while one is already processing
    if (isLoading || activeProcessingQueryId) {
      notifyBlocked();
      return;
    }

    const userQuery = inputValue;
    if (inputRef.current) {
      inputRef.current.value = '';
    }

    await processRequest(userQuery);
  }, [isLoading]);

  const processRequest = async (userQuery) => {
    setIsLoading(true);
    const requestId = Date.now();
    setCurrentRequestId(requestId);

    abortControllerRef.current = new AbortController();

    // Add user message to chat
    const userMessage = {
      type: 'user',
      content: userQuery,
      id: `user-${Date.now()}`,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      // Submit query for processing
      const response = await fetch(`${API_BASE_URL}/api/financial/chat/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: userQuery,
          user_name: userName
        }),
        signal: abortControllerRef.current.signal // Add abort signal
      });

      const data = await response.json();

      if (response.ok) {
        // Set active processing lock
        setActiveProcessingQueryId(data.query_id);

        // Add AI response placeholder
        const aiMessage = {
          type: 'ai',
          content: 'Processing your request...',
          query: userQuery,
          id: `ai-${Date.now()}`,
          queryId: data.query_id,
          status: 'processing',
          timestamp: new Date()
        };

        setMessages(prev => [...prev, aiMessage]);

        // Start polling only if not cancelled meanwhile
        if (!cancelledQueriesRef.current.has(data.query_id)) {
          startPolling(data.query_id);
        }
      } else {
        throw new Error(data.error || 'Failed to submit query');
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Request was cancelled');
        return; // Don't show error message for cancelled requests
      }

      console.error('API Error:', error);
      // Add error message
      const errorMessage = {
        type: 'ai',
        content: `Sorry, I encountered an error: ${error.message}. Please try again.`,
        query: userQuery,
        id: `error-${Date.now()}`,
        status: 'failed',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setCurrentRequestId(null);
      abortControllerRef.current = null;
      // if ended without polling update, ensure unlock
      setActiveProcessingQueryId(null);
    }
  };



  const handleFeedback = (messageId, type) => {
    setFeedback(prev => ({
      ...prev,
      [messageId]: type
    }));
  };

  const handleCopy = async (content, messageId) => {
    try {
      // Find the message to get table data
      const message = messages.find(msg => msg.id === messageId);

      // Clean content for clipboard compatibility
      let plainText = content
        // Remove markdown formatting
        .replace(/^#{1,6}\s+/gm, '') // Remove header markers
        .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
        .replace(/\*([^*]+)\*/g, '$1') // Remove italic
        .replace(/`([^`]+)`/g, '$1') // Remove inline code
        .replace(/```[\s\S]*?```/g, '[Code Block]') // Replace code blocks
        // Convert markdown lists to plain text
        .replace(/^\s*[-*+]\s+/gm, '• ')
        .replace(/^\s*(\d+)\.\s+/gm, '$1. ')
        // Clean up markdown tables
        .replace(/\|([^|\n]+)\|/g, (_, content) => {
          return content.split('|').map(cell => cell.trim()).join(' | ');
        })
        // Remove table separator lines
        .replace(/^\s*\|[\s-|:]+\|\s*$/gm, '')
        // Clean up problematic characters that might cause clipboard issues
        .replace(/₹/g, 'Rs.')
        .replace(/✅/g, '[✓]')
        .replace(/→/g, '->')
        .replace(/—/g, '-')
        .replace(/–/g, '-')
        .replace(/"/g, '"')
        .replace(/"/g, '"')
        .replace(/'/g, "'")
        .replace(/'/g, "'")
        .replace(/…/g, '...')
        // Clean up excessive whitespace but preserve structure
        .replace(/\n{3,}/g, '\n\n')
        .replace(/\s+$/gm, '') // Remove trailing spaces
        .trim();

      // If message has table data, append it in a readable format
      if (message && message.table) {
        plainText += '\n\n--- TABLE DATA ---\n';
        plainText += formatTableDataForCopy(message.table);
      }

      // Try multiple clipboard methods for better compatibility
      try {
        await navigator.clipboard.writeText(plainText);
      } catch (clipboardError) {
        // Fallback method
        const textArea = document.createElement('textarea');
        textArea.value = plainText;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedMessageId(messageId);

      // Show professional notification
      setCopyNotification({
        show: true,
        message: 'Response copied to clipboard'
      });

      // Hide notification after 3 seconds
      setTimeout(() => {
        setCopyNotification({ show: false, message: '' });
      }, 3000);

      // Reset copy icon after 2 seconds
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
      setCopyNotification({
        show: true,
        message: 'Failed to copy content'
      });
      setTimeout(() => {
        setCopyNotification({ show: false, message: '' });
      }, 3000);
    }
  };

  // Helper function to format table data for copying
  const formatTableDataForCopy = (tableData) => {
    if (!tableData) return '';

    try {
      // Handle nested result array format
      if (Array.isArray(tableData) && tableData.length > 0 && tableData[0].result) {
        const consolidatedData = {};

        // First, consolidate all data by company and table type
        tableData.forEach((item) => {
          if (item.result && Array.isArray(item.result)) {
            item.result.forEach((resultItem) => {
              const { company_slug, table_type, data_type, data } = resultItem;

              if (data && typeof data === 'object') {
                const key = `${company_slug}_${table_type}_${data_type}`;

                if (!consolidatedData[key]) {
                  consolidatedData[key] = {
                    company: company_slug,
                    table_type,
                    data_type,
                    metrics: {}
                  };
                }

                // Merge metrics
                Object.keys(data).forEach(metricName => {
                  const metricData = data[metricName];
                  if (!consolidatedData[key].metrics[metricName]) {
                    consolidatedData[key].metrics[metricName] = {};
                  }

                  if (typeof metricData === 'object' && metricData !== null) {
                    Object.keys(metricData).forEach(period => {
                      const periodData = metricData[period];
                      if (periodData && typeof periodData === 'object') {
                        consolidatedData[key].metrics[metricName][period] = periodData;
                      }
                    });
                  }
                });
              }
            });
          }
        });

        // Now format the consolidated data
        let output = '';
        Object.values(consolidatedData).forEach((companyData) => {
          output += `\nCompany: ${companyData.company}\n`;
          output += `Type: ${companyData.table_type} (${companyData.data_type})\n`;
          output += '---\n';

          Object.keys(companyData.metrics).forEach(metricName => {
            const metricData = companyData.metrics[metricName];
            output += `${metricName}:\n`;

            Object.keys(metricData).forEach(period => {
              const periodData = metricData[period];
              output += `  ${period}: ${periodData.raw_value || periodData.value || 'N/A'}`;
              if (periodData.unit) output += ` ${periodData.unit}`;
              output += '\n';
            });
          });
          output += '\n';
        });

        return output;
      }

      // Handle retrieved_data format
      if (typeof tableData === 'object' && tableData.retrieved_data) {
        return formatTableDataForCopy(tableData.retrieved_data);
      }

      // Handle simple array format
      if (Array.isArray(tableData)) {
        let output = '';
        tableData.forEach((row, index) => {
          if (typeof row === 'object') {
            if (index === 0) {
              // Add headers
              output += Object.keys(row).join(' | ') + '\n';
              output += Object.keys(row).map(() => '---').join(' | ') + '\n';
            }
            output += Object.values(row).join(' | ') + '\n';
          }
        });
        return output;
      }

      return JSON.stringify(tableData, null, 2);
    } catch (error) {
      return 'Table data could not be formatted';
    }
  };

  const handleShowTable = (tableData) => {
    // Parse and transform the table data before setting it
    const parsedData = parseTableData(tableData);
    setCurrentTable(parsedData || tableData);
    setShowTablePanel(true);
  };

  const exportResponseAsPDF = (message) => {
    try {
      const doc = new jsPDF();
      let yPosition = 25;
      const pageWidth = doc.internal.pageSize.width;
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);

      // Helper function to check if we need a new page
      const checkPageBreak = (requiredSpace = 20) => {
        if (yPosition + requiredSpace > 270) {
          doc.addPage();
          yPosition = 25;
        }
      };

      const cleanContent = (text) => {
        if (!text) return 'No content available';

        let cleanText = text
          .replace(/Total Tests:.*?Pending: \d+/g, '')
          .replace(/\[Response truncated.*?\]/g, '')
          .replace(/console\.log.*?\n/g, '')
          .replace(/\n\s*\n\s*\n/g, '\n\n')
          .trim();

        return cleanText;
      };

      const addStructuredText = (text, fontSize, fontWeight = 'normal', spacing = 6, indent = 0) => {
        checkPageBreak(spacing + 5);
        doc.setFontSize(fontSize);
        doc.setFont('helvetica', fontWeight);

        const xPosition = margin + indent;
        const availableWidth = contentWidth - indent;
        const splitText = doc.splitTextToSize(text, availableWidth);

        doc.text(splitText, xPosition, yPosition);
        yPosition += (splitText.length * spacing) + 8;
      };

      const addSectionDivider = () => {
        checkPageBreak(15);
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 15;
      };

      addStructuredText('FINANCIAL ANALYSIS REPORT', 20, 'bold', 8);
      addStructuredText('Generated by AI Financial Assistant', 12, 'normal', 6);
      addSectionDivider();

      addStructuredText('REPORT INFORMATION', 14, 'bold', 7);
      addStructuredText(`Date Generated: ${new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}`, 10, 'normal', 5, 10);
      addStructuredText(`Time Generated: ${new Date().toLocaleTimeString('en-US')}`, 10, 'normal', 5, 10);

      if (message.query) {
        yPosition += 5;
        addStructuredText('QUERY ANALYZED:', 12, 'bold', 6);
        addStructuredText(message.query, 10, 'normal', 5, 10);
      }

      addSectionDivider();

      if (message.response || message.content) {
        addStructuredText('EXECUTIVE SUMMARY', 14, 'bold', 7);

        const responseContent = cleanContent(message.response || message.content);

        const paragraphs = responseContent.split(/\n\s*\n/).filter(p => p.trim().length > 0);

        paragraphs.forEach((paragraph, index) => {
          const trimmedParagraph = paragraph.trim();

          const hasFinancialData = /(\d+\.?\d*%|\$[\d,]+|ROCE|ROE|Revenue|Profit|EBIT|Margin)/i.test(trimmedParagraph);

          if (hasFinancialData) {
            addStructuredText('Key Financial Highlights:', 11, 'bold', 5, 10);
            addStructuredText(trimmedParagraph, 10, 'normal', 5, 15);
          } else if (trimmedParagraph.length > 50) {
            addStructuredText(trimmedParagraph, 10, 'normal', 5, 10);
          }

          if (index < paragraphs.length - 1) {
            yPosition += 5;
          }
        });

        addSectionDivider();
      }

      if (message.table && Array.isArray(message.table)) {
        addStructuredText('DETAILED FINANCIAL DATA', 14, 'bold', 7);

        message.table.forEach((companyData) => {
          checkPageBreak(50);


          addStructuredText(`${companyData.company || 'Company'} - Financial Metrics`, 12, 'bold', 6, 5);

          if (companyData.results && companyData.results.length > 0) {
            const tableData = companyData.results.map(result => [
              result.metric_name || 'N/A',
              result.period || 'N/A',
              result.raw_value || 'N/A',
              result.formatted_value || 'N/A'
            ]);

            // Create professional table
            autoTable(doc, {
              head: [['Financial Metric', 'Period', 'Raw Value', 'Formatted Value']],
              body: tableData,
              startY: yPosition,
              theme: 'striped',
              styles: {
                fontSize: 9,
                cellPadding: 4,
                lineColor: [220, 220, 220],
                lineWidth: 0.1,
                textColor: [50, 50, 50]
              },
              headStyles: {
                fillColor: [240, 248, 255],
                textColor: [0, 0, 0],
                fontStyle: 'bold',
                fontSize: 10,
                halign: 'center'
              },
              columnStyles: {
                0: { cellWidth: 50, fontStyle: 'bold', halign: 'left' },
                1: { cellWidth: 30, halign: 'center' },
                2: { cellWidth: 35, halign: 'right' },
                3: { cellWidth: 40, fontStyle: 'bold', halign: 'right' }
              },
              margin: { left: margin, right: margin },
              alternateRowStyles: {
                fillColor: [250, 250, 250]
              }
            });

            yPosition = doc.lastAutoTable.finalY + 20;
          }
        });
      }

      // ===== DOCUMENT FOOTER =====
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);

        // Footer content
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin - 25, 285);
        doc.text('Confidential Financial Analysis', margin, 285);
        doc.text('Generated by AI Financial Assistant', margin, 292);
      }

      // Save with structured filename
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      doc.save(`Financial_Analysis_Report_${timestamp}.pdf`);

    } catch (error) {
      console.error('Error generating PDF report:', error);
    }
  };

  const renderTable = (tableData) => {
    if (!tableData) return null;

    // First, try to parse and transform the table data using our dynamic parser
    const parsedData = parseTableData(tableData);
    if (parsedData && parsedData !== tableData) {
      // If transformation occurred, use the parsed data
      tableData = parsedData;
    }

    // Handle the retrieved_data structure from API response
    if (typeof tableData === 'object' && tableData.retrieved_data && Array.isArray(tableData.retrieved_data)) {
      return renderRetrievedDataTable(tableData.retrieved_data);
    }

    // Handle nested result array format (new API structure)
    if (Array.isArray(tableData) && tableData.length > 0 && tableData[0].result && Array.isArray(tableData[0].result)) {
      // Flatten the nested result arrays
      const flattenedData = [];
      tableData.forEach(item => {
        if (item.result && Array.isArray(item.result)) {
          flattenedData.push(...item.result);
        }
      });
      return renderRetrievedDataTable(flattenedData);
    }

    // Handle the new financial data format with multiple companies
    if (Array.isArray(tableData) && tableData.length > 0 && tableData[0].company && tableData[0].results) {
      return renderFinancialTable(tableData);
    }

    // Handle direct array of retrieved data items
    if (Array.isArray(tableData) && tableData.length > 0 && tableData[0].company_slug && tableData[0].data) {
      return renderRetrievedDataTable(tableData);
    }

    // Handle legacy table formats
    let rows = [];
    let headers = [];

    if (Array.isArray(tableData)) {
      if (tableData.length === 0) return null;

      // If first item is an object, use keys as headers
      if (typeof tableData[0] === 'object') {
        headers = Object.keys(tableData[0]);
        rows = tableData;
      } else {
        // If it's array of arrays, first row might be headers
        headers = tableData[0];
        rows = tableData.slice(1);
      }
    } else if (typeof tableData === 'object' && tableData.data) {
      // Handle structured table data
      headers = tableData.headers || Object.keys(tableData.data[0] || {});
      rows = tableData.data || [];
    }

    if (!headers.length || !rows.length) return null;

    return (
      <div className="overflow-auto max-h-96" style={{ backgroundColor: '#111827' }}>
        <table className="w-full text-sm">
          <thead className="sticky top-0 light-table-header">
            <tr>
              {headers.map((header, idx) => (
                <th key={idx} className="text-left p-3 border-b light-table-cell font-semibold light-table-header">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => (
              <tr key={rowIdx} className="light-table-row transition-colors" style={{ backgroundColor: '#1f2937' }}>
                {headers.map((header, colIdx) => {
                  let cellValue;
                  if (typeof row === 'object') {
                    cellValue = row[header];
                  } else {
                    cellValue = row[colIdx];
                  }

                  // Ensure we render a string, not an object
                  let displayValue;
                  if (cellValue === null || cellValue === undefined) {
                    displayValue = 'N/A';
                  } else if (typeof cellValue === 'object') {
                    // Try to extract meaningful data from objects
                    if (cellValue.raw_value !== undefined) {
                      displayValue = String(cellValue.raw_value);
                    } else if (cellValue.numeric_value !== undefined) {
                      displayValue = String(cellValue.numeric_value);
                    } else if (cellValue.value !== undefined) {
                      displayValue = String(cellValue.value);
                    } else if (Array.isArray(cellValue)) {
                      displayValue = cellValue.join(', ');
                    } else {
                      // For complex objects, show a readable representation
                      displayValue = JSON.stringify(cellValue, null, 2);
                    }
                  } else {
                    displayValue = String(cellValue);
                  }

                  return (
                    <td key={colIdx} className="p-3 border-b light-table-cell">
                      {displayValue}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderRetrievedDataTable = (retrievedData) => {
    if (!retrievedData || !Array.isArray(retrievedData) || retrievedData.length === 0) {
      return null;
    }

    // Transform the retrieved_data structure to match the expected format
    const transformedData = [];

    // Helper function to process data items
    const processDataItem = (company_slug, table_type, data_type, data, transformedData) => {
      if (data && typeof data === 'object') {
        // Convert the data object to results array
        const results = [];

        Object.keys(data).forEach(metricName => {
          const metricData = data[metricName];

          if (typeof metricData === 'object' && metricData !== null) {
            Object.keys(metricData).forEach(period => {
              const periodData = metricData[period];

              if (periodData && typeof periodData === 'object') {
                results.push({
                  metric_name: metricName,
                  period: period,
                  raw_value: periodData.raw_value || periodData.value || 'N/A',
                  numeric_value: periodData.numeric_value || 0,
                  unit: periodData.unit || '',
                  period_type: periodData.period_type || 'unknown'
                });
              }
            });
          }
        });

        // Create a separate entry for each table section
        if (results.length > 0) {
          transformedData.push({
            company: company_slug,
            table_type: table_type,
            data_type: data_type,
            results: results
          });
        }
      }
    };

    retrievedData.forEach((item) => {
      // Handle nested result structure
      if (item.result && Array.isArray(item.result)) {
        item.result.forEach((resultItem) => {
          const { company_slug, table_type, data_type, data } = resultItem;

          if (!data) {
            return;
          }

          processDataItem(company_slug, table_type, data_type, data, transformedData);
        });
      } else {
        // Handle direct structure (legacy format)
        const { company_slug, table_type, data_type, data } = item;

        if (!data) {
          return;
        }

        processDataItem(company_slug, table_type, data_type, data, transformedData);
      }
    });

    if (transformedData.length === 0) {
      return (
        <div className="text-center text-gray-400 py-8">
          <p>No financial data available to display</p>
        </div>
      );
    }

    return renderFinancialTable(transformedData);
  };

  const renderFinancialTable = (financialData) => {
    if (!financialData || !Array.isArray(financialData) || financialData.length === 0) return null;

    if (tableViewMode === 'separate') {
      return renderSeparateCompanyTables(financialData);
    } else {
      return renderCombinedCompanyTable(financialData);
    }
  };

  const renderSeparateCompanyTables = (financialData) => {
    return (
      <div className="space-y-6">
        {financialData.map((companyData, companyIdx) => {
          const { company, results } = companyData;

          // Group by metric and period for this company
          const metricsMap = new Map();
          const periodsSet = new Set();

          results.forEach(result => {
            const { metric_name, period, raw_value } = result;

            if (!metricsMap.has(metric_name)) {
              metricsMap.set(metric_name, new Map());
            }

            metricsMap.get(metric_name).set(period, raw_value);
            periodsSet.add(period);
          });

          const periods = Array.from(periodsSet).sort();
          const metrics = Array.from(metricsMap.keys()).sort();

          if (metrics.length === 0 || periods.length === 0) return null;

          return (
            <div key={companyIdx} className="bg-gray-800/50 rounded-lg border border-gray-600 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Building2 className="w-5 h-5 text-blue-400" />
                  <h3 className="text-lg font-semibold text-white">{company}</h3>
                </div>
                <div className="text-xs text-gray-400">
                  {metrics.length} metrics × {periods.length} periods
                </div>
              </div>

              <div className="overflow-auto max-h-80" style={{ backgroundColor: '#111827' }}>
                <table className="w-full text-sm">
                  <thead className="sticky top-0 light-table-header">
                    <tr>
                      <th className="text-left p-3 border-b light-table-cell font-semibold light-table-header min-w-32" style={{color: '#ffffff'}}>
                        Metric
                      </th>
                      {periods.map((period, idx) => (
                        <th key={idx} className="text-center p-3 border-b light-table-cell font-semibold light-table-header min-w-24" style={{color: '#ffffff'}}>
                          {period}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.map((metric, rowIdx) => (
                      <tr key={rowIdx} className="light-table-row transition-colors" style={{ backgroundColor: '#1f2937' }}>
                        <td className="p-3 border-b light-table-cell font-medium" style={{ backgroundColor: '#1f2937' }}>
                          {metric.replace(/-$/, '')}
                        </td>
                        {periods.map((period, colIdx) => {
                          const value = metricsMap.get(metric)?.get(period);
                          return (
                            <td key={colIdx} className="p-3 border-b light-table-cell text-center">
                              {value ? (
                                <span className={`inline-block px-2 py-1 rounded text-sm font-medium ${
                                  value.includes('%')
                                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                    : value.includes('₹') || value.includes('$')
                                    ? 'bg-green-100 text-green-700 border border-green-200'
                                    : 'light-bg-primary chat-response-text light-border border'
                                }`}>
                                  {value}
                                </span>
                              ) : (
                                <span className="light-text-secondary text-xs">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderCombinedCompanyTable = (financialData) => {
    if (!financialData || !Array.isArray(financialData) || financialData.length === 0) return null;

    // Removed console.log to improve performance

    // Create a comprehensive view showing all data sections
    const companies = [...new Set(financialData.map(item => item.company))].sort();

    return (
      <div className="space-y-5">
        <div className="text-xs text-gray-400 bg-gray-800/50 p-3 rounded border border-gray-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              <span>inancial Analysis</span>
            </div>
            <span>{companies.length} companies × {financialData.length} data sections</span>
          </div>
        </div>

        {companies.map((company, companyIdx) => {
          // Get all data sections for this company
          const companyData = financialData.filter(item => item.company === company);
          // Removed console.log to improve performance

          return (
            <details key={companyIdx} className="bg-gray-800/30 rounded-lg border border-gray-600 overflow-hidden" open>
              <summary className="bg-gray-800/50 px-4 py-3 cursor-pointer hover:bg-gray-800/70 transition-colors border-b border-gray-600">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Building2 className="w-5 h-5 text-purple-400" />
                    <h3 className="text-lg font-semibold text-white">{company}</h3>
                  </div>
                  <div className="text-xs text-gray-400 flex items-center space-x-4">
                    <span>{companyData.length} data sections</span>
                  </div>
                </div>
              </summary>

              <div className="p-4 space-y-3">
                {companyData.map((dataSection, sectionIdx) => {
                  const { table_type, data_type, results } = dataSection;
                  // Removed console.log to improve performance

                  if (!results || results.length === 0) {
                    return null;
                  }

                  // Process metrics and periods for this section
                  const metricsMap = new Map();
                  const periodsSet = new Set();

                  results.forEach(result => {
                    const { metric_name, period, raw_value } = result;
                    // Removed console.log to improve performance

                    if (!metricsMap.has(metric_name)) {
                      metricsMap.set(metric_name, new Map());
                    }

                    metricsMap.get(metric_name).set(period, raw_value);
                    periodsSet.add(period);
                  });

                  const periods = Array.from(periodsSet).sort();
                  const metrics = Array.from(metricsMap.keys()).sort();

                  if (metrics.length === 0 || periods.length === 0) {
                    return null;
                  }

                  // Create unique section identifier
                  const sectionId = `${company}-${table_type}-${data_type}-${sectionIdx}`;

                  return (
                    <div key={sectionId} className="bg-gray-700/20 rounded-lg border border-gray-600/50 overflow-hidden">
                      <div className="bg-gray-700/40 px-3 py-2 border-b border-gray-600/50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className={`text-xs px-2 py-1 rounded border font-medium ${
                              table_type === 'quarters'
                                ? 'bg-blue-800/30 text-blue-300 border-blue-800/50'
                                : table_type === 'annual'
                                ? 'bg-green-800/30 text-green-300 border-green-800/50'
                                : 'bg-gray-700/50 text-gray-300 border-gray-600'
                            }`}>
                              {table_type?.toUpperCase() || 'DATA'}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded border font-medium ${
                              data_type === 'consolidated'
                                ? 'bg-orange-800/30 text-orange-300 border-orange-800/50'
                                : data_type === 'standalone'
                                ? 'bg-cyan-800/30 text-cyan-300 border-cyan-800/50'
                                : 'bg-gray-700/50 text-gray-300 border-gray-600'
                            }`}>
                              {data_type?.toUpperCase() || 'TYPE'}
                            </span>
                            <span className="text-xs text-gray-500">
                              (Section {sectionIdx + 1})
                            </span>
                          </div>
                          <div className="text-xs text-gray-400">
                            {metrics.length} metrics × {periods.length} periods
                          </div>
                        </div>
                      </div>

                      <div className="p-3">
                        <div className="overflow-auto max-h-64">
                          <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-gray-800">
                              <tr>
                                <th className="text-left p-2 border-b border-gray-600 font-medium bg-gray-800 min-w-32" style={{color: '#ffffff'}}>
                                  Metric
                                </th>
                                {periods.map((period, idx) => (
                                  <th key={`${period}-${idx}`} className="text-center p-2 border-b border-gray-600 font-medium bg-gray-800 min-w-20" style={{color: '#ffffff'}}>
                                    {period}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {metrics.map((metric, rowIdx) => (
                                <tr key={`${metric}-${rowIdx}`} className="hover:bg-gray-700/50 transition-colors">
                                  <td className="p-2 border-b border-gray-700/50 text-gray-200 font-medium bg-gray-800/20 text-xs">
                                    {metric.replace(/-$/, '')}
                                  </td>
                                  {periods.map((period, colIdx) => {
                                    const value = metricsMap.get(metric)?.get(period);
                                    return (
                                      <td key={`${period}-${colIdx}`} className="p-2 border-b border-gray-700/50 text-center text-gray-300">
                                        {value ? (
                                          <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${
                                            value.toString().includes('%')
                                              ? 'bg-blue-900/30 text-blue-300 border border-blue-800/50'
                                              : value.toString().includes('₹') || value.toString().includes('')
                                              ? 'bg-green-900/30 text-green-300 border border-green-800/50'
                                              : 'bg-gray-700/50 text-gray-300'
                                          }`}>
                                            {value}
                                          </span>
                                        ) : (
                                          <span className="text-gray-500 text-xs">—</span>
                                        )}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </details>
          );
        })}
      </div>
    );
  };


  const getStatusIcon = (status) => {
    switch (status) {
      case 'processing':
        return <Clock className="w-4 h-4 text-blue-400" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return null;
    }
  };

  const handleStopRequest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Prevent late responses for the current query
    if (currentRequestId) {
      cancelledQueriesRef.current.add(currentRequestId);
    }

    // Add any in-flight processing queryIds to cancelled set
    const cancelledIds = new Set();
    setMessages(prev => prev.map(msg => {
      if (msg.status === 'processing' && msg.type === 'ai') {
        if (msg.queryId) cancelledIds.add(msg.queryId);
        return { ...msg, content: 'Request cancelled by user.', status: 'cancelled', timestamp: new Date() };
      }
      return msg;
    }));
    cancelledIds.forEach(id => cancelledQueriesRef.current.add(id));

    // Clear all polling intervals immediately
    Object.values(pollingIntervalsRef.current).forEach(intervalId => clearInterval(intervalId));
    pollingIntervalsRef.current = {};
    setPollingIntervals({});

    // Reset loading states
    setIsLoading(false);
    setCurrentRequestId(null);
  };

  // Agent Activity Animation Component
  const AgentActivityAnimation = ({ isVisible }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [elapsedTime, setElapsedTime] = useState(0);

    const agentSteps = [
      {
        agent: 'Query Agent',
        icon: Search,
        activity: 'Parsing and understanding your request...',
        color: 'text-blue-400',
        bgColor: 'bg-blue-900/30',
        borderColor: 'border-blue-700'
      },
      {
        agent: 'Data Agent',
        icon: Database,
        activity: 'Fetching financial data from multiple sources...',
        color: 'text-green-400',
        bgColor: 'bg-green-900/30',
        borderColor: 'border-green-700'
      },
      {
        agent: 'Analysis Agent',
        icon: Brain,
        activity: 'Performing complex financial calculations...',
        color: 'text-purple-400',
        bgColor: 'bg-purple-900/30',
        borderColor: 'border-purple-700'
      },
      {
        agent: 'Research Agent',
        icon: FileText,
        activity: 'Cross-referencing market trends and reports...',
        color: 'text-orange-400',
        bgColor: 'bg-orange-900/30',
        borderColor: 'border-orange-700'
      },
      {
        agent: 'Visualization Agent',
        icon: BarChart3,
        activity: 'Creating charts and comprehensive reports...',
        color: 'text-cyan-400',
        bgColor: 'bg-cyan-900/30',
        borderColor: 'border-cyan-700'
      },
      {
        agent: 'Quality Agent',
        icon: CheckCircle,
        activity: 'Reviewing and validating final analysis...',
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-900/30',
        borderColor: 'border-emerald-700'
      }
    ];

    useEffect(() => {
      if (!isVisible) {
        setCurrentStep(0);
        setElapsedTime(0);
        return;
      }

      // Change step every 4 seconds
      const stepInterval = setInterval(() => {
        setCurrentStep(prev => (prev + 1) % agentSteps.length);
      }, 4000);

      // Update timer every second for real-time display
      const timeInterval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000); // Update every second: 1, 2, 3, 4...

      return () => {
        clearInterval(stepInterval);
        clearInterval(timeInterval);
      };
    }, [isVisible]);

    if (!isVisible) return null;

    const formatElapsedTime = (seconds) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
      <div className="section section-subtle mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="w-2.5 h-2.5 bg-orange-500 rounded-full animate-pulse"></div>
            <h3 className="section-title text-gradient">Multi-Agent Processing</h3>
          </div>
          <div className="flex items-center space-x-3">
            <div className="text-sm light-text-secondary flex items-center space-x-2">
              <Clock className="w-4 h-4" />
              <span>{formatElapsedTime(elapsedTime)}</span>
            </div>
            <button
              onClick={handleStopRequest}
              className="bg-red-600 hover:bg-red-500 text-white text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1"
              title="Stop processing"
            >
              <X className="w-3 h-3" />
              <span>Stop</span>
            </button>
          </div>
        </div>

        {/* Progress stripe for ongoing processing */}
        <div className="progress-bar mb-3">
          <span></span>
        </div>

        <div className="space-y-3">
          {agentSteps.map((step, index) => {
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            const IconComponent = step.icon;

            return (
              <div
                key={index}
                className={`flex items-center space-x-3 p-3 rounded-lg border transition-all duration-500 ${
                  isActive
                    ? 'section elevate border-orange-200 transform scale-[1.01]'
                    : isCompleted
                    ? 'section opacity-85'
                    : 'section opacity-60'
                }`}
              >
                <div className={`p-2 rounded border ${
                  isActive
                    ? 'bg-orange-50 border-orange-200'
                    : isCompleted
                    ? 'bg-green-50 border-green-200'
                    : 'light-bg-secondary light-border'
                }`}>
                  <IconComponent
                    className={`w-5 h-5 ${
                      isActive
                        ? 'text-orange-500 animate-pulse'
                        : isCompleted
                        ? 'text-green-500'
                        : 'light-text-secondary'
                    }`}
                  />
                </div>

                <div className="flex-1">
                  <h4 className={`font-medium ${
                    isActive
                      ? 'light-text-primary'
                      : isCompleted
                      ? 'text-green-700'
                      : 'light-text-secondary'
                  }`}>
                    {step.agent}
                  </h4>
                  <p className={`text-sm ${
                    isActive
                      ? 'light-text-secondary'
                      : isCompleted
                      ? 'text-green-600'
                      : 'light-text-secondary opacity-75'
                  }`}>
                    {step.activity}
                  </p>
                </div>

                <div className="flex items-center">
                  {isActive && (
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  )}
                  {isCompleted && (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };





  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Cleanup intervals and timeouts on unmount - run only once
  useEffect(() => {
    return () => {
      // Clear polling intervals
      Object.values(pollingIntervalsRef.current).forEach(intervalId => {
        clearInterval(intervalId);
      });
      pollingIntervalsRef.current = {};

      // Cleanup complete
    };
  }, []); // Empty dependency array - run only on mount/unmount

  // If username is not set, show the login form
  if (!isUserNameSet) {
    return (
      <div className="min-h-screen light-bg-primary light-text-primary flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <img
                src="/logo.png"
                alt="FinSight Logo"
                className="h-16 w-auto object-contain"
              />
            </div>
            <h1 className="text-3xl font-bold text-gradient mb-2">
              FinSight
            </h1>
            <p className="light-text-secondary">
              Professional Financial Analysis Platform
            </p>
          </div>

          <div className="light-bg-secondary rounded-lg light-border border p-6 main-shadow">
            <div className="text-center mb-6">
              <div className="secondary-gradient p-2 rounded inline-block mb-3 border light-border">
                <User className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-semibold mb-2 light-text-primary">Access Required</h2>
              <p className="light-text-secondary text-sm">Please enter your name to continue</p>
            </div>

            <form onSubmit={handleUserNameSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium light-text-primary mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full light-bg-primary light-text-primary rounded border light-border px-3 py-3 focus:outline-none focus:border-orange-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={!userName.trim()}
                className="w-full primary-gradient hover:opacity-90 disabled:opacity-50 text-white rounded py-3 font-medium transition-all flex items-center justify-center space-x-2 main-shadow"
              >
                <span>Continue</span>
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Main chat interface
  return (
    <div className="h-screen light-bg-primary light-text-primary overflow-hidden fixed inset-0">
      {/* Sticky Company Selector - Always visible */}
      <div className="sticky z-50 light-bg-secondary backdrop-blur-sm border-b light-border px-4 py-2 top-16">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-3">
              <Building2 className="w-4 h-4" style={{color: '#e48415'}} />
              <span className="light-text-secondary">Available Companies:</span>
              {isLoadingCompanies && <RefreshCw className="w-4 h-4 animate-spin" style={{color: '#e48415'}} />}
              {companies.length > 0 && (
                <div className="flex space-x-2 overflow-x-auto">
                  {companies.map((company, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        if (inputRef.current) {
                          inputRef.current.value = `Tell me about ${company.slug}`;
                          inputRef.current.focus();
                        }
                      }}
                      className="flex-shrink-0 pro-chip text-xs"
                      disabled={isLoading}
                    >
                      {company.slug}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Query counter moved to right side of company selector */}
            <div className="text-xs light-text-secondary light-bg-primary px-3 py-1 rounded-lg light-border border">
              {queryCount} queries processed
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`transition-all duration-300 ${showTablePanel ? 'mr-96' : ''}`}>

        {/* Main Chat Container */}
        <div className="max-w-7xl mx-auto px-4 py-2">
          <div className="light-bg-secondary rounded-xl light-border border overflow-hidden main-shadow">
            <div
              ref={chatContainerRef}
              className="h-[calc(100vh-120px)] overflow-y-auto p-4 space-y-4"
            >
              {messages.length === 0 ? (
                <div className="text-center light-text-secondary py-12">
                  <div className="light-bg-primary p-6 rounded-lg max-w-2xl mx-auto light-border border">
                    <Bot className="w-12 h-12 mx-auto mb-3" style={{color: '#e48415'}} />
                    <p className="text-lg mb-3 text-gradient">Financial Analysis Ready</p>
                    <p className="text-sm mb-6 light-text-secondary">Ask questions about companies, financial metrics, or market analysis</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                      <div className="light-bg-secondary p-4 rounded light-border border">
                        <h3 className="font-medium mb-2 text-gradient">Query Examples:</h3>
                        <ul className="text-sm space-y-1">
                          <li className="light-text-secondary">• Compare UltraTech and ACC results</li>
                          <li className="light-text-secondary">• Infosys EPS for Q4 2024</li>
                          <li className="light-text-secondary">• TCS profit margin analysis</li>
                        </ul>
                      </div>
                      <div className="light-bg-secondary p-4 rounded light-border border">
                        <h3 className="font-medium mb-2 text-gradient">System Features:</h3>
                        <ul className="text-sm space-y-1">
                          <li className="light-text-secondary">• Multi-agent processing</li>
                          <li className="light-text-secondary">• Real-time data analysis</li>
                          <li className="light-text-secondary">• Comprehensive reporting</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Loading indicator at top when loading more messages */}
                  {isLoadingOlderMessages && (
                    <div className="flex justify-center mb-4 py-2">
                      <div className="flex items-center space-x-2 text-sm light-text-secondary">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Loading older messages...</span>
                      </div>
                    </div>
                  )}

                  {/* Show message when no more messages to load */}
                  {!hasMoreMessages && messages.length > 20 && (
                    <div className="flex justify-center mb-4 py-2">
                      <div className="text-xs light-text-secondary bg-gray-50 px-3 py-1 rounded-full">
                        All messages loaded
                      </div>
                    </div>
                  )}

                  {visibleMessages.map((message) => (
                    <div key={message.id} className="space-y-2">
                    {message.type === 'user' ? (
                      <div className="flex justify-end">
                        <div className="rounded-lg rounded-br-sm px-4 py-3 max-w-2xl" style={{ backgroundColor: '#f5e6d3', color: '#1a1a1a' }}>
                          <p className="leading-relaxed">{message.content}</p>
                          {message.timestamp && (
                            <p className="text-xs opacity-70 mt-1">{formatTime(message.timestamp)}</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {/* Show agent activity animation when processing */}
                        {message.status === 'processing' && (
                          <AgentActivityAnimation isVisible={true} />
                        )}

                        <div className="flex justify-start">
                          <div className="light-bg-secondary light-text-primary rounded-lg rounded-bl-sm px-4 py-3 max-w-4xl light-border border professional-card">
                            <div className="flex items-center space-x-2 mb-3">
                              <div className="secondary-gradient p-1 rounded light-border border">
                                <Bot className="w-4 h-4 text-white" />
                              </div>
                              <div className="flex items-center space-x-2">
                                {getStatusIcon(message.status)}
                                <span className="text-sm light-text-primary font-medium capitalize">
                                  {message.status || 'Response'}
                                </span>
                                {message.timestamp && (
                                  <span className="text-xs light-text-secondary">
                                    • {formatTime(message.timestamp)}
                                  </span>
                                )}
                              </div>
                              <div className="flex-1"></div>
                              {hasValidTableData(message.table) && (
                                <button
                                  onClick={() => handleShowTable(message.table)}
                                  className="pro-icon-btn text-xs"
                                  title="View table data"
                                >
                                  <Table className="w-4 h-4" style={{color:'#e48415'}} />
                                  <span>Table</span>
                                </button>
                              )}
                              {message.status === 'completed' && (
                                <button
                                  onClick={() => handleCopy(message.content, message.id)}
                                  className="p-1 rounded light-hover transition-colors"
                                  title="Copy response"
                                >
                                  {copiedMessageId === message.id ? (
                                    <Check className="w-4 h-4 text-green-500" />
                                  ) : (
                                    <Copy className="w-4 h-4" style={{color: '#e48415'}} />
                                  )}
                                </button>
                              )}
                              {message.status === 'completed' && (
                                <button
                                  onClick={() => exportResponseAsPDF(message)}
                                  className="p-1 rounded light-hover transition-colors"
                                  title="Export as PDF"
                                >
                                  <Download className="w-4 h-4" style={{color: '#e48415'}} />
                                </button>
                              )}
                            </div>

                            <div className="prose prose-invert max-w-none chat-response-text">
                              {message.status === 'processing' ? (
                                <div className="flex items-center space-x-3 py-4">
                                  <div className="flex space-x-1">
                                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                                  </div>
                                  <span className="text-gray-300">Agents are working on your request...</span>
                                </div>
                              ) : (
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm]}
                                  components={{
                                    h1: ({children}) => (
                                      <h1 className="text-2xl font-black mt-8 mb-6 border-b-3 border-gradient-to-r from-orange-400 to-red-400 pb-4 tracking-tight">
                                        <span className="text-gray-900 font-black">
                                          {children}
                                        </span>
                                      </h1>
                                    ),
                                    h2: ({children}) => (
                                      <h2 className="text-xl font-black chat-response-text mt-6 mb-4 border-l-4 border-orange-400 pl-4 py-2 bg-gradient-to-r from-orange-50 to-transparent rounded-r-lg">
                                        <span className="text-gray-900 font-black">{children}</span>
                                      </h2>
                                    ),
                                    h3: ({children}) => (
                                      <h3 className="text-lg font-black chat-response-text mt-5 mb-3">
                                        <span className="font-black text-gray-900">{children}</span>
                                      </h3>
                                    ),
                                    h4: ({children}) => (
                                      <h4 className="text-base font-bold chat-response-text mt-4 mb-2 text-gray-800 uppercase tracking-wide text-sm">
                                        {children}
                                      </h4>
                                    ),
                                    p: ({children}) => {
                                      const text = typeof children === 'string' ? children : (Array.isArray(children) ? children.join('') : '');

                                      // Check for financial data format (Label: Value)
                                      const isFinancialData = /^[^:]+:\s*₹/.test(text) || /^[A-Za-z\s]+:\s*\d/.test(text);

                                      // Check for source information
                                      const isSourceInfo = text.includes('📍 Source:') || text.includes('Extracted on:');

                                      if (isFinancialData) {
                                        const parts = text.split(':');
                                        if (parts.length === 2) {
                                          return (
                                            <div className="chat-response-text mb-3 leading-relaxed text-gray-700 text-base flex justify-between items-center py-2 border-b border-gray-100">
                                              <span className="font-medium text-gray-800">{parts[0].trim()}</span>
                                              <span className="font-bold text-gray-900 ml-4">{parts[1].trim()}</span>
                                            </div>
                                          );
                                        }
                                      }

                                      if (isSourceInfo) {
                                        return (
                                          <div className="chat-response-text mb-4 text-xs text-gray-500 bg-gray-50 p-3 rounded border-l-2 border-blue-200">
                                            {children}
                                          </div>
                                        );
                                      }

                                      return (
                                        <p className="chat-response-text mb-5 leading-relaxed text-gray-700 text-base">
                                          {children}
                                        </p>
                                      );
                                    },
                                    ul: ({children}) => (
                                      <ul className="chat-response-text mb-6 space-y-2 unordered-list">
                                        {children}
                                      </ul>
                                    ),
                                    ol: ({children}) => (
                                      <ol className="chat-response-text mb-6 space-y-2 ordered-list">
                                        {children}
                                      </ol>
                                    ),
                                    li: ({children}) => (
                                      <li className="chat-response-text mb-2 text-gray-700 leading-relaxed">
                                        {children}
                                      </li>
                                    ),
                                    strong: ({children}) => (
                                      <strong className="chat-response-text font-bold text-gray-900">
                                        {children}
                                      </strong>
                                    ),
                                    em: ({children}) => (
                                      <em className="text-orange-600 italic font-semibold">
                                        {children}
                                      </em>
                                    ),
                                    code: ({children, inline}) => {
                                      if (inline) {
                                        return (
                                          <code className="bg-gray-800 text-green-400 px-2 py-1 rounded text-sm font-mono border border-gray-600 shadow-sm">
                                            {children}
                                          </code>
                                        );
                                      }
                                      return (
                                        <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto border border-gray-700 shadow-lg my-6 relative">
                                          <div className="flex items-center mb-3 text-gray-400 text-xs border-b border-gray-700 pb-2">
                                            <div className="flex space-x-1 mr-3">
                                              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                                              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                            </div>
                                            <span className="font-mono">Code Block</span>
                                          </div>
                                          <div className="font-mono text-sm leading-relaxed">
                                            <code>{children}</code>
                                          </div>
                                        </pre>
                                      );
                                    },
                                    blockquote: ({children}) => (
                                      <blockquote className="border-l-4 border-blue-400 pl-6 py-4 bg-gradient-to-r from-blue-50 to-transparent rounded-r-lg my-6 relative shadow-sm">
                                        <div className="absolute top-3 left-2 text-blue-400 text-3xl font-serif opacity-50">"</div>
                                        <div className="italic text-gray-700 font-medium pl-4 leading-relaxed">
                                          {children}
                                        </div>
                                        <div className="absolute bottom-3 right-4 text-blue-400 text-3xl font-serif opacity-50 rotate-180">"</div>
                                      </blockquote>
                                    ),
                                    table: ({children}) => (
                                      <div className="overflow-x-auto my-4">
                                        <table className="min-w-full light-border border rounded-lg overflow-hidden">{children}</table>
                                      </div>
                                    ),
                                    thead: ({children}) => <thead className="light-table-header">{children}</thead>,
                                    tbody: ({children}) => <tbody>{children}</tbody>,
                                    tr: ({children}) => <tr className="border-b light-border light-table-row">{children}</tr>,
                                    th: ({children}) => (
                                      <th className="text-left p-3 light-border border chat-response-text font-semibold light-table-header" style={{color: '#ffffff'}}>
                                        <span style={{color: '#ffffff'}}>{children}</span>
                                      </th>
                                    ),
                                    td: ({children}) => (
                                      <td className="p-3 light-border border chat-response-text">{children}</td>
                                    ),
                                    a: ({children, href}) => (
                                      <a href={href} className="text-orange-600 hover:text-orange-700 underline font-medium" target="_blank" rel="noopener noreferrer">
                                        {children}
                                      </a>
                                    )
                                  }}
                                >
                                  {message.content}
                                </ReactMarkdown>
                              )}
                            </div>
                          </div>
                        </div>

                        {message.status === 'completed' && (
                          <div className="flex items-center space-x-3 ml-4">
                            <span className="text-sm text-gray-400">Helpful?</span>
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => handleFeedback(message.id, 'up')}
                                className={`p-1 rounded transition-colors ${
                                  feedback[message.id] === 'up'
                                    ? 'text-green-400 bg-green-400/20'
                                    : 'text-gray-400 hover:text-green-400'
                                }`}
                              >
                                <ThumbsUp className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleFeedback(message.id, 'down')}
                                className={`p-1 rounded transition-colors ${
                                  feedback[message.id] === 'down'
                                    ? 'text-red-400 bg-red-400/20'
                                    : 'text-gray-400 hover:text-red-400'
                                }`}
                              >
                                <ThumbsDown className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    </div>
                  ))}
                </>
              )}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-700 rounded-lg rounded-bl-sm px-4 py-3 border border-gray-600">
                    <div className="flex items-center space-x-3">
                      <div className="bg-purple-800/30 p-1 rounded border border-purple-700">
                        <Bot className="w-4 h-4 text-purple-400" />
                      </div>
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                      <span className="text-sm text-gray-300">Submitting to agents...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="light-bg-secondary px-4 py-3 border-t light-border main-shadow">


              {/* Show processing message when disabled */}
              {isLoading && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                    <span className="text-orange-700 text-sm font-medium">
                      Processing your request... Please wait before sending another query.
                    </span>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-2">
                <div className="flex space-x-3">
                  <div className="flex-1">
                    <div className="relative">
                      <input
                        ref={inputRef}
                        type="text"
                        placeholder={isLoading ? "Please wait for current query to complete..." : "e.g., Compare UltraTech and ACC quarterly results"}
                        className={`input w-full pr-12 placeholder-gray-500 main-shadow ${isLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (inputRef.current) {
                            if (isLoading || activeProcessingQueryId) { notifyBlocked(); return; }
                            inputRef.current.value = '';
                            inputRef.current.focus();
                          }
                        }}
                        disabled={isLoading}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 light-text-secondary hover:text-orange-500 text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="primary-gradient hover:opacity-90 disabled:opacity-50 text-white rounded-lg px-4 py-2.5 flex items-center space-x-2 transition-all font-medium main-shadow self-end"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline text-sm">
                      {isLoading ? 'Processing...' : 'Send'}
                    </span>
                  </button>
                </div>

                {/* Quick Suggestions */}
                <div className="flex flex-wrap gap-2">
                  {[
                    "What is YoY growth of UTCL(Ultratech)",
                    "ABCAPITAL ROE analysis",
                    "HINDALCO Stock price analysis over past 1 yr."
                  ].map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        if (inputRef.current) {
                          if (isLoading || activeProcessingQueryId) { notifyBlocked(); return; }
                          inputRef.current.value = suggestion;
                          inputRef.current.focus();
                        }
                      }}
                      className="text-xs pro-chip disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isLoading}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Table Side Panel */}
      {showTablePanel && (
        <div
          className="fixed right-0 top-0 h-screen light-bg-secondary backdrop-blur-sm border-l light-border main-shadow flex flex-col"
          style={{
            width: `${Math.min(tablePanelWidth, 600)}px`,
            zIndex: 9999
          }}
        >
          {/* Panel Header */}
          <div className="light-bg-primary px-4 py-3 border-b light-border flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Table className="w-5 h-5" style={{color: '#e48415'}} />
              <h3 className="text-lg font-medium text-gradient">Data Table</h3>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setTablePanelWidth(prev => Math.max(350, prev - 50))}
                className="p-2 rounded light-hover transition-colors"
                title="Narrow panel"
              >
                <ChevronLeft className="w-4 h-4 light-text-secondary hover:text-orange-500" />
              </button>
              <button
                onClick={() => setTablePanelWidth(prev => Math.min(600, prev + 50))}
                className="p-2 rounded light-hover transition-colors"
                title="Widen panel"
              >
                <ChevronRight className="w-4 h-4 light-text-secondary hover:text-orange-500" />
              </button>
            </div>
          </div>

          {/* Close Button - positioned in original location */}
          <button
            onClick={() => setShowTablePanel(false)}
            className="absolute top-16 right-3 p-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors z-10"
            title="Close panel"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Panel Content */}
          <div className="flex-1 overflow-hidden p-4">
            <div className="rounded-lg h-full overflow-hidden" style={{backgroundColor: '#0f172a', border: '1px solid #1f2937', boxShadow: '0 10px 30px rgba(17,24,39,0.25)'}} >
              {currentTable ? (
                <div className="h-full overflow-auto">
                  {renderTable(currentTable)}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full" style={{color: '#94a3b8'}} >
                  <div className="text-center">
                    <Table className="w-12 h-12 mx-auto mb-3" style={{color: '#94a3b8'}} />
                    <p className="chat-response-text" style={{color: '#e5e7eb'}}>No table data available</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Panel Footer */}
          <div className="light-bg-primary px-4 py-2 border-t light-border">
            <div className="flex items-center justify-between text-xs light-text-secondary">
              <span>Table View</span>
              <span>Drag edges to resize</span>
            </div>
          </div>
        </div>
      )}

      {/* Copy Notification Toast */}
      {copyNotification.show && (
        <div className="fixed top-20 right-6 z-[110] transform transition-all duration-300 ease-out">
          <div className="light-bg-secondary backdrop-blur-sm light-border border rounded-lg px-4 py-3 main-shadow flex items-center space-x-3 min-w-[280px]">
            <div className="flex-shrink-0">
              <div className="bg-green-100 p-1 rounded-full">
                <Check className="w-4 h-4 text-green-500" />
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium light-text-primary">{copyNotification.message}</p>
            </div>
            <button
              onClick={() => setCopyNotification({ show: false, message: '' })}
              className="flex-shrink-0 light-text-secondary hover:text-orange-500 transition-colors p-1 rounded light-hover"
              title="Dismiss"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialAIAssistant;