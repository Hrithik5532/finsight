import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Clock,
  Bot,
  User,
  FileText,
  GitCompare,
  Eye,
  EyeOff,
  Save,
  Trash2,
  Plus,
  Edit3,
  Download,
  Upload,
  TestTube,
  Target,
  Zap,
  AlertTriangle,
  Filter,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Building2,
  Table,
  BarChart3,
  Grid3X3,
  ChevronRight,
  ChevronLeft,
  X
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const FinancialTestingDashboard = () => {
  const API_BASE_URL = 'http://54.243.27.109:8989';

  const [testCases, setTestCases] = useState([

  ]);

  const [newTestCase, setNewTestCase] = useState({
    query: "",
    expectedResponse: "",
    tags: [],
    priority: "medium"
  });

  const [isAddingTest, setIsAddingTest] = useState(false);
  const [runningTests, setRunningTests] = useState(new Set());
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTests, setSelectedTests] = useState(new Set());
  const [copiedId, setCopiedId] = useState(null);
  const [showOnlyFailures, setShowOnlyFailures] = useState(false);
  const [showTablePanel, setShowTablePanel] = useState(false);
  const [currentTable, setCurrentTable] = useState(null);
  const [tablePanelWidth, setTablePanelWidth] = useState(600);
  const [tableViewMode, setTableViewMode] = useState('combined');
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [showTableExportDropdown, setShowTableExportDropdown] = useState(false); // 'combined' or 'separate'
  const [showHistory, setShowHistory] = useState(false);
  const [testHistory, setTestHistory] = useState([]);
  const [historyFilter, setHistoryFilter] = useState('all'); // all, today, week, month
  const [selectedHistoryTest, setSelectedHistoryTest] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedTestForStatus, setSelectedTestForStatus] = useState(null);
  const [testStatus, setTestStatus] = useState('pass'); // pass, fail
  const [testIssues, setTestIssues] = useState('');
  const [isSubmittingStatus, setIsSubmittingStatus] = useState(false);

  const [isUploadingExcel, setIsUploadingExcel] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

  const [uploadPreview, setUploadPreview] = useState({
    show: false,
    rows: [],
    allRows: [],
    columnName: '',
    columnIndex: -1,
    candidates: [], 
    matrix: [],
    sheetName: '',
    sheetIndex: 0,
    sheets: [], 
    total: 0,
  });

  const fileInputRef = useRef(null);
  const excelFileInputRef = useRef(null);

  // Load test history from localStorage and API on component mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('financial_test_history');
    if (savedHistory) {
      try {
        setTestHistory(JSON.parse(savedHistory));
      } catch (error) {
        console.error('Error loading test history:', error);
      }
    }

    // Also load from API
    loadTestHistoryFromAPI();
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.export-dropdown')) {
        setShowExportDropdown(false);
        setShowTableExportDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load test history from API
      const savedUserName = localStorage.getItem('financial_ai_username');

  const loadTestHistoryFromAPI = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/financial/chat/test/history?user_name=${savedUserName}`);
      const data = await response.json();
      if (response.ok && data.history) {
        // Merge API history with local history
        const apiHistory = data.history.map(entry => ({
          id: `api_history_${entry.id}`,
          originalTestId: entry.id,
          query: entry.query,
          expectedResponse: entry.expected_response,
          actualResponse: entry.actual_response,
          status: 'completed', // This should be 'completed' for successful API calls
          testStatus: entry.query_status, // pass/fail from API
          issues: entry.issues,
          executionTime: null,
          timestamp: new Date(entry.created_at),
          tags: [],
          priority: 'high',
          table: null,
          isFromAPI: true,
          isStatusSubmitted: true // Mark as already submitted since it came from API
        })
      );

        setTestHistory(prev => {
          // Merge and deduplicate
          const combined = [...apiHistory, ...prev];
          const unique = combined.filter((item, index, self) => {
            return index === self.findIndex(t => {
              // Ensure timestamps are Date objects before comparison
              const itemTime = item.timestamp instanceof Date ? item.timestamp.getTime() : new Date(item.timestamp).getTime();
              const tTime = t.timestamp instanceof Date ? t.timestamp.getTime() : new Date(t.timestamp).getTime();
              return t.query === item.query && tTime === itemTime;
            });
          });
          return unique.slice(0, 1000);
        });
      }
    } catch (error) {
      console.error('Error loading test history from API:', error);
    }
  };

  // Save test history to localStorage whenever it changes
  useEffect(() => {
    if (testHistory.length > 0) {
      localStorage.setItem('financial_test_history', JSON.stringify(testHistory));
    }
  }, [testHistory]);

  // Add completed test to history
  const addToHistory = (completedTest) => {
    const historyEntry = {
      id: `history_${Date.now()}`,
      originalTestId: completedTest.id,
      query: completedTest.query,
      expectedResponse: completedTest.expectedResponse,
      actualResponse: completedTest.actualResponse,
      status: completedTest.status,
      executionTime: completedTest.executionTime,
      timestamp: completedTest.timestamp || new Date(),
      tags: completedTest.tags || [],
      priority: completedTest.priority,
      table: completedTest.table
    };

    setTestHistory(prev => [historyEntry, ...prev].slice(0, 1000)); // Keep last 1000 entries
  };

  // Enhanced table parsing and rendering functions from your Financial AI Assistant
  const parseTableData = (tableString) => {
    try {
      if (!tableString) return null;
      if (typeof tableString === 'object') return tableString;

      const parsed = JSON.parse(tableString);
      return parsed;
    } catch (error) {
      console.error('Error parsing table data:', error);
      return null;
    }
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

              <div className="overflow-auto max-h-80">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-800">
                    <tr>
                      <th className="text-left p-3 border-b border-gray-600 text-gray-300 font-medium bg-gray-800 min-w-32">
                        Metric
                      </th>
                      {periods.map((period, idx) => (
                        <th key={idx} className="text-center p-3 border-b border-gray-600 text-gray-300 font-medium bg-gray-800 min-w-24">
                          {period}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.map((metric, rowIdx) => (
                      <tr key={rowIdx} className="hover:bg-gray-700/50 transition-colors">
                        <td className="p-3 border-b border-gray-700/50 text-gray-200 font-medium bg-gray-800/30">
                          {metric.replace(/-$/, '')}
                        </td>
                        {periods.map((period, colIdx) => {
                          const value = metricsMap.get(metric)?.get(period);
                          return (
                            <td key={colIdx} className="p-3 border-b border-gray-700/50 text-center text-gray-300">
                              {value ? (
                                <span className={`inline-block px-2 py-1 rounded text-sm ${
                                  value.includes('%')
                                    ? 'bg-blue-900/30 text-blue-300 border border-blue-800/50'
                                    : value.includes('₹') || value.includes('$')
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
          );
        })}
      </div>
    );
  };

  const renderCombinedCompanyTable = (financialData) => {
    if (!financialData || !Array.isArray(financialData) || financialData.length === 0) return null;

    // Create a comprehensive view showing all data sections
    const companies = [...new Set(financialData.map(item => item.company))].sort();

    return (
      <div className="space-y-4">
        <div className="text-xs text-gray-400 bg-gray-800/50 p-3 rounded border border-gray-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              <span>Multi-Company Financial Analysis</span>
            </div>
            <span>{companies.length} companies × {financialData.length} data sections</span>
          </div>
        </div>

        {companies.map((company, companyIdx) => {
          // Get all data sections for this company
          const companyData = financialData.filter(item => item.company === company);

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

                  if (!results || results.length === 0) {
                    return null;
                  }

                  // Process metrics and periods for this section
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

                  if (metrics.length === 0 || periods.length === 0) {
                    console.log('No metrics or periods found for section:', sectionIdx);
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
                                <th className="text-left p-2 border-b border-gray-600 text-gray-300 font-medium bg-gray-800 min-w-32">
                                  Metric
                                </th>
                                {periods.map((period, idx) => (
                                  <th key={`${period}-${idx}`} className="text-center p-2 border-b border-gray-600 text-gray-300 font-medium bg-gray-800 min-w-20">
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
                                              : value.toString().includes('₹') || value.toString().includes('$')
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

  const renderTable = (tableData) => {
    if (!tableData) return null;

    // Handle the financial data format with multiple companies
    if (Array.isArray(tableData) && tableData.length > 0 && tableData[0].company && tableData[0].results) {
      return renderFinancialTable(tableData);
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
      <div className="overflow-auto max-h-96 mt-4">
        <div className="text-xs text-gray-400 bg-gray-800/50 p-3 rounded border border-gray-600 mb-3">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-blue-400" />
            <span>Data Table ({rows.length} rows × {headers.length} columns)</span>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-800">
            <tr>
              {headers.map((header, idx) => (
                <th key={idx} className="text-left p-2 border-b border-gray-600 text-gray-300 font-medium bg-gray-800">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => (
              <tr key={rowIdx} className="hover:bg-gray-700/50">
                {headers.map((header, colIdx) => (
                  <td key={colIdx} className="p-2 border-b border-gray-700/50 text-gray-300">
                    {typeof row === 'object' ? row[header] : row[colIdx]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Enhanced table handling functions
  const handleShowTable = (tableData) => {
    setCurrentTable(tableData);
    setShowTablePanel(true);
  };

  const exportTableAsCSV = () => {
    if (!currentTable) return;

    try {
      const csvContent = convertTableToCSV(currentTable);
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `test_table_data_${Date.now()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  const exportTableAsPDF = () => {
    if (!currentTable) return;

    try {
      const doc = new jsPDF();

      // Header
      doc.setFontSize(16);
      doc.text('Financial Data Table', 20, 20);
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 30);

      // Process table data for PDF
      if (Array.isArray(currentTable) && currentTable.length > 0 && currentTable[0].company) {
        let yPosition = 40;

        currentTable.forEach((companyData, index) => {
          if (yPosition > 250) {
            doc.addPage();
            yPosition = 20;
          }

          // Company header
          doc.setFontSize(12);
          doc.text(`Company: ${companyData.company}`, 20, yPosition);
          yPosition += 10;

          if (companyData.results && companyData.results.length > 0) {
            const tableData = companyData.results.slice(0, 20).map(result => [
              result.metric_name?.replace(/-$/, '') || 'N/A',
              result.period || 'N/A',
              result.raw_value || 'N/A'
            ]);

            autoTable(doc, {
              head: [['Metric', 'Period', 'Value']],
              body: tableData,
              startY: yPosition,
              styles: { fontSize: 8 },
              headStyles: { fillColor: [59, 130, 246] },
              margin: { left: 20 }
            });

            yPosition = doc.lastAutoTable.finalY + 15;
          }
        });
      }

      doc.save(`financial_table_${Date.now()}.pdf`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
    }
  };

  const convertTableToCSV = (financialData) => {
    if (!financialData || !Array.isArray(financialData)) return '';

    const allPeriods = new Set();
    const companyMetrics = new Map();

    // Process data to extract all periods and metrics
    financialData.forEach(companyData => {
      const company = companyData.company;
      companyMetrics.set(company, new Map());

      companyData.results.forEach(result => {
        allPeriods.add(result.period);
        const key = `${result.metric_name.replace(/-$/, '')} (${company})`;
        companyMetrics.get(company).set(key, {
          period: result.period,
          value: result.raw_value
        });
      });
    });

    const periods = Array.from(allPeriods).sort();
    const allMetrics = [];
    companyMetrics.forEach((metrics, company) => {
      metrics.forEach((data, metricKey) => {
        if (!allMetrics.includes(metricKey)) {
          allMetrics.push(metricKey);
        }
      });
    });

    // Create CSV content
    const headers = ['Metric', ...periods];
    const rows = [headers.join(',')];

    allMetrics.forEach(metric => {
      const row = [metric];
      periods.forEach(period => {
        const company = metric.match(/\(([^)]+)\)$/)?.[1];
        if (company && companyMetrics.has(company)) {
          const companyData = companyMetrics.get(company);
          const metricData = Array.from(companyData.values()).find(d => d.period === period);
          row.push(metricData ? `"${metricData.value}"` : '');
        } else {
          row.push('');
        }
      });
      rows.push(row.join(','));
    });

    return rows.join('\n');
  };

  // Real API integration matching your main Financial AI Assistant pattern
  const runTestCase = async (testId) => {
    setRunningTests(prev => new Set([...prev, testId]));

    const test = testCases.find(t => t.id === testId);
    const startTime = Date.now();

    setTestCases(prev => prev.map(t =>
      t.id === testId
        ? { ...t, status: "running", timestamp: new Date() }
        : t
    ));

    try {
      // Submit to your real financial API (exact same call as main app)
          const savedUserName = localStorage.getItem('financial_ai_username');

      const response = await fetch(`${API_BASE_URL}/api/financial/chat/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: test.query,
          user_name: savedUserName
        }),
      });

      const data = await response.json();

      if (response.ok && data.query_id) {
        // Start polling for results using exact same pattern as main app
        startPolling(testId, data.query_id, startTime);
      } else {
        throw new Error(data.error || 'Failed to submit query');
      }

    } catch (error) {
      const executionTime = Date.now() - startTime;

      setTestCases(prev => prev.map(testCase =>
        testCase.id === testId
          ? {
              ...testCase,
              status: "failed",
              actualResponse: `❌ **API Error**\n\n${error.message}\n\n**Details:**\n- Check if the API server is running\n- Verify network connectivity\n- Check browser console for more details`,
              executionTime: executionTime
            }
          : testCase
      ));

      // Add failed test to history
      const failedTest = testCases.find(t => t.id === testId);
      if (failedTest) {
        addToHistory({
          ...failedTest,
          status: "failed",
          actualResponse: `❌ **API Error**\n\n${error.message}`,
          executionTime: executionTime,
          timestamp: new Date()
        });
      }

      setRunningTests(prev => {
        const newSet = new Set(prev);
        newSet.delete(testId);
        return newSet;
      });
    }
  };

  // Polling function using the exact same pattern as your main Financial AI Assistant
  const startPolling = (testId, queryId, startTime) => {
    if (window.testPollingIntervals && window.testPollingIntervals.has(testId)) {
      return; // Already polling this test
    }

    const intervalId = setInterval(async () => {
      try {

        // Use the exact same status endpoint as your main app
        const response = await fetch(`${API_BASE_URL}/api/financial/status/${queryId}/`);
        const data = await response.json();

        if (data.error === 'Query not found' || !response.ok) {

          setTestCases(prev => prev.map(test => {
            if (test.id === testId) {
              return {
                ...test,
                status: 'failed',
                result: 'Query not found on server',
                executionTime: Date.now() - startTime,
                timestamp: new Date().toISOString()
              };
            }
            return test;
          }));

          clearInterval(intervalId);
          if (window.testPollingIntervals) {
            window.testPollingIntervals.delete(testId);
          }
          return;
        }

        if (data.status === 'completed' || data.status === 'failed') {
          const executionTime = Date.now() - startTime;

          const tableData = parseTableData(data.table);
          setTestCases(prev => prev.map(test => {
            if (test.id === testId) {
              const updatedTest = {
                ...test,
                status: data.status,
                actualResponse: data.status === 'completed'
                  ? data.markdown_response || 'Query completed but no response content available'
                  : `❌ **Processing Failed**\n\n${data.error_message || 'Unknown error occurred during processing'}`,
                executionTime: executionTime,
                table: tableData // Store table data exactly like main app
              };

              // Add to history when test completes (success or failure)
              if (data.status === 'completed' || data.status === 'failed') {
                addToHistory(updatedTest);
              }

              return updatedTest;
            }
            return test;
          }));

          // Remove from running tests
          setRunningTests(prev => {
            const newSet = new Set(prev);
            newSet.delete(testId);
            return newSet;
          });

          // Clear the polling interval
          clearInterval(intervalId);

          // Cleanup interval tracking
          if (window.testPollingIntervals) {
            window.testPollingIntervals.delete(testId);
          }
        }
      } catch (error) {
        console.error(`[TEST ${testId}] Polling error:`, error);
      }
    }, 15000);

    window.testPollingIntervals = window.testPollingIntervals || new Map();
    window.testPollingIntervals.set(testId, intervalId);

    setTimeout(() => {
      if (window.testPollingIntervals && window.testPollingIntervals.has(testId)) {
        clearInterval(intervalId);
        window.testPollingIntervals.delete(testId);

        setTestCases(prev => prev.map(test => {
          if (test.id === testId && test.status === 'running') {
            const timeoutTest = {
              ...test,
              status: 'failed',
              actualResponse: '⏰ **Timeout**\n\nQuery took longer than 10 minutes to process. This might indicate:\n- Complex query requiring extensive data processing\n- Server performance issues\n- Network connectivity problems\n\nTry running the query again or contact support if the issue persists.',
              executionTime: Date.now() - startTime
            };

            // Add timeout to history
            addToHistory(timeoutTest);

            return timeoutTest;
          }
          return test;
        }));

        setRunningTests(prev => {
          const newSet = new Set(prev);
          newSet.delete(testId);
          return newSet;
        });
      }
    }, 600000); // 10 minutes timeout (same as main app)
  };

  const runAllTests = async () => {
    const filteredTests = getFilteredTests();
    for (const test of filteredTests) {
      if (test.status !== "running") {
        await runTestCase(test.id);
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  };

  const addTestCase = () => {
    if (!newTestCase.query.trim()) return;

    const newTest = {
      id: Date.now(),
      query: newTestCase.query,
      expectedResponse: newTestCase.expectedResponse,
      actualResponse: "",
      status: "pending",
      timestamp: null,
      executionTime: null,
      isExpanded: false,
      tags: newTestCase.tags,
      priority: newTestCase.priority
    };

    setTestCases(prev => [...prev, newTest]);
    setNewTestCase({ query: "", expectedResponse: "", tags: [], priority: "medium" });
    setIsAddingTest(false);
  };

  const addBulkTestCases = (prompts) => {
    const baseTime = Date.now();
    const newTests = prompts.map((prompt, index) => ({
      id: baseTime + index,
      query: prompt.trim(),
      expectedResponse: "", 
      actualResponse: "",
      status: "",
      timestamp: null,
      executionTime: null,
      isExpanded: false,
      tags: [], 
      priority: "medium"
    }));

    setTestCases(prev => [...prev, ...newTests]);
    return newTests.length;
  };

  const handleExcelUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadError('');
    setUploadSuccess('');
    setIsUploadingExcel(true);
    setUploadProgress(0);

    try {
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
      ];

      if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
        throw new Error('Please select a valid Excel file (.xlsx or .xls)');
      }

      setUploadProgress(25);

      const arrayBuffer = await file.arrayBuffer();
      setUploadProgress(50);

      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetNames = workbook.SheetNames || [];

      if (!sheetNames.length) {
        throw new Error('Excel file appears to be empty or corrupted');
      }

      const toMatrix = (ws) => {
        try {
          const range = ws['!ref'];
          let matrix = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', range: range });
          if (matrix.length > 0) {
            return matrix;
          }

          const obj = XLSX.utils.sheet_to_json(ws, { defval: '', range: range });
          if (obj.length > 0) {
            const headers = Object.keys(obj[0]);
            matrix = [headers, ...obj.map(row => headers.map(h => row[h] || ''))];
            return matrix;
          }

          return [];
        } catch (e) {
          return [];
        }
      };

      const findPromptColumn = (matrix) => {
        const headerRow = matrix?.[0] || [];
        for (let i = 0; i < headerRow.length; i++) {
          const headerStr = (headerRow[i] ?? '').toString().toLowerCase().trim();
          if (headerStr === 'prompt' || headerStr === 'prompts') {
            return i;
          }
        }
        return -1;
      };

      const sheetMatrices = sheetNames.map((name, idx) => {
        const ws = workbook.Sheets[name];
        const m = toMatrix(ws);
        const promptCol = findPromptColumn(m);
        return { name, index: idx, matrix: m, promptCol };
      });

      const sheetsWithPrompts = sheetMatrices.filter(s => s.promptCol !== -1);
      let chosen;
      if (sheetsWithPrompts.length > 0) {
        const dbChatSheet = sheetsWithPrompts.find(s => s.name.toLowerCase().includes('db chat'));
        if (dbChatSheet) {
          chosen = dbChatSheet;
        } else {
          chosen = sheetsWithPrompts.reduce((best, current) =>
            current.matrix.length > best.matrix.length ? current : best
          );
        }
      } else {
        chosen = sheetMatrices[0];
      }

      const worksheetMatrix = chosen.matrix;
      let promptColumnIndex = chosen.promptCol !== -1 ? chosen.promptCol : 0;
      setUploadProgress(75);

      if (!worksheetMatrix || worksheetMatrix.length === 0) {
        throw new Error('No data found in Excel file');
      }

      if (worksheetMatrix.length < 2) {
        throw new Error('Excel file must contain at least a header row and one data row');
      }

      const headerRow = worksheetMatrix[0];

      if (promptColumnIndex === -1) {
        for (let i = 0; i < headerRow.length; i++) {
          const header = headerRow[i];
          if (!header) continue;
          const headerStr = header.toString().toLowerCase().trim();
          if (headerStr === 'prompt' || headerStr === 'prompts') {
            promptColumnIndex = i;
            break;
          }
        }
      }

      if (promptColumnIndex === -1) {
        const availableColumns = headerRow.map((h, i) => `${i}: "${h}"`).join(', ');
        throw new Error(`Could not find a "Prompt" column in the Excel file. Available columns: ${availableColumns}. Please ensure your Excel file has a column named "Prompt", "Query", "Question", or similar.`);
      }

      const prompts = [];

      for (let i = 1; i < worksheetMatrix.length; i++) {
        const row = worksheetMatrix[i];
        if (!Array.isArray(row)) continue;
        const cell = row[promptColumnIndex];

        if (cell === undefined || cell === null) continue;
        const prompt = cell.toString().trim();
        if (prompt && prompt.length > 0 && prompt.toLowerCase() !== 'prompt') {
          prompts.push(prompt);
        }
      }

      if (prompts.length === 0) {
        throw new Error('No valid prompts found in the Prompt column. Please ensure the column contains text data.');
      }

      setUploadPreview({
        show: true,
        rows: prompts.slice(0, 25),
        allRows: prompts,
        columnName: 'Prompt',
        columnIndex: promptColumnIndex,
        candidates: [],
        matrix: worksheetMatrix,
        sheetName: chosen.name,
        sheetIndex: chosen.index,
        sheets: sheetNames,
        total: prompts.length,
      });

      setUploadProgress(100);

    } catch (error) {
      console.error('Excel upload error:', error);
      setUploadError(error.message || 'Failed to process Excel file');
    } finally {
      setIsUploadingExcel(false);
      setUploadProgress(0);
      // Clear file input
      if (excelFileInputRef.current) {
        excelFileInputRef.current.value = '';
      }
    }
  };

  // Trigger Excel file upload
  const triggerExcelUpload = () => {
    if (excelFileInputRef.current) {
      excelFileInputRef.current.click();
    }
  };

  const deleteTestCase = (testId) => {
    setTestCases(prev => prev.filter(test => test.id !== testId));
    setSelectedTests(prev => {
      const newSet = new Set(prev);
      newSet.delete(testId);
      return newSet;
    });
  };

  const toggleExpanded = (testId) => {
    setTestCases(prev => prev.map(test =>
      test.id === testId
        ? { ...test, isExpanded: !test.isExpanded }
        : test
    ));
  };

  const copyToClipboard = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  const clearHistory = () => {
    if (confirm('Are you sure you want to clear all test history? This action cannot be undone.')) {
      setTestHistory([]);
      localStorage.removeItem('financial_test_history');
    }
  };

  const getFilteredHistory = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    return testHistory.filter(entry => {
      const entryDate = new Date(entry.timestamp);

      switch (historyFilter) {
        case 'today':
          return entryDate >= today;
        case 'week':
          return entryDate >= weekAgo;
        case 'month':
          return entryDate >= monthAgo;
        default:
          return true;
      }
    });
  };

  const getHistoryStats = () => {
    const filteredHistory = getFilteredHistory();
    return {
      total: filteredHistory.length,
      completed: filteredHistory.filter(t => t.status === "completed").length,
      failed: filteredHistory.filter(t => t.status === "failed").length,
      avgExecutionTime: filteredHistory.length > 0
        ? Math.round(filteredHistory.reduce((sum, t) => sum + (t.executionTime || 0), 0) / filteredHistory.length)
        : 0
    };
  };

  const rerunFromHistory = (historyEntry) => {
    // Create a new test case from history entry
    const newTest = {
      id: Date.now(),
      query: historyEntry.query,
      expectedResponse: historyEntry.expectedResponse,
      actualResponse: "",
      status: "pending",
      timestamp: null,
      executionTime: null,
      isExpanded: false,
      tags: historyEntry.tags || [],
      priority: historyEntry.priority || "medium"
    };

    setTestCases(prev => [...prev, newTest]);
    setShowHistory(false);

    // Auto-run the test
    setTimeout(() => runTestCase(newTest.id), 100);
  };

  // Submit test status to API
  const submitTestStatus = async () => {
    if (!selectedTestForStatus) return;

    setIsSubmittingStatus(true);

    try {
      // Get CSRF token if available
      const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value;

      const headers = {
        'Content-Type': 'application/json',
      };

      // Add CSRF token if available
      if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
      }
                const savedUserName = localStorage.getItem('financial_ai_username');

      const payload = {
        query: selectedTestForStatus.query,
        user_name: savedUserName,
        actual_response: selectedTestForStatus.actualResponse || '',
        expected_response: selectedTestForStatus.expectedResponse || '',
        status: testStatus, // 'pass' or 'fail'
        issues: testStatus === 'fail' ? testIssues : null
      };



      const response = await fetch('http://52.6.178.61:8080/api/financial/chat/test/', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        // If it's not JSON, get the text to see what the server returned
        const responseText = await response.text();
        console.error('Non-JSON response:', responseText);
        throw new Error(`Server returned ${response.status}: ${response.statusText}. Expected JSON but got: ${contentType}`);
      }

      const data = await response.json();
      console.log('Response data:', data);

      if (response.ok) {
        // Update the test case with submitted status
        setTestCases(prev => prev.map(test =>
          test.id === selectedTestForStatus.id
            ? {
                ...test,
                testStatus: testStatus,
                issues: testStatus === 'fail' ? testIssues : '',
                isStatusSubmitted: true
              }
            : test
        ));

        // Add to history with status info
        const statusEntry = {
          ...selectedTestForStatus,
          testStatus: testStatus,
          issues: testStatus === 'fail' ? testIssues : '',
          timestamp: new Date(),
          isFromAPI: true
        };

        setTestHistory(prev => [statusEntry, ...prev].slice(0, 1000));

        // Reload test history from API to get the latest data
        loadTestHistoryFromAPI();

        // Close modal and reset
        setShowStatusModal(false);
        setSelectedTestForStatus(null);
        setTestStatus('pass');
        setTestIssues('');

        alert(`Test marked as ${testStatus.toUpperCase()} successfully!`);
      } else {
        throw new Error(data.error || data.message || data.detail || `HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error submitting test status:', error);

      // Provide more specific error messages
      let errorMessage = error.message;
      if (error.message.includes('Failed to fetch')) {
        errorMessage = 'Network error: Unable to connect to server. Please check if the server is running.';
      } else if (error.message.includes('<!DOCTYPE')) {
        errorMessage = 'Server error: The server returned an HTML error page instead of JSON. Check server logs for details.';
      }

      alert(`Failed to submit test status: ${errorMessage}`);
    } finally {
      setIsSubmittingStatus(false);
    }
  };

  // Open status modal for a specific test
  const openStatusModal = (test) => {
    setSelectedTestForStatus(test);
    setTestStatus('pass');
    setTestIssues('');
    setShowStatusModal(true);
  };

  const getFilteredTests = () => {

    return testCases.filter(test => {
      const matchesSearch = test.query.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           test.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = filterStatus === "all" || test.status === filterStatus;
      const matchesPriority = filterPriority === "all" || test.priority === filterPriority;
      const matchesFailureFilter = !showOnlyFailures || test.status === "failed";

      return matchesSearch && matchesStatus && matchesPriority && matchesFailureFilter;
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "running":
        return <Clock className="w-4 h-4 text-blue-400 animate-spin" />;
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <TestTube className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "running":
        return "bg-blue-800/30 text-blue-300 border-blue-700";
      case "completed":
        return "bg-green-800/30 text-green-300 border-green-700";
      case "failed":
        return "bg-red-800/30 text-red-300 border-red-700";
      default:
        return "bg-gray-700/50 text-gray-300 border-gray-600";
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return "bg-red-800/30 text-red-300 border-red-700";
      case "medium":
        return "bg-yellow-800/30 text-yellow-300 border-yellow-700";
      case "low":
        return "bg-gray-700/50 text-gray-300 border-gray-600";
      default:
        return "bg-gray-700/50 text-gray-300 border-gray-600";
    }
  };

  const formatExecutionTime = (ms) => {
    if (!ms) return "";
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const exportTestResultsAsJSON = () => {
    const results = testCases.map(test => ({
      query: test.query,
      expectedResponse: test.expectedResponse,
      actualResponse: test.actualResponse,
      status: test.status,
      executionTime: formatExecutionTime(test.executionTime),
      timestamp: test.timestamp,
      tags: test.tags.join(", "),
      priority: test.priority
    }));

    const jsonString = JSON.stringify(results, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test_results_${Date.now()}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportTestResultsAsPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);

    // Header
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('DB Chat Results', margin, 25);

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, 35);
    doc.text(`Total Tests: ${testCases.length}`, margin, 45);

    // Summary stats
    const passed = testCases.filter(t => t.status === 'completed' && t.testStatus === 'pass').length;
    const failed = testCases.filter(t => t.status === 'completed' && t.testStatus === 'fail').length;
    const pending = testCases.filter(t => t.status === 'pending' || t.status === 'running').length;

    doc.text(`Passed: ${passed} | Failed: ${failed} | Pending: ${pending}`, margin, 55);

    let currentY = 70;

    // Add detailed test results
    testCases.forEach((test, index) => {
      // Check if we need a new page
      if (currentY > pageHeight - 80) {
        doc.addPage();
        currentY = 25;
      }

      // Test header
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text(`Test ${index + 1}`, margin, currentY);
      currentY += 15;

      // Query section
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text('Query:', margin, currentY);
      currentY += 6;

      doc.setFont(undefined, 'normal');
      const queryLines = doc.splitTextToSize(test.query, contentWidth - 10);
      queryLines.forEach(line => {
        if (currentY > pageHeight - 20) {
          doc.addPage();
          currentY = 25;
        }
        doc.text(line, margin + 5, currentY);
        currentY += 5;
      });
      currentY += 10;

      // Test Details
      doc.setFont(undefined, 'bold');
      doc.text('Details:', margin, currentY);
      currentY += 6;

      doc.setFont(undefined, 'normal');
      doc.text(`Status: ${test.status || 'N/A'}`, margin + 5, currentY);
      currentY += 5;
      doc.text(`Time: ${formatExecutionTime(test.executionTime) || 'N/A'}`, margin + 5, currentY);
      currentY += 5;
      doc.text(`Priority: ${test.priority || 'N/A'}`, margin + 5, currentY);
      currentY += 10;

      // Actual Response (clean and structured)
      if (test.actualResponse && test.actualResponse.trim()) {
        doc.setFont(undefined, 'bold');
        doc.text('Response:', margin, currentY);
        currentY += 6;

        doc.setFont(undefined, 'normal');

        // Advanced text cleanup for better PDF formatting
        let cleanResponse = test.actualResponse
          // Remove markdown formatting
          .replace(/\*\*(.*?)\*\*/g, '$1')
          .replace(/\*(.*?)\*/g, '$1')
          .replace(/#{1,6}\s+/g, '')
          // Remove LaTeX and formulas
          .replace(/\\\[[\s\S]*?\\\]/g, '[Formula]')
          .replace(/\\\([\s\S]*?\\\)/g, '[Formula]')
          // Remove table formatting completely
          .replace(/\|.*?\|/g, '')
          .replace(/---+/g, '')
          // Clean up Source Verification formatting
          .replace(/\*\*Source Verification[^*]*\*\*/g, 'Source Verification:')
          .replace(/\*\*Query Understanding[^*]*\*\*/g, 'Query Understanding:')
          .replace(/\*\*([^*]+)\*\*/g, '$1:')
          // Clean up spacing and structure
          .replace(/\n\s*\n\s*\n/g, '\n\n')
          .replace(/^\s+|\s+$/gm, '')
          // Fix common formatting issues
          .replace(/❌\s*/g, 'Error: ')
          .replace(/✅\s*/g, 'Success: ')
          .trim();

        // Structure the response better
        const sections = cleanResponse.split(/\n\s*\n/);
        let structuredResponse = '';

        sections.forEach((section, index) => {
          if (section.trim()) {
            // Add proper spacing between sections
            if (index > 0) structuredResponse += '\n\n';
            structuredResponse += section.trim();
          }
        });

        // Limit response length for PDF readability
        if (structuredResponse.length > 1000) {
          structuredResponse = structuredResponse.substring(0, 1000) + '...\n\n[Response truncated for PDF readability]';
        }

        const responseLines = doc.splitTextToSize(structuredResponse, contentWidth - 10);
        responseLines.forEach(line => {
          if (currentY > pageHeight - 20) {
            doc.addPage();
            currentY = 25;
          }
          doc.text(line, margin + 5, currentY);
          currentY += 4;
        });
      }

      // Add spacing between tests
      currentY += 20;
    });

    doc.save(`db_chat_results_${Date.now()}.pdf`);
  };

  const showExportModal = (content) => {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.8); z-index: 10000; display: flex;
      align-items: center; justify-content: center; padding: 20px;
    `;

    const container = document.createElement('div');
    container.style.cssText = `
      background: #1f2937; padding: 20px; border-radius: 8px;
      max-width: 80%; max-height: 80%; overflow: hidden;
      border: 1px solid #374151;
    `;

    const title = document.createElement('h3');
    title.textContent = 'Export Test Results';
    title.style.cssText = 'color: white; margin: 0 0 15px 0; font-size: 18px;';

    const textarea = document.createElement('textarea');
    textarea.value = content;
    textarea.style.cssText = `
      width: 600px; height: 400px; background: #374151;
      color: white; border: 1px solid #4b5563; border-radius: 4px;
      padding: 10px; font-family: monospace; font-size: 12px;
    `;
    textarea.readOnly = true;

    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = 'margin-top: 15px; text-align: right;';

    const copyBtn = document.createElement('button');
    copyBtn.textContent = 'Copy to Clipboard';
    copyBtn.style.cssText = `
      background: #7c3aed; color: white; border: none;
      padding: 8px 16px; border-radius: 4px; margin-right: 10px;
      cursor: pointer;
    `;
    copyBtn.onclick = () => {
      textarea.select();
      document.execCommand('copy');
      copyBtn.textContent = 'Copied!';
      setTimeout(() => copyBtn.textContent = 'Copy to Clipboard', 2000);
    };

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.cssText = `
      background: #6b7280; color: white; border: none;
      padding: 8px 16px; border-radius: 4px; cursor: pointer;
    `;
    closeBtn.onclick = () => document.body.removeChild(modal);

    buttonContainer.appendChild(copyBtn);
    buttonContainer.appendChild(closeBtn);
    container.appendChild(title);
    container.appendChild(textarea);
    container.appendChild(buttonContainer);
    modal.appendChild(container);
    document.body.appendChild(modal);

    textarea.select();
  };

  const filteredTests = getFilteredTests();
  const testStats = {
    total: testCases.length,
    pending: testCases.filter(t => t.status === "pending").length,
    running: testCases.filter(t => t.status === "running").length,
    completed: testCases.filter(t => t.status === "completed").length,
    failed: testCases.filter(t => t.status === "failed").length
  };

  return (
    <div className="min-h-screen light-bg-primary light-text-primary">
      {/* Main Content Area */}
      <div className={`transition-all duration-300 ${showTablePanel ? 'mr-96' : ''}`}>
        <div className="max-w-7xl mx-auto px-6 py-6">
          {/* Control Panel */}
          <div className="light-bg-secondary rounded-xl light-border border p-6 mb-6 main-shadow">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="secondary-gradient p-3 rounded-lg light-border border">
                  <TestTube className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gradient">Testing Dashboard</h1>
                  <p className="light-text-secondary">Financial AI Assistant Test Suite</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {/* Hidden Excel file input */}
                <input
                  ref={excelFileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleExcelUpload}
                  className="hidden"
                  aria-label="Upload Excel file with test cases"
                />

                {/* Upload Test Cases Button */}
                <button
                  onClick={triggerExcelUpload}
                  disabled={isUploadingExcel}
                  className="flex items-center space-x-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 text-white px-4 py-2.5 rounded-lg transition-all border border-green-500 disabled:border-gray-600 shadow-lg hover:shadow-green-500/25"
                  title="Upload Excel file with test cases from 'Prompt' column"
                >
                  {isUploadingExcel ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Processing...</span>
                      {uploadProgress > 0 && (
                        <span className="bg-green-800 text-xs px-2 py-0.5 rounded-full">
                          {uploadProgress}%
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Upload Test Cases</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => setShowHistory(true)}
                  className="flex items-center space-x-2 bg-gray-700/50 hover:bg-gray-600/50 text-white px-4 py-2.5 rounded-lg transition-all border border-gray-600/50 shadow-lg"
                >
                  <Clock className="w-4 h-4" />
                  <span>History</span>
                  {testHistory.length > 0 && (
                    <span className="bg-purple-600 text-xs px-2 py-0.5 rounded-full">
                      {testHistory.length}
                    </span>
                  )}
                </button>

                <div className="relative export-dropdown">
                  <button
                    onClick={() => setShowExportDropdown(!showExportDropdown)}
                    className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-lg transition-all border border-blue-500 shadow-lg hover:shadow-blue-500/25"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export</span>
                    <ChevronDown className="w-4 h-4" />
                  </button>

                  {showExportDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-gray-800/95 backdrop-blur-sm rounded-lg border border-gray-600/50 shadow-xl z-50">
                      <button
                        onClick={() => {
                          exportTestResultsAsJSON();
                          setShowExportDropdown(false);
                        }}
                        className="w-full text-left px-4 py-3 text-gray-300 hover:bg-gray-700/50 hover:text-white rounded-t-lg transition-all flex items-center space-x-2"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Export as JSON</span>
                      </button>
                      <button
                        onClick={() => {
                          exportTestResultsAsPDF();
                          setShowExportDropdown(false);
                        }}
                        className="w-full text-left px-4 py-3 text-gray-300 hover:bg-gray-700/50 hover:text-white rounded-b-lg transition-all flex items-center space-x-2"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Export as PDF</span>
                      </button>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setIsAddingTest(true)}
                  className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2.5 rounded-lg transition-all border border-purple-500 shadow-lg hover:shadow-purple-500/25"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Test</span>
                </button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-gray-700/30 p-4 rounded-lg border border-gray-600/50 shadow-lg">
                <div className="text-2xl font-bold text-white">{testStats.total}</div>
                <div className="text-sm text-gray-400">Total Tests</div>
              </div>
              <div className="bg-gray-700/30 p-4 rounded-lg border border-gray-600/50 shadow-lg">
                <div className="text-2xl font-bold text-gray-300">{testStats.pending}</div>
                <div className="text-sm text-gray-400">Pending</div>
              </div>
              <div className="bg-blue-800/20 p-4 rounded-lg border border-blue-700/50 shadow-lg">
                <div className="text-2xl font-bold text-blue-300">{testStats.running}</div>
                <div className="text-sm text-blue-400">Running</div>
              </div>
              <div className="bg-green-800/20 p-4 rounded-lg border border-green-700/50 shadow-lg">
                <div className="text-2xl font-bold text-green-300">{testStats.completed}</div>
                <div className="text-sm text-green-400">Completed</div>
              </div>
              <div className="bg-red-800/20 p-4 rounded-lg border border-red-700/50 shadow-lg">
                <div className="text-2xl font-bold text-red-300">{testStats.failed}</div>
                <div className="text-sm text-red-400">Failed</div>
              </div>
            </div>
          </div>

          {/* Upload feedback messages */}
          {uploadSuccess && (
            <div className="mb-4 p-3 bg-green-900/50 border border-green-700 rounded-lg flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
              <span className="text-green-300">{uploadSuccess}</span>
            </div>
          )}

          {uploadError && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg flex items-center space-x-2">
              <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <div className="text-red-300">
                <div className="font-medium">Upload Error:</div>
                <div className="text-sm mt-1">{uploadError}</div>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6 mb-6 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search tests..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-gray-700 text-white rounded border border-gray-600 pl-10 pr-4 py-2 focus:outline-none focus:border-purple-500 text-sm"
                  />
                </div>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-gray-700 text-white rounded border border-gray-600 px-3 py-2 focus:outline-none focus:border-purple-500 text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="running">Running</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                </select>

                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="bg-gray-700 text-white rounded border border-gray-600 px-3 py-2 focus:outline-none focus:border-purple-500 text-sm"
                >
                  <option value="all">All Priority</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={showOnlyFailures}
                    onChange={(e) => setShowOnlyFailures(e.target.checked)}
                    className="rounded bg-gray-700 border-gray-600 text-red-500 focus:ring-red-500"
                  />
                  <span className="text-sm text-gray-300">Failures Only</span>
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={runAllTests}
                  disabled={runningTests.size > 0}
                  className="flex items-center space-x-2 bg-green-700 hover:bg-green-600 disabled:bg-gray-600 text-white px-4 py-2 rounded transition-colors text-sm border border-green-600"
                >
                  <Play className="w-4 h-4" />
                  <span>Run All</span>
                </button>
              </div>
            </div>
          </div>

          {/* Add Test Form */}
          {isAddingTest && (
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Add New Test Case</h2>
                <button
                  onClick={() => setIsAddingTest(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Test Query
                  </label>
                  <input
                    type="text"
                    value={newTestCase.query}
                    onChange={(e) => setNewTestCase(prev => ({ ...prev, query: e.target.value }))}
                    placeholder="Enter your test query..."
                    className="w-full bg-gray-700 text-white rounded border border-gray-600 px-3 py-2 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Expected Response
                  </label>
                  <textarea
                    value={newTestCase.expectedResponse}
                    onChange={(e) => setNewTestCase(prev => ({ ...prev, expectedResponse: e.target.value }))}
                    placeholder="Describe what you expect the AI to respond with..."
                    rows={4}
                    className="w-full bg-gray-700 text-white rounded border border-gray-600 px-3 py-2 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="flex items-center space-x-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Priority
                    </label>
                    <select
                      value={newTestCase.priority}
                      onChange={(e) => setNewTestCase(prev => ({ ...prev, priority: e.target.value }))}
                      className="bg-gray-700 text-white rounded border border-gray-600 px-3 py-2 focus:outline-none focus:border-purple-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    onClick={addTestCase}
                    disabled={!newTestCase.query.trim()}
                    className="bg-purple-700 hover:bg-purple-600 disabled:bg-gray-600 text-white px-4 py-2 rounded transition-colors"
                  >
                    Add Test Case
                  </button>
                  <button
                    onClick={() => setIsAddingTest(false)}
                    className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Test Cases */}
          <div className="space-y-6">
            {filteredTests.length === 0 ? (
              <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-12 text-center shadow-2xl">
                <TestTube className="w-16 h-16 text-gray-500 mx-auto mb-6" />
                <h3 className="text-xl font-medium text-gray-300 mb-3">No Test Cases</h3>
                <p className="text-gray-500 mb-6 text-lg">
                  {testCases.length === 0
                    ? "Start by adding your first test case"
                    : "No tests match your current filters"
                  }
                </p>
                {testCases.length === 0 && (
                  <button
                    onClick={() => setIsAddingTest(true)}
                    className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-lg transition-all shadow-lg hover:shadow-purple-500/25"
                  >
                    Add Test Case
                  </button>
                )}
              </div>
            ) : (
              filteredTests.map((test) => (
                <div key={test.id} className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden shadow-xl">
                  {/* Test Header */}
                  <div className="p-4 border-b border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(test.status)}
                          <span className={`text-xs px-2 py-1 rounded border font-medium ${getStatusColor(test.status)}`}>
                            {test.status.toUpperCase()}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded border font-medium ${getPriorityColor(test.priority)}`}>
                            {test.priority.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-sm text-gray-400">
                          Test #{test.id}
                          {test.executionTime && (
                            <span className="ml-2">• {formatExecutionTime(test.executionTime)}</span>
                          )}
                          {test.timestamp && (
                            <span className="ml-2">• {test.timestamp.toLocaleTimeString()}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => runTestCase(test.id)}
                          disabled={runningTests.has(test.id)}
                          className="p-2 rounded hover:bg-gray-700 transition-colors disabled:opacity-50"
                          title="Run test"
                        >
                          {runningTests.has(test.id) ? (
                            <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
                          ) : (
                            <Play className="w-4 h-4 text-green-400" />
                          )}
                        </button>

                        {test.table && (
                          <button
                            onClick={() => handleShowTable(test.table)}
                            className="p-2 rounded hover:bg-gray-700 transition-colors flex items-center space-x-1 text-xs bg-blue-800/30 border border-blue-700"
                            title="View table data"
                          >
                            <Table className="w-4 h-4 text-blue-400" />
                            <span className="text-blue-300">Table</span>
                          </button>
                        )}

                        {(test.status === 'completed' || test.status === 'failed') && !test.isStatusSubmitted && (
                          <button
                            onClick={() => openStatusModal(test)}
                            className={`p-2 rounded hover:bg-gray-700 transition-colors flex items-center space-x-1 text-xs border ${
                              test.testStatus === 'pass'
                                ? 'bg-green-800/30 border-green-700 text-green-300'
                                : test.testStatus === 'fail'
                                ? 'bg-red-800/30 border-red-700 text-red-300'
                                : 'bg-yellow-800/30 border-yellow-700 text-yellow-300'
                            }`}
                            title="Mark test status"
                          >
                            <Target className="w-4 h-4" />
                            <span>{test.testStatus || 'Status'}</span>
                          </button>
                        )}

                        {test.isStatusSubmitted && (
                          <div className={`p-2 rounded flex items-center space-x-1 text-xs border ${
                            test.testStatus === 'pass'
                              ? 'bg-green-800/30 border-green-700 text-green-300'
                              : 'bg-red-800/30 border-red-700 text-red-300'
                          }`}>
                            <CheckCircle className="w-4 h-4" />
                            <span>{test.testStatus?.toUpperCase()}</span>
                          </div>
                        )}

                        <button
                          onClick={() => toggleExpanded(test.id)}
                          className="p-2 rounded hover:bg-gray-700 transition-colors"
                          title={test.isExpanded ? "Collapse" : "Expand"}
                        >
                          {test.isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          )}
                        </button>

                        <button
                          onClick={() => deleteTestCase(test.id)}
                          className="p-2 rounded hover:bg-gray-700 transition-colors"
                          title="Delete test"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="flex items-center space-x-2 mb-2">
                        <User className="w-4 h-4 text-purple-400" />
                        <span className="text-sm font-medium text-gray-300">Query:</span>
                      </div>
                      <p className="text-gray-200 bg-gray-700/30 p-3 rounded border border-gray-600">
                        {test.query}
                      </p>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {test.isExpanded && (
                    <div className="p-4 space-y-4">
                      {/* Expected Response */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Target className="w-4 h-4 text-green-400" />
                            <span className="text-sm font-medium text-gray-300">Expected Response:</span>
                          </div>
                          <button
                            onClick={() => copyToClipboard(test.expectedResponse, `expected-${test.id}`)}
                            className="p-1 rounded hover:bg-gray-700 transition-colors"
                          >
                            {copiedId === `expected-${test.id}` ? (
                              <Check className="w-4 h-4 text-green-400" />
                            ) : (
                              <Copy className="w-4 h-4 text-gray-400" />
                            )}
                          </button>
                        </div>
                        <div className="bg-green-900/20 border border-green-800/50 rounded p-3">
                          <p className="text-gray-300 text-sm whitespace-pre-wrap">
                            {test.expectedResponse || "No expected response provided"}
                          </p>
                        </div>
                      </div>

                      {/* Actual Response */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Bot className="w-4 h-4 text-blue-400" />
                            <span className="text-sm font-medium text-gray-300">Actual Response:</span>
                          </div>
                          {test.actualResponse && (
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => copyToClipboard(test.actualResponse, `actual-${test.id}`)}
                                className="p-1 rounded hover:bg-gray-700 transition-colors"
                              >
                                {copiedId === `actual-${test.id}` ? (
                                  <Check className="w-4 h-4 text-green-400" />
                                ) : (
                                  <Copy className="w-4 h-4 text-gray-400" />
                                )}
                              </button>
                              <button
                                className="flex items-center space-x-1 bg-orange-800/30 hover:bg-orange-700/30 text-orange-300 px-3 py-1 rounded text-xs border border-orange-700 transition-colors"
                                title="Compare responses (Coming Soon)"
                              >
                                <GitCompare className="w-3 h-3" />
                                <span>Compare</span>
                              </button>
                            </div>
                          )}
                        </div>
                        <div className={`border rounded p-3 ${
                          test.status === "failed"
                            ? "bg-red-900/20 border-red-800/50"
                            : test.status === "completed"
                            ? "bg-blue-900/20 border-blue-800/50"
                            : "bg-gray-700/30 border-gray-600"
                        }`}>
                          {test.actualResponse ? (
                            <div className="prose prose-invert max-w-none">
                              <pre className="text-gray-300 text-sm whitespace-pre-wrap font-sans">
                                {test.actualResponse}
                              </pre>
                            </div>
                          ) : test.status === "running" ? (
                            <div className="flex items-center space-x-2 text-gray-400">
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>Test is running...</span>
                            </div>
                          ) : (
                            <p className="text-gray-500 text-sm">No response yet</p>
                          )}


                        </div>
                      </div>

                      {/* Comparison Section (Coming Soon) */}
                      {test.actualResponse && test.expectedResponse && (
                        <div className="bg-gray-700/30 border border-gray-600 rounded p-4">
                          <div className="flex items-center space-x-2 mb-3">
                            <GitCompare className="w-4 h-4 text-orange-400" />
                            <span className="text-sm font-medium text-gray-300">Response Comparison</span>
                            <span className="text-xs bg-orange-800/30 text-orange-300 px-2 py-1 rounded border border-orange-700">
                              Coming Soon
                            </span>
                          </div>
                          <p className="text-gray-400 text-sm">
                            Automated comparison and scoring will be available in the next update.
                            This will help identify differences and provide similarity scores between expected and actual responses.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Table Side Panel */}
      {showTablePanel && (
        <div
  className="fixed right-0 top-0 h-full bg-gray-800 border-l border-gray-700 shadow-2xl z-30 flex flex-col"
  style={{
    width: `${Math.min(tablePanelWidth, 800)}px`,
    marginTop: "5rem"
  }}
>
          {/* Panel Header */}
          <div className="bg-gray-750 px-4 py-3 border-b border-gray-700 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Table className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-medium text-white">Data Table</h3>
            </div>
            <div className="flex items-center space-x-2">
              {/* Table View Mode Toggle */}
              {currentTable && Array.isArray(currentTable) && currentTable.length > 0 && currentTable[0].company && (
                <div className="flex items-center bg-gray-700 rounded border border-gray-600">
                  <button
                    onClick={() => setTableViewMode('combined')}
                    className={`px-3 py-1 text-xs rounded-l transition-colors ${
                      tableViewMode === 'combined'
                        ? 'bg-purple-700 text-white'
                        : 'text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Combined
                  </button>
                  <button
                    onClick={() => setTableViewMode('separate')}
                    className={`px-3 py-1 text-xs rounded-r transition-colors ${
                      tableViewMode === 'separate'
                        ? 'bg-purple-700 text-white'
                        : 'text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Separate
                  </button>
                </div>
              )}
              <div className="relative export-dropdown">
                <button
                  onClick={() => setShowTableExportDropdown(!showTableExportDropdown)}
                  className="p-1 rounded hover:bg-gray-700 transition-colors"
                  title="Export table data"
                >
                  <Download className="w-4 h-4 text-gray-400" />
                </button>

                {showTableExportDropdown && (
                  <div className="absolute right-0 mt-2 w-40 bg-gray-800 rounded-lg border border-gray-600 shadow-lg z-50">
                    <button
                      onClick={() => {
                        exportTableAsCSV();
                        setShowTableExportDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 text-gray-300 hover:bg-gray-700 rounded-t-lg transition-colors text-sm"
                    >
                      Export CSV
                    </button>
                    <button
                      onClick={() => {
                        exportTableAsPDF();
                        setShowTableExportDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 text-gray-300 hover:bg-gray-700 rounded-b-lg transition-colors text-sm"
                    >
                      Export PDF
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={() => setTablePanelWidth(prev => Math.max(400, prev - 100))}
                className="p-1 rounded hover:bg-gray-700 transition-colors"
                title="Narrow panel"
              >
                <ChevronLeft className="w-4 h-4 text-gray-400" />
              </button>
              <button
                onClick={() => setTablePanelWidth(prev => Math.min(800, prev + 100))}
                className="p-1 rounded hover:bg-gray-700 transition-colors"
                title="Widen panel"
              >
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
              <button
                onClick={() => setShowTablePanel(false)}
                className="p-1 rounded hover:bg-gray-700 transition-colors"
                title="Close panel"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-hidden p-4">
            <div className="bg-gray-700/30 rounded-lg border border-gray-600 h-full overflow-hidden">
              {currentTable ? (
                <div className="h-full overflow-auto">
                  {renderTable(currentTable)}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <div className="text-center">
                    <Table className="w-12 h-12 mx-auto mb-3 text-gray-500" />
                    <p>No table data available</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Panel Footer */}
          <div className="bg-gray-750 px-4 py-2 border-t border-gray-700">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Table View</span>
              <span>Drag edges to resize</span>
            </div>
          </div>
        </div>
      )}

      {/* Test Status Modal */}
      {showStatusModal && selectedTestForStatus && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg border border-gray-700 w-full max-w-2xl">
            {/* Modal Header */}
            <div className="bg-gray-750 px-6 py-4 border-b border-gray-700 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Target className="w-6 h-6 text-purple-400" />
                <div>
                  <h2 className="text-xl font-bold text-white">Mark Test Status</h2>
                  <p className="text-gray-400 text-sm">Evaluate test result and report issues</p>
                </div>
              </div>
              <button
                onClick={() => setShowStatusModal(false)}
                className="p-2 rounded hover:bg-gray-700 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Test Details */}
              <div className="bg-gray-700/30 rounded-lg border border-gray-600 p-4">
                <h3 className="text-lg font-medium text-white mb-2">Test Query</h3>
                <p className="text-gray-300 text-sm bg-gray-700/50 p-3 rounded">
                  {selectedTestForStatus.query}
                </p>
              </div>

              {/* Status Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Test Status *
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setTestStatus('pass')}
                    className={`p-4 rounded-lg border transition-colors flex items-center justify-center space-x-2 ${
                      testStatus === 'pass'
                        ? 'bg-green-800/30 border-green-700 text-green-300'
                        : 'bg-gray-700/50 border-gray-600 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">PASS</span>
                  </button>
                  <button
                    onClick={() => setTestStatus('fail')}
                    className={`p-4 rounded-lg border transition-colors flex items-center justify-center space-x-2 ${
                      testStatus === 'fail'
                        ? 'bg-red-800/30 border-red-700 text-red-300'
                        : 'bg-gray-700/50 border-gray-600 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    <XCircle className="w-5 h-5" />
                    <span className="font-medium">FAIL</span>
                  </button>
                </div>
              </div>

              {/* Issues Section (only if status is fail) */}
              {testStatus === 'fail' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Issues / Problems *
                  </label>
                  <textarea
                    value={testIssues}
                    onChange={(e) => setTestIssues(e.target.value)}
                    placeholder="Describe the issues found with this test result..."
                    rows={4}
                    className="w-full bg-gray-700 text-white rounded border border-gray-600 px-3 py-2 focus:outline-none focus:border-red-500 placeholder-gray-400"
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Please provide details about what went wrong or didn't meet expectations.
                  </p>
                </div>
              )}

              {/* Test Response Preview */}
              <div className="bg-gray-700/30 rounded-lg border border-gray-600 p-4">
                <h4 className="text-sm font-medium text-gray-300 mb-2">Actual Response Preview:</h4>
                <div className="bg-gray-800/50 rounded p-3 max-h-32 overflow-y-auto">
                  <pre className="text-gray-300 text-xs whitespace-pre-wrap font-sans">
                    {selectedTestForStatus.actualResponse || 'No response available'}
                  </pre>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-750 px-6 py-4 border-t border-gray-700 flex items-center justify-between">
              <div className="text-xs text-gray-400">
                This will be submitted to the test tracking system
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={submitTestStatus}
                  disabled={isSubmittingStatus || (testStatus === 'fail' && !testIssues.trim())}
                  className={`px-6 py-2 rounded font-medium transition-colors flex items-center space-x-2 ${
                    testStatus === 'pass'
                      ? 'bg-green-700 hover:bg-green-600 text-white'
                      : 'bg-red-700 hover:bg-red-600 text-white'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isSubmittingStatus && (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  )}
                  <span>
                    {isSubmittingStatus
                      ? 'Submitting...'
                      : `Mark as ${testStatus.toUpperCase()}`
                    }
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Preview Modal */}
      {uploadPreview.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg border border-gray-700 w-full max-w-4xl">
            <div className="bg-gray-750 px-6 py-4 border-b border-gray-700 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Upload className="w-6 h-6 text-green-400" />
                <div>
                  <h3 className="text-lg font-semibold text-white">Preview Imported Test Cases</h3>
                  <p className="text-sm text-gray-400">
                    Column: <span className="text-white font-medium">{uploadPreview.columnName}</span>
                    <span className="ml-4">• Total: <span className="text-gray-200">{uploadPreview.total}</span></span>
                  </p>
                </div>
              </div>
              <button onClick={() => setUploadPreview(prev => ({ ...prev, show: false }))} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-3 max-h-[60vh] overflow-auto">
              {uploadPreview.rows.map((txt, idx) => (
                <div key={idx} className="bg-gray-800/50 border border-gray-700 rounded p-3 text-gray-100 text-sm">
                  {idx + 1}. {txt}
                </div>
              ))}
              {uploadPreview.total > uploadPreview.rows.length && (
                <div className="text-gray-400 text-sm">...and {uploadPreview.total - uploadPreview.rows.length} more</div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-700 bg-gray-750 flex items-center justify-end space-x-3">
              <button onClick={() => setUploadPreview(prev => ({ ...prev, show: false }))} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded border border-gray-600">Close</button>
              <button onClick={() => {
                const count = addBulkTestCases(uploadPreview.allRows);
                setUploadPreview(prev => ({ ...prev, show: false }));
                setUploadSuccess(`Successfully imported ${count} test cases"`);
                setTimeout(() => setUploadSuccess(''), 5000);
              }} className="bg-green-700 hover:bg-green-600 text-white px-4 py-2 rounded border border-green-600">Import</button>
            </div>
          </div>
        </div>
      )}


      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg border border-gray-700 w-full max-w-6xl h-5/6 flex flex-col">
            {/* History Header */}
            <div className="bg-gray-750 px-6 py-4 border-b border-gray-700 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Clock className="w-6 h-6 text-purple-400" />
                <div>
                  <h2 className="text-xl font-bold text-white">Test History</h2>
                  <p className="text-gray-400 text-sm">View and analyze past test runs</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <select
                  value={historyFilter}
                  onChange={(e) => setHistoryFilter(e.target.value)}
                  className="bg-gray-700 text-white rounded border border-gray-600 px-3 py-2 focus:outline-none focus:border-purple-500 text-sm"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                </select>
                <button
                  onClick={clearHistory}
                  className="flex items-center space-x-2 bg-red-700 hover:bg-red-600 text-white px-3 py-2 rounded transition-colors text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Clear</span>
                </button>
                <button
                  onClick={() => setShowHistory(false)}
                  className="p-2 rounded hover:bg-gray-700 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>

            {/* History Stats */}
            <div className="px-6 py-4 border-b border-gray-700">
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-gray-700/50 p-3 rounded border border-gray-600">
                  <div className="text-lg font-bold text-white">{getHistoryStats().total}</div>
                  <div className="text-xs text-gray-400">Total Runs</div>
                </div>
                <div className="bg-green-800/30 p-3 rounded border border-green-700">
                  <div className="text-lg font-bold text-green-300">{getHistoryStats().completed}</div>
                  <div className="text-xs text-green-400">Completed</div>
                </div>
                <div className="bg-red-800/30 p-3 rounded border border-red-700">
                  <div className="text-lg font-bold text-red-300">{getHistoryStats().failed}</div>
                  <div className="text-xs text-red-400">Failed</div>
                </div>
                <div className="bg-blue-800/30 p-3 rounded border border-blue-700">
                  <div className="text-lg font-bold text-blue-300">{formatExecutionTime(getHistoryStats().avgExecutionTime)}</div>
                  <div className="text-xs text-blue-400">Avg Time</div>
                </div>
              </div>
            </div>

            {/* History Content */}
            <div className="flex-1 overflow-hidden">
              {getFilteredHistory().length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <div className="text-center">
                    <Clock className="w-12 h-12 mx-auto mb-3 text-gray-500" />
                    <h3 className="text-lg font-medium text-gray-300 mb-2">No History</h3>
                    <p className="text-gray-500">
                      {testHistory.length === 0
                        ? "No tests have been run yet"
                        : "No tests match the selected time filter"
                      }
                    </p>
                  </div>
                </div>
              ) : (
                <div className="h-full overflow-auto p-6 space-y-3">
                  {getFilteredHistory().map((entry) => (
                    <div
                      key={entry.id}
                      className={`bg-gray-700/30 rounded-lg border border-gray-600 p-4 hover:bg-gray-700/50 transition-colors cursor-pointer ${
                        selectedHistoryTest?.id === entry.id ? 'ring-2 ring-purple-500' : ''
                      }`}
                      onClick={() => setSelectedHistoryTest(selectedHistoryTest?.id === entry.id ? null : entry)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(entry.status)}
                            <span className={`text-xs px-2 py-1 rounded border font-medium ${getStatusColor(entry.status)}`}>
                              {entry.status.toUpperCase()}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded border font-medium ${getPriorityColor(entry.priority)}`}>
                              {entry.priority?.toUpperCase() || 'MEDIUM'}
                            </span>
                            {entry.testStatus && (
                              <span className={`text-xs px-2 py-1 rounded border font-medium ${
                                entry.testStatus === 'pass'
                                  ? 'bg-green-800/30 text-green-300 border-green-700'
                                  : 'bg-red-800/30 text-red-300 border-red-700'
                              }`}>
                                {entry.testStatus.toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-gray-200 text-sm font-medium truncate">
                              {entry.query}
                            </p>
                            <div className="flex items-center space-x-4 text-xs text-gray-400 mt-1">
                              <span>{new Date(entry.timestamp).toLocaleString()}</span>
                              {entry.executionTime && (
                                <span>• {formatExecutionTime(entry.executionTime)}</span>
                              )}
                              {entry.tags && entry.tags.length > 0 && (
                                <span>• {entry.tags.join(', ')}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {entry.table && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleShowTable(entry.table);
                                setShowHistory(false);
                              }}
                              className="p-1 rounded hover:bg-gray-600 transition-colors"
                              title="View table data"
                            >
                              <Table className="w-4 h-4 text-blue-400" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              rerunFromHistory(entry);
                            }}
                            className="p-1 rounded hover:bg-gray-600 transition-colors"
                            title="Re-run this test"
                          >
                            <RefreshCw className="w-4 h-4 text-green-400" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(entry.actualResponse, `history-${entry.id}`);
                            }}
                            className="p-1 rounded hover:bg-gray-600 transition-colors"
                            title="Copy response"
                          >
                            {copiedId === `history-${entry.id}` ? (
                              <Check className="w-4 h-4 text-green-400" />
                            ) : (
                              <Copy className="w-4 h-4 text-gray-400" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Expanded History Details */}
                      {selectedHistoryTest?.id === entry.id && (
                        <div className="mt-4 pt-4 border-t border-gray-600 space-y-3">
                          <div>
                            <h4 className="text-sm font-medium text-gray-300 mb-2">Expected Response:</h4>
                            <div className="bg-green-900/20 border border-green-800/50 rounded p-3">
                              <p className="text-gray-300 text-xs whitespace-pre-wrap">
                                {entry.expectedResponse || "No expected response provided"}
                              </p>
                            </div>
                          </div>

                          <div>
                            <h4 className="text-sm font-medium text-gray-300 mb-2">Actual Response:</h4>
                            <div className={`border rounded p-3 ${
                              entry.status === "failed"
                                ? "bg-red-900/20 border-red-800/50"
                                : "bg-blue-900/20 border-blue-800/50"
                            }`}>
                              <pre className="text-gray-300 text-xs whitespace-pre-wrap font-sans">
                                {entry.actualResponse || "No response available"}
                              </pre>
                            </div>
                          </div>

                          {entry.issues && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-300 mb-2">Issues:</h4>
                              <div className="bg-red-900/20 border border-red-800/50 rounded p-3">
                                <p className="text-gray-300 text-xs whitespace-pre-wrap">
                                  {entry.issues}
                                </p>
                              </div>
                            </div>
                          )}

                          {entry.table && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-300 mb-2">Table Data:</h4>
                              <div className="bg-gray-800/50 rounded p-3 border border-gray-600">
                                <div className="max-h-32 overflow-hidden">
                                  {renderTable(entry.table)}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialTestingDashboard;