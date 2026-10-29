import React, { useState, useEffect } from 'react';
import { codingService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Paywall from '../components/Paywall';
import { 
  Code, Play, AlertCircle, CheckCircle, RefreshCw, Sparkles, BookOpen, ChevronRight, Award, Trophy, Maximize2, Minimize2, Send
} from 'lucide-react';

export default function CodingPractice() {
  const { user } = useAuth();
  
  // States
  const [problems, setProblems] = useState([]);
  const [selectedLanguage, setSelectedLanguage] = useState('Python');
  const [selectedTopic, setSelectedTopic] = useState('All');
  const [activeProblem, setActiveProblem] = useState(null);
  const [codeEditor, setCodeEditor] = useState('');
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [isCompilerMaximized, setIsCompilerMaximized] = useState(false);
  const [showDescription, setShowDescription] = useState(true);
  
  const textareaRef = React.useRef(null);
  const lineNumbersRef = React.useRef(null);

  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };
  
  // Filters
  const languages = ['Python', 'Java', 'DSA', 'C++', 'C'];
  const topics = ['All', 'Arrays', 'Strings', 'Linked Lists', 'Stacks & Queues', 'Trees', 'Graphs', 'Dynamic Programming', 'Advanced Algorithmic Topics'];

  useEffect(() => {
    if (user) {
      loadProblems();
    }
  }, [user]);

  const loadProblems = async () => {
    setLoading(true);
    try {
      const data = await codingService.getProblems();
      setProblems(data);
      
      // Auto-select the first unsolved problem in the default language
      const defaultProb = data.find(p => p.language === 'Python' && !p.completed);
      if (defaultProb) {
        selectProblem(defaultProb);
      } else {
        const anyProb = data.find(p => p.language === 'Python');
        if (anyProb) selectProblem(anyProb);
      }
    } catch (err) {
      console.error("Failed to load problems", err);
    } finally {
      setLoading(false);
    }
  };

  const selectProblem = (prob) => {
    setActiveProblem(prob);
    setCodeEditor(prob.starter_code || '');
    setResults(null);
  };

  // Compile and Submit
  const handleCompile = async (isSubmit = false) => {
    if (!activeProblem) return;
    setRunning(true);
    setResults(null);
    try {
      const res = await codingService.submitSolution(activeProblem._id, codeEditor, selectedLanguage);
      setResults(res);

      if (res.passed) {
        // Mark as completed in local state
        setProblems(prev => prev.map(p => {
          if (p._id === activeProblem._id) {
            return { ...p, completed: true };
          }
          return p;
        }));
        
        if (isSubmit) {
          // Find next unsolved problem in current language
          setTimeout(() => {
            autoAdvance();
          }, 3000);
        }
      }
    } catch (err) {
      alert("Execution error: " + (err.response?.data?.detail || err.message));
    } finally {
      setRunning(false);
    }
  };

  const autoAdvance = () => {
    const nextProb = problems.find(p => p.language === selectedLanguage && !p.completed && p._id !== activeProblem?._id);
    if (nextProb) {
      selectProblem(nextProb);
    }
  };

  const handleLanguageChange = (lang) => {
    setSelectedLanguage(lang);
    const prob = problems.find(p => p.language === lang && !p.completed) || problems.find(p => p.language === lang);
    if (prob) {
      selectProblem(prob);
    } else {
      setActiveProblem(null);
      setCodeEditor('');
      setResults(null);
    }
  };

  // Filtered problems list
  const filteredProblems = problems.filter(p => {
    const matchLang = p.language === selectedLanguage;
    const matchTopic = selectedTopic === 'All' || p.topic === selectedTopic;
    return matchLang && matchTopic;
  });

  // Calculate solved counts
  const totalInCurrentLang = problems.filter(p => p.language === selectedLanguage).length;
  const completedInCurrentLang = problems.filter(p => p.language === selectedLanguage && p.completed).length;

  return (
    <div className="max-w-7xl mx-auto space-y-4 py-2">
      {/* Top Main Workspace Container */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-md overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[600px]">
        
        {/* Left Column Sidebar */}
        {!isCompilerMaximized && (
          <div className="lg:col-span-5 border-r border-gray-200 dark:border-gray-700 flex flex-col h-[calc(100vh-10rem)] min-h-[500px] bg-white dark:bg-gray-800">
            {/* Sidebar Header */}
            <div className="p-6 pb-4 space-y-1">
              <div className="flex items-center space-x-2">
                <Trophy className="h-6 w-6 text-amber-500" />
                <h2 className="text-xl font-black text-gray-800 dark:text-white">Coding Practice</h2>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Practice coding problems and improve your skills
              </p>
            </div>

            {/* Select Language */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
              <h3 className="font-bold text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">Select Programming Language</h3>
              <div className="flex flex-wrap gap-2">
                {languages.map((lang) => (
                  <button
                    key={lang}
                    onClick={() => handleLanguageChange(lang)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                      selectedLanguage === lang
                        ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                        : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            {/* Select Algorithmic Topic */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
              <h3 className="font-bold text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">Select Algorithmic Topic</h3>
              <select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                className="block w-full text-xs font-semibold border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-white rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
              >
                {topics.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Exercises list */}
            <div className="border-t border-gray-200 dark:border-gray-700 flex flex-col flex-1 min-h-0">
              <div className="p-4 px-6 bg-gray-50/50 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-bold text-xs text-gray-700 dark:text-gray-300">Available Exercises ({filteredProblems.length})</h3>
              </div>
              
              <div className="overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700 flex-1">
                {loading ? (
                  <div className="flex justify-center items-center py-10">
                    <RefreshCw className="h-5 w-5 text-primary-600 animate-spin" />
                  </div>
                ) : filteredProblems.length === 0 ? (
                  <div className="p-6 text-center text-xs text-gray-500 dark:text-gray-400">No questions available under this category.</div>
                ) : (
                  filteredProblems.map((p) => (
                    <div
                      key={p._id}
                      onClick={() => selectProblem(p)}
                      className={`p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/60 transition-colors ${
                        activeProblem?._id === p._id ? 'bg-blue-50/70 dark:bg-blue-950/40 border-l-4 border-blue-600 pl-3 font-bold' : ''
                      }`}
                    >
                      <div className="space-y-1 pr-2 truncate">
                        <div className={`text-xs font-bold flex items-center truncate ${
                          activeProblem?._id === p._id ? 'text-blue-700 dark:text-blue-300' : 'text-gray-800 dark:text-white'
                        }`}>
                          {p.completed && <CheckCircle className="h-3.5 w-3.5 text-emerald-500 mr-1.5 flex-shrink-0" />}
                          <span className="truncate">{p.title}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-[10px] text-gray-400 dark:text-gray-400">
                          <span>{p.topic}</span>
                          <span>-</span>
                          <span className={`font-semibold capitalize ${
                            p.difficulty === 'easy' ? 'text-emerald-600 dark:text-emerald-400' :
                            p.difficulty === 'medium' ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'
                          }`}>
                            {p.difficulty}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className={`h-4 w-4 flex-shrink-0 ${
                        activeProblem?._id === p._id ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'
                      }`} />
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Right Column Content */}
        <div className={`${isCompilerMaximized ? 'lg:col-span-12 w-full' : 'lg:col-span-7'} flex flex-col h-[calc(100vh-10rem)] min-h-[500px] overflow-y-auto`}>
          {activeProblem ? (
            <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-gray-900">
              
              {/* Editor Header with Run / Submit actions */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 flex justify-between items-center shrink-0">
                <div className="text-xs text-gray-600 dark:text-gray-300 font-semibold">
                  Editor ({selectedLanguage}) • Function: solution()
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleCompile(false)}
                    disabled={running || !codeEditor.trim()}
                    className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 font-bold text-xs px-4 py-2 rounded-xl transition-all flex items-center shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    {running && !results ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        Running...
                      </>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5 mr-1.5" />
                        Run
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleCompile(true)}
                    disabled={running || !codeEditor.trim()}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all flex items-center shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5 mr-1.5" />
                    Submit
                  </button>
                </div>
              </div>

              {/* Problem Description Panel (Collapsible) */}
              <div className="bg-gray-50/50 dark:bg-gray-900/30 border-b border-gray-200 dark:border-gray-700">
                <div 
                  className="px-6 py-3 flex justify-between items-center cursor-pointer select-none" 
                  onClick={() => setShowDescription(!showDescription)}
                >
                  <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Problem Details
                  </span>
                  <span className="text-[10px] text-primary-600 hover:text-primary-700 dark:text-primary-400 font-bold">
                    {showDescription ? "Collapse [↑]" : "Expand [↓]"}
                  </span>
                </div>
                {showDescription && (
                  <div className="px-6 pb-4 space-y-2">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm font-extrabold text-gray-800 dark:text-white">{activeProblem.title}</h3>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full capitalize ${
                        activeProblem.difficulty === 'easy' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' :
                        activeProblem.difficulty === 'medium' ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800' :
                        'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                      }`}>
                        {activeProblem.difficulty}
                      </span>
                    </div>
                    <div className="text-xs text-gray-700 dark:text-gray-200 leading-relaxed font-mono whitespace-pre-line bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800">
                      {activeProblem.question}
                    </div>
                  </div>
                )}
              </div>

              {/* Code Input Workspace (Textarea + Line Numbers Side-by-Side) */}
              <div className="p-4 bg-gray-50/20 dark:bg-gray-900/20 flex-grow flex flex-col min-h-[300px] relative">
                <div className="flex bg-[#1e1e1e] border border-gray-400 dark:border-gray-700 rounded-xl overflow-hidden shadow-inner flex-1 relative min-h-[250px]">
                  <div 
                    ref={lineNumbersRef}
                    className="bg-[#181818] text-gray-500 select-none text-right font-mono text-xs py-4 pr-2.5 pl-3.5 border-r border-gray-800 overflow-hidden shrink-0"
                    style={{ lineHeight: '1.5rem', width: '3rem' }}
                  >
                    {Array.from({ length: Math.max(codeEditor.split('\n').length, 1) }).map((_, i) => (
                      <div key={i} className="h-6">{i + 1}</div>
                    ))}
                  </div>
                  <textarea
                    ref={textareaRef}
                    value={codeEditor}
                    onChange={(e) => setCodeEditor(e.target.value)}
                    onScroll={handleScroll}
                    className="block w-full bg-[#1e1e1e] text-emerald-400 font-mono text-xs p-4 pl-2 focus:outline-none resize-none whitespace-pre overflow-x-auto h-full"
                    style={{ lineHeight: '1.5rem' }}
                  />
                  
                  {/* Minimize/Maximize button inside bottom right of editor */}
                  <button
                    onClick={() => setIsCompilerMaximized(prev => !prev)}
                    className="absolute bottom-4 right-4 p-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded border border-gray-700 transition-colors shadow cursor-pointer"
                    title={isCompilerMaximized ? "Restore split view" : "Maximize editor"}
                    type="button"
                  >
                    {isCompilerMaximized ? (
                      <Minimize2 className="h-4 w-4" />
                    ) : (
                      <Maximize2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Compile Test Results & AI Code review split panels */}
              {results && (
                <div className="border-t border-gray-200 dark:border-gray-700 p-6 divide-y divide-gray-200 dark:divide-gray-700 space-y-6 shrink-0 bg-white dark:bg-gray-800">
                  {/* Compilation test cases results */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-xs text-gray-600 dark:text-gray-300 uppercase tracking-wider">Test Case Evaluations</h4>
                    <div className="space-y-2">
                      {results.results?.map((tc, idx) => (
                        <div 
                          key={idx} 
                          className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                            tc.passed 
                              ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300' 
                              : 'bg-red-50/50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5">
                            {tc.passed ? (
                              <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                            )}
                            <span className="font-bold">Test Case {idx + 1}</span>
                          </div>

                          <div className="text-[10px] space-x-4">
                            {tc.error ? (
                              <span className="text-red-600 dark:text-red-400 font-mono">{tc.error}</span>
                            ) : (
                              <>
                                <span>Expected: <code className="bg-white/60 dark:bg-slate-900/60 px-1.5 py-0.5 rounded font-mono">{tc.expected}</code></span>
                                <span>Actual: <code className="bg-white/60 dark:bg-slate-900/60 px-1.5 py-0.5 rounded font-mono">{tc.actual}</code></span>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* IBM Granite AI review feedback */}
                  {results.ai_review && (
                    <div className="pt-6 space-y-4">
                      <div className="flex items-center space-x-2">
                        <Sparkles className="h-4 w-4 text-amber-500" />
                        <h4 className="font-bold text-xs text-gray-800 dark:text-white uppercase tracking-wider">IBM Granite AI Code Review</h4>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
                          <div className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold">Time Complexity</div>
                          <div className="text-sm font-black text-gray-800 dark:text-gray-200 mt-1">{results.ai_review.time_complexity}</div>
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
                          <div className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold">Space Complexity</div>
                          <div className="text-sm font-black text-gray-800 dark:text-gray-200 mt-1">{results.ai_review.space_complexity}</div>
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
                          <div className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold">Readability Index</div>
                          <div className="text-sm font-black text-gray-800 dark:text-gray-200 mt-1">{results.ai_review.readability_score} / 10</div>
                        </div>
                      </div>

                      <div className="p-4 bg-amber-50/30 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-800 space-y-3">
                        <div>
                          <h5 className="font-bold text-xs text-gray-800 dark:text-white">AI Diagnostics & Feedback:</h5>
                          <p className="text-xs text-gray-700 dark:text-gray-300 mt-1 leading-relaxed">
                            {results.ai_review.code_quality_feedback}
                          </p>
                        </div>
                        {results.ai_review.bugs?.length > 0 && (
                          <div>
                            <h5 className="font-bold text-xs text-red-600 dark:text-red-400">Potential Bugs/Issues Identified:</h5>
                            <ul className="list-disc list-inside text-[11px] text-gray-600 dark:text-gray-300 mt-1 space-y-0.5">
                              {results.ai_review.bugs.map((b, bIdx) => (
                                <li key={bIdx}>{b}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {results.ai_review.suggestions?.length > 0 && (
                          <div>
                            <h5 className="font-bold text-xs text-primary-600 dark:text-primary-400">Refactoring Suggestions:</h5>
                            <ul className="list-disc list-inside text-[11px] text-gray-600 dark:text-gray-300 mt-1 space-y-0.5">
                              {results.ai_review.suggestions.map((s, sIdx) => (
                                <li key={sIdx}>{s}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 p-12 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm text-center space-y-3 flex-1 flex flex-col justify-center items-center">
              <BookOpen className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto" />
              <h3 className="font-bold text-sm text-gray-700 dark:text-gray-300">All questions solved in this language!</h3>
              <p className="text-xs text-gray-400">Try switching to a different language tab or selecting an algorithmic topic filter.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
