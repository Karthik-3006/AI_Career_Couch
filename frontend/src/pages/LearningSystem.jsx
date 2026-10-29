import React, { useState, useEffect } from 'react';
import { learningService, codingService, adminService } from '../services/api';
import { BookOpen, Award, CheckCircle, XCircle, Code, HelpCircle, ArrowLeft, RefreshCw, Send, AlertTriangle, Maximize2, Minimize2, Plus, Edit2, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Paywall from '../components/Paywall';

export default function LearningSystem() {
  const { user } = useAuth();
  
  const hasAccess = Boolean(user?.is_subscriber || user?.is_trial_active || user?.bypass_all || user?.has_access || user?.roles?.includes('admin'));

  if (user && !hasAccess) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <Paywall featureName="Academic Syllabus & Placement Quizzes" />
      </div>
    );
  }

  // Navigation states: 'list_subjects' | 'subject_detail' | 'quiz_mode' | 'coding_mode' | 'quiz_result' | 'coding_result'
  const [viewState, setViewState] = useState('list_subjects');
  
  // Data states
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [topicQuestions, setTopicQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');
  
  // MCQ Quiz Session states
  const [answersMap, setAnswersMap] = useState({}); // { questionId: selectedOptionText }
  const [testResult, setTestResult] = useState(null);
  
  // Python Sandbox compiler states
  const [codingProblem, setCodingProblem] = useState(null);
  const [codeEditor, setCodeEditor] = useState('');
  const [compilerRunning, setCompilerRunning] = useState(false);
  const [compilerResult, setCompilerResult] = useState(null);
  const [isCompilerMaximized, setIsCompilerMaximized] = useState(false);
  
  // Notes states
  const [noteFormOpen, setNoteFormOpen] = useState(false);
  const [noteEditingId, setNoteEditingId] = useState(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');

  // Load subjects on mount
  useEffect(() => {
    loadSubjects();
  }, [categoryFilter]);

  const loadSubjects = async () => {
    setLoading(true);
    try {
      const res = await learningService.getSubjects(categoryFilter || null);
      setSubjects(res);
    } catch (err) {
      alert("Failed to load placement subjects.");
    } finally {
      setLoading(false);
    }
  };

  // 1. Opens subject details
  const handleSelectSubject = async (subjId) => {
    setLoading(true);
    try {
      const details = await learningService.getSubjectDetails(subjId);
      setSelectedSubject(details);
      setViewState('subject_detail');
    } catch (err) {
      alert("Failed to load subject details.");
    } finally {
      setLoading(false);
    }
  };

  // 2. Starts 30 MCQ Test
  const handleStartMCQ = async (topic) => {
    setLoading(true);
    setSelectedTopic(topic);
    try {
      const questions = await learningService.getTopicTest(topic._id);
      // Filter out coding problems for MCQ view
      const mcqs = questions.filter(q => q.type === 'mcq');
      setTopicQuestions(mcqs);
      setAnswersMap({});
      setTestResult(null);
      setViewState('quiz_mode');
    } catch (err) {
      alert("Failed to load quiz questions.");
    } finally {
      setLoading(false);
    }
  };

  // 3. Submits MCQ answers
  const handleSubmitMCQ = async () => {
    // Map submissions to expected API format: list of { question_id, answer }
    const submissions = topicQuestions.map(q => ({
      question_id: q._id,
      answer: answersMap[q._id] || ''
    }));

    setLoading(true);
    try {
      const res = await learningService.submitTest(selectedTopic._id, submissions);
      setTestResult(res);
      setViewState('quiz_result');
    } catch (err) {
      alert("Error grading test: " + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  // 4. Starts Python Coding Editor
  const handleStartCoding = async (topic) => {
    setLoading(true);
    setSelectedTopic(topic);
    try {
      const questions = await learningService.getTopicTest(topic._id);
      const coding = questions.find(q => q.type === 'coding');
      if (!coding) {
        alert("No coding tasks configured for this topic. Try Data Structures & Algorithms.");
        setViewState('subject_detail');
        return;
      }
      setCodingProblem(coding);
      setCodeEditor(coding.starter_code || 'def solution(arr):\n    # Write code here\n    pass');
      setCompilerResult(null);
      setViewState('coding_mode');
    } catch (err) {
      alert("Failed to load coding problem.");
    } finally {
      setLoading(false);
    }
  };

  // 5. Compiles Python code in Subprocess Sandbox
  const handleCompileSubmit = async () => {
    setCompilerRunning(true);
    setCompilerResult(null);
    try {
      const res = await codingService.submitSolution(codingProblem._id, codeEditor);
      setCompilerResult(res);
    } catch (err) {
      alert("Compiler error: " + (err.response?.data?.detail || err.message));
    } finally {
      setCompilerRunning(false);
    }
  };

  // Mock Test functions
  const handleStartMockTest = async () => {
    setLoading(true);
    try {
      const questions = await learningService.getMockTest();
      const mcqs = questions.filter(q => q.type === 'mcq');
      setTopicQuestions(mcqs);
      setAnswersMap({});
      setTestResult(null);
      setViewState('mock_test_mode');
    } catch (err) {
      alert("Failed to load mock test questions.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitMockTest = async () => {
    const submissions = topicQuestions.map(q => ({
      question_id: q._id,
      answer: answersMap[q._id] || ''
    }));

    setLoading(true);
    try {
      const res = await learningService.submitMockTest(submissions);
      setTestResult(res);
      setViewState('mock_test_result');
    } catch (err) {
      alert("Error grading mock test: " + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };


  const handleSaveNote = async (e) => {
    e.preventDefault();
    if (!selectedSubject) return;
    try {
      if (noteEditingId) {
        await adminService.editSubjectNote(selectedSubject._id, noteEditingId, { title: noteTitle, content: noteContent });
      } else {
        await adminService.addSubjectNote(selectedSubject._id, { title: noteTitle, content: noteContent });
      }
      setNoteFormOpen(false);
      setNoteEditingId(null);
      setNoteTitle('');
      setNoteContent('');
      handleSelectSubject(selectedSubject._id);
    } catch (err) {
      alert("Failed to save note: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleStartEditNote = (note) => {
    setNoteEditingId(note.id);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setNoteFormOpen(true);
  };

  const handleDeleteNote = async (noteId) => {
    if (!window.confirm("Are you sure you want to delete this course note?")) return;
    try {
      await adminService.deleteSubjectNote(selectedSubject._id, noteId);
      handleSelectSubject(selectedSubject._id);
    } catch (err) {
      alert("Failed to delete note: " + (err.response?.data?.detail || err.message));
    }
  };

  // --- RENDERS ---

  if (loading && viewState === 'list_subjects') {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="ml-3 text-sm text-gray-500">Loading syllabus desk...</span>
      </div>
    );
  }

  // A. Subjects Grid View
  if (viewState === 'list_subjects') {
    return (
      <div className="space-y-6 max-w-6xl mx-auto py-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Academic & Placement Placement Classroom</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Select CS Core subjects or Aptitude models to practice test exams.
            </p>
          </div>
          <div className="flex space-x-2 bg-white dark:bg-slate-800 p-1 rounded-xl border border-gray-200 dark:border-slate-700">
            {['', 'Core CS', 'Programming', 'Placement'].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  categoryFilter === cat ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                }`}
              >
                {cat || 'All Subjects'}
              </button>
            ))}
          </div>
        </div>
        {/* Full-Length Mock Test Banner */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row justify-between items-center gap-4 border border-indigo-500">
          <div className="flex items-center space-x-4">
            <div className="bg-white/20 p-3 rounded-full text-indigo-100 shrink-0">
              <Award className="h-8 w-8 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-black">Full-Length Placement Mock Test</h2>
              <p className="text-xs text-indigo-100 mt-1 max-w-xl">
                Test your knowledge with 30 randomly selected multiple-choice questions mixed from all subjects and topics combined. A 60% passing mark is required.
              </p>
            </div>
          </div>
          <button 
            onClick={handleStartMockTest}
            className="bg-white hover:bg-indigo-50 text-indigo-700 font-extrabold text-xs px-5 py-3 rounded-xl shadow-md transition-all whitespace-nowrap cursor-pointer"
          >
            Start Mock Test 📝
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjects.map((subj) => (
            <div
              key={subj._id}
              onClick={() => handleSelectSubject(subj._id)}
              className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-primary-300 dark:hover:border-primary-600 cursor-pointer transition-all space-y-4"
            >
              <div className="flex justify-between items-start">
                <span className="bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase border border-primary-100 dark:border-primary-900/40">
                  {subj.category}
                </span>
                <BookOpen className="h-5 w-5 text-gray-400 dark:text-slate-500" />
              </div>
              <div>
                <h3 className="font-extrabold text-gray-800 dark:text-white text-sm leading-snug">{subj.name}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed line-clamp-2">
                  {subj.description}
                </p>
              </div>
              <div className="text-xs font-bold text-primary-600 dark:text-primary-400 flex items-center justify-end pt-2 border-t border-gray-50 dark:border-slate-700">
                Explore Syllabus →
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // B. Subject Details: Topics list
  if (viewState === 'subject_detail' && selectedSubject) {
    return (
      <div className="max-w-4xl mx-auto py-4 space-y-6">
        <button onClick={() => setViewState('list_subjects')} className="flex items-center text-xs font-bold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-3 py-1.5 rounded-xl shadow-sm">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Subjects
        </button>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">{selectedSubject.name}</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{selectedSubject.description}</p>
            </div>
            <span className="text-xs font-bold bg-primary-100 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 px-2.5 py-1 rounded-full uppercase border border-primary-200 dark:border-primary-800">
              {selectedSubject.category}
            </span>
          </div>

          <div className="space-y-3 mt-6">
            <h3 className="font-bold text-gray-800 dark:text-white text-sm">Syllabus Topics & Practice Modules</h3>
            {selectedSubject.topics?.map((topic) => (
              <div key={topic._id} className="p-4 bg-gray-50 dark:bg-slate-900/50 rounded-xl border border-gray-100 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h4 className="font-bold text-gray-800 dark:text-white text-sm">{topic.name}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{topic.description}</p>
                </div>
                <div className="flex space-x-2 w-full sm:w-auto">
                  <button onClick={() => handleStartMCQ(topic)} className="flex-grow sm:flex-grow-0 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg transition-colors cursor-pointer">
                    Take Test (30 MCQ)
                  </button>
                  {/* Show compiler practice option for DSA & Python */}
                  {(selectedSubject.name === 'Data Structures and Algorithms' || selectedSubject.name === 'Python') && (
                    <button onClick={() => handleStartCoding(topic)} className="flex-grow sm:flex-grow-0 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg transition-colors flex items-center justify-center cursor-pointer">
                      <Code className="h-3.5 w-3.5 mr-1" /> Code Task
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Notes Section for each Course */}
          <div className="border-t dark:border-gray-700 pt-6 mt-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-extrabold text-gray-800 dark:text-white text-sm flex items-center">
                <BookOpen className="h-4.5 w-4.5 text-primary-500 mr-2" />
                Course Lecture Notes & Reference Guides
              </h3>
              {user?.roles?.includes('admin') && !noteFormOpen && (
                <button
                  onClick={() => {
                    setNoteEditingId(null);
                    setNoteTitle('');
                    setNoteContent('');
                    setNoteFormOpen(true);
                  }}
                  className="bg-primary-50 hover:bg-primary-100 dark:bg-slate-700 dark:hover:bg-slate-600 text-primary-700 dark:text-primary-300 font-bold text-xs px-3 py-1.5 rounded-xl border border-primary-200 dark:border-slate-600 flex items-center cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Course Note
                </button>
              )}
            </div>

            {noteFormOpen && (
              <form onSubmit={handleSaveNote} className="p-4 bg-gray-50 dark:bg-slate-900/60 border border-gray-200 dark:border-slate-700 rounded-xl space-y-3">
                <h4 className="font-bold text-xs text-gray-700 dark:text-gray-300">
                  {noteEditingId ? "Edit Reference Note" : "Upload Reference Note"}
                </h4>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">Note Title</label>
                  <input
                    type="text"
                    required
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    placeholder="e.g. Lecture 1: Core Definitions"
                    className="block w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-800 dark:text-white px-3 py-2 rounded-xl text-xs mt-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">Note Content (Markdown or Text)</label>
                  <textarea
                    required
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Enter the detailed note text or instructions here..."
                    rows={6}
                    className="block w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-800 dark:text-white px-3 py-2 rounded-xl text-xs mt-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="flex space-x-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNoteFormOpen(false);
                      setNoteEditingId(null);
                    }}
                    className="bg-white hover:bg-gray-50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-gray-300 font-bold text-xs px-4 py-2 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow cursor-pointer"
                  >
                    Save Note
                  </button>
                </div>
              </form>
            )}

            {!selectedSubject.notes || selectedSubject.notes.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400 italic py-4 text-center">
                No reference notes uploaded for this course yet.
              </p>
            ) : (
              <div className="space-y-3">
                {selectedSubject.notes.map((note) => (
                  <div key={note.id} className="p-4 bg-gray-50 dark:bg-slate-900/60 border border-gray-200 dark:border-slate-700 rounded-xl space-y-2">
                    <div className="flex justify-between items-start">
                      <h4 className="font-extrabold text-gray-800 dark:text-white text-xs">{note.title}</h4>
                      {user?.roles?.includes('admin') && (
                        <div className="flex space-x-1.5">
                          <button
                            onClick={() => handleStartEditNote(note)}
                            className="text-primary-600 hover:text-primary-700 dark:text-primary-400 p-1 hover:bg-primary-50 dark:hover:bg-primary-950/20 rounded cursor-pointer"
                            title="Edit Note"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="text-red-500 hover:text-red-700 dark:text-red-400 p-1 hover:bg-red-50 dark:hover:bg-red-950/20 rounded cursor-pointer"
                            title="Delete Note"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                      {note.content}
                    </p>
                    <div className="text-[9px] text-gray-400 dark:text-gray-400 pt-1 text-right">
                      Updated: {note.updated_at ? new Date(note.updated_at).toLocaleString() : 'N/A'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // C. Interactive Quiz rendering: 30 MCQs
  if (viewState === 'quiz_mode') {
    return (
      <div className="max-w-3xl mx-auto py-4 space-y-6">
        <div className="flex justify-between items-center">
          <button onClick={() => setViewState('subject_detail')} className="flex items-center text-xs font-bold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-3 py-1.5 rounded-xl shadow-sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Exit Exam
          </button>
          <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
            Subject: {selectedSubject.name} — {selectedTopic.name}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-6">
          <div className="border-b dark:border-slate-700 pb-3">
            <h3 className="font-extrabold text-gray-800 dark:text-white text-base leading-none">PLACEMENT PREPARATION TEST</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Contains exactly 30 questions. 60% passing mark required.</p>
          </div>

          <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
            {topicQuestions.map((q, qIdx) => (
              <div key={q._id} className="space-y-3 p-4 bg-gray-50 dark:bg-slate-900/50 rounded-xl border border-gray-200 dark:border-slate-700">
                <h4 className="font-bold text-sm text-gray-800 dark:text-white">Q{qIdx + 1}: {q.question}</h4>
                <div className="grid grid-cols-1 gap-2">
                  {q.options?.map((opt, optIdx) => (
                    <label key={optIdx} className="flex items-center space-x-3 bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-gray-200 dark:border-slate-700 hover:border-primary-400 dark:hover:border-primary-500 hover:bg-primary-50/10 dark:hover:bg-primary-950/20 cursor-pointer text-xs">
                      <input
                        type="radio"
                        name={`question-${q._id}`}
                        checked={answersMap[q._id] === opt}
                        onChange={() => setAnswersMap(prev => ({ ...prev, [q._id]: opt }))}
                        className="h-4 w-4 text-primary-600"
                      />
                      <span className="text-gray-700 dark:text-gray-200">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-4 border-t dark:border-slate-700">
            <button onClick={handleSubmitMCQ} disabled={loading} className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-bold text-sm px-6 py-2.5 rounded-xl shadow-sm cursor-pointer">
              {loading ? 'Submitting & Grading...' : 'Submit Answers'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // D. MCQ Test Grade Scorecard
  if (viewState === 'quiz_result' && testResult) {
    return (
      <div className="max-w-4xl mx-auto py-4 space-y-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b dark:border-slate-700 pb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">Test Score Card</h2>
              <p className="text-xs text-gray-400 dark:text-gray-400 mt-0.5">{selectedTopic.name} placement check</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-baseline space-x-0.5 bg-primary-50 dark:bg-primary-950/40 px-4 py-2 rounded-xl border border-primary-200 dark:border-primary-800">
                <span className="text-3xl font-black text-primary-600 dark:text-primary-400">{testResult.score_percentage}%</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 font-bold">score</span>
              </div>
              {testResult.passed ? (
                <span className="flex items-center text-xs font-bold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 px-3 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800">
                  <CheckCircle className="h-4 w-4 mr-1 shrink-0" /> PASSED
                </span>
              ) : (
                <span className="flex items-center text-xs font-bold bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-300 px-3 py-1.5 rounded-lg border border-red-300 dark:border-red-800">
                  <XCircle className="h-4 w-4 mr-1 shrink-0" /> FAILED
                </span>
              )}
            </div>
          </div>

          {!testResult.passed && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-4 rounded-xl flex items-start space-x-3 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              <AlertTriangle className="h-5 w-5 text-amber-500 dark:text-amber-400 mt-0.5 shrink-0" />
              <div>
                <span className="font-bold block">Improvement required!</span>
                This topic has been added to your profile's weak lists. Go to the dashboard to review your customized Granite study resources.
              </div>
            </div>
          )}

          {/* Test Answers Breakdown */}
          <div className="space-y-4 pt-2">
            <h3 className="font-bold text-gray-800 dark:text-white text-sm">Question Review & Correct Solutions</h3>
            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
              {testResult.results?.map((res, idx) => (
                <div key={idx} className="p-4 bg-gray-50 dark:bg-slate-900/50 rounded-xl border border-gray-200 dark:border-slate-700 space-y-2 text-xs">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-gray-800 dark:text-white">Q{idx + 1}: {res.question}</h4>
                    {res.is_correct ? (
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full shrink-0">Correct</span>
                    ) : (
                      <span className="text-[10px] font-bold text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-2 py-0.5 rounded-full shrink-0">Wrong</span>
                    )}
                  </div>
                  <p className="text-gray-600 dark:text-gray-400"><span className="font-bold text-gray-700 dark:text-gray-300">Your answer:</span> {res.user_answer || '(No response)'}</p>
                  {!res.is_correct && <p className="text-emerald-700 dark:text-emerald-400 font-medium"><span className="font-bold">Correct answer:</span> {res.correct_answer}</p>}
                  <div className="bg-white dark:bg-slate-800 p-2.5 rounded border border-gray-200 dark:border-slate-700 leading-relaxed">
                    <span className="font-bold text-gray-700 dark:text-gray-200 block mb-0.5">Explanation:</span>
                    <span className="text-gray-600 dark:text-gray-300">{res.explanation}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t dark:border-slate-700">
            <button onClick={() => setViewState('subject_detail')} className="bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm px-6 py-2.5 rounded-xl cursor-pointer">
              Finish & Return
            </button>
          </div>
        </div>
      </div>
    );
  }

  // E. Python Compiler Workspace Sandbox
  if (viewState === 'coding_mode' && codingProblem) {
    return (
      <div className="max-w-6xl mx-auto py-4 space-y-6">
        <div className="flex justify-between items-center">
          <button onClick={() => setViewState('subject_detail')} className="flex items-center text-xs font-bold text-gray-500 hover:text-gray-800 bg-white border border-gray-200 px-3 py-1.5 rounded-xl">
            <ArrowLeft className="h-4 w-4 mr-1" /> Exit Editor
          </button>
          <span className="text-xs font-semibold text-gray-500 capitalize">
            Topic: {selectedTopic.name}
          </span>
        </div>

        <div className={`grid grid-cols-1 gap-6 h-[75vh] ${isCompilerMaximized ? 'lg:grid-cols-1' : 'lg:grid-cols-2'}`}>
          {/* Question Statements */}
          {!isCompilerMaximized && (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between overflow-y-auto space-y-6">
              <div>
                <div className="flex justify-between items-start border-b dark:border-gray-700 pb-3">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white">{codingProblem.title}</h3>
                  <span className="text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-900/30 uppercase">
                    {codingProblem.difficulty}
                  </span>
                </div>
                
                <div className="mt-4 text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-mono whitespace-pre-wrap">
                  {codingProblem.question}
                </div>
                
                <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-xl space-y-3">
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">Starter template functions</span>
                  <pre className="text-xs font-mono text-gray-700 dark:text-gray-300">{codingProblem.starter_code}</pre>
                </div>
              </div>

              {/* Subprocess sandbox output details */}
              {compilerResult && (
                <div className="mt-6 border-t dark:border-gray-700 pt-4 space-y-4">
                  <h4 className="font-bold text-xs text-gray-800 dark:text-white uppercase tracking-wider font-mono">Test Suite Console Results</h4>
                  {compilerResult.passed ? (
                    <span className="flex items-center text-xs font-bold text-emerald-800 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-900/30 p-2.5 rounded-lg">
                      <CheckCircle className="h-4 w-4 mr-1.5 shrink-0" /> ALL TEST CASES PASSED SUCCESSFULLY
                    </span>
                  ) : (
                    <span className="flex items-center text-xs font-bold text-red-800 dark:text-red-400 bg-red-100 dark:bg-red-950/30 border border-red-300 dark:border-red-900/30 p-2.5 rounded-lg">
                      <XCircle className="h-4 w-4 mr-1.5 shrink-0" /> SOME TEST CASES FAILED IN SANDBOX
                    </span>
                  )}
                  
                  <div className="space-y-1.5 max-h-[25vh] overflow-y-auto text-xs">
                    {compilerResult.results?.map((tc, idx) => (
                      <div key={idx} className="p-2.5 bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-lg">
                        <div className="flex justify-between items-center font-bold mb-1">
                          <span className="text-gray-800 dark:text-white">Case #{idx + 1}</span>
                          {tc.passed ? (
                            <span className="text-emerald-600 dark:text-emerald-400">Passed</span>
                          ) : (
                            <span className="text-red-600 dark:text-red-400">Failed</span>
                          )}
                        </div>
                        {tc.error ? (
                          <pre className="text-red-600 dark:text-red-400 font-mono text-[10px] whitespace-pre-wrap">{tc.error}</pre>
                        ) : (
                          <div className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">
                            <p>Expected: {tc.expected}</p>
                            <p>Actual: {tc.actual}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sandbox Editor & AI Code Review */}
          <div className="flex flex-col space-y-6 h-full overflow-y-auto">
            {/* Editor Workspace */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col flex-grow min-h-[300px]">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-gray-800 dark:text-white text-sm">Python Editor Workspace</h3>
                <button
                  onClick={() => setIsCompilerMaximized(prev => !prev)}
                  className="flex items-center text-xs font-bold text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white border dark:border-gray-700 px-2.5 py-1 rounded-xl transition-all cursor-pointer"
                  type="button"
                >
                  {isCompilerMaximized ? (
                    <>
                      <Minimize2 className="h-3.5 w-3.5 mr-1" /> Restore Split View
                    </>
                  ) : (
                    <>
                      <Maximize2 className="h-3.5 w-3.5 mr-1" /> Maximize Compiler
                    </>
                  )}
                </button>
              </div>
              <textarea
                value={codeEditor}
                onChange={(e) => setCodeEditor(e.target.value)}
                rows={10}
                className="w-full flex-grow font-mono text-xs border border-gray-300 dark:border-gray-700 p-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none bg-gray-900 text-gray-100"
              />
              <div className="mt-4 flex justify-between items-center gap-4">
                <span className="text-[10px] text-gray-400 dark:text-gray-500">Runs sandbox subprocess. Included in 3-Day Free Trial & Premium.</span>
                <button onClick={handleCompileSubmit} disabled={compilerRunning} className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm cursor-pointer whitespace-nowrap">
                  {compilerRunning ? 'Compiling Subprocess...' : 'Run Python Solution'}
                </button>
              </div>
            </div>

            {/* AI Review Details */}
            {compilerResult?.ai_review && (
              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
                <h3 className="font-bold text-gray-800 dark:text-white text-sm border-b dark:border-gray-700 pb-2">IBM Granite Static Code Review</h3>
                
                <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-gray-600 dark:text-gray-400">
                  <div className="bg-gray-50 dark:bg-gray-900 p-2.5 rounded-lg border dark:border-gray-700">Time Complexity: <span className="text-primary-600 dark:text-primary-400 font-bold">{compilerResult.ai_review.time_complexity}</span></div>
                  <div className="bg-gray-50 dark:bg-gray-900 p-2.5 rounded-lg border dark:border-gray-700">Space Complexity: <span className="text-primary-600 dark:text-primary-400 font-bold">{compilerResult.ai_review.space_complexity}</span></div>
                </div>

                <div className="text-xs text-gray-600 dark:text-gray-300 italic bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border dark:border-gray-700">
                  "{compilerResult.ai_review.code_quality_feedback}"
                </div>

                <div className="space-y-1.5 text-xs">
                  <h4 className="font-bold text-gray-700 dark:text-gray-300">Code Optimization Suggestions:</h4>
                  <ul className="list-disc pl-4 text-gray-500 dark:text-gray-400 space-y-1 leading-relaxed">
                    {compilerResult.ai_review.suggestions?.map((sug, idx) => <li key={idx}>{sug}</li>)}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Mock Test Mode rendering
  if (viewState === 'mock_test_mode') {
    return (
      <div className="max-w-3xl mx-auto py-4 space-y-6">
        <div className="flex justify-between items-center">
          <button onClick={() => setViewState('list_subjects')} className="flex items-center text-xs font-bold text-gray-500 hover:text-gray-800 bg-white border border-gray-200 px-3 py-1.5 rounded-xl">
            <ArrowLeft className="h-4 w-4 mr-1" /> Exit Exam
          </button>
          <span className="text-xs font-bold text-gray-500">
            Placement Mock Test
          </span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
          <div className="border-b pb-3">
            <h3 className="font-extrabold text-gray-800 text-base leading-none">FULL-LENGTH PLACEMENT MOCK TEST</h3>
            <p className="text-xs text-gray-400 mt-1">Contains exactly 30 mixed MCQ questions across all subjects. 60% passing mark required.</p>
          </div>

          <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
            {topicQuestions.map((q, qIdx) => (
              <div key={q._id} className="space-y-3 p-4 bg-gray-50 rounded-xl border">
                <div className="flex justify-between items-start gap-4">
                  <h4 className="font-bold text-sm text-gray-800">Q{qIdx + 1}: {q.question}</h4>
                  <span className="bg-indigo-50 text-indigo-700 text-[9px] font-bold px-2 py-0.5 rounded uppercase shrink-0">
                    {q.language || q.topic || "General"}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {q.options?.map((opt, optIdx) => (
                    <label key={optIdx} className="flex items-center space-x-3 bg-white p-2.5 rounded-lg border border-gray-200 hover:border-primary-400 hover:bg-primary-50/10 cursor-pointer text-xs">
                      <input
                        type="radio"
                        name={`question-${q._id}`}
                        checked={answersMap[q._id] === opt}
                        onChange={() => setAnswersMap(prev => ({ ...prev, [q._id]: opt }))}
                        className="h-4 w-4 text-primary-600"
                      />
                      <span className="text-gray-700">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-4 border-t">
            <button onClick={handleSubmitMockTest} disabled={loading} className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-bold text-sm px-6 py-2.5 rounded-xl shadow-sm">
              {loading ? 'Submitting & Grading...' : 'Submit Mock Test'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Mock Test Result Scorecard
  if (viewState === 'mock_test_result' && testResult) {
    return (
      <div className="max-w-4xl mx-auto py-4 space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b pb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Mock Test Score Card</h2>
              <p className="text-xs text-gray-400 mt-0.5">Comprehensive placement readiness check</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-baseline space-x-0.5 bg-primary-50 px-4 py-2 rounded-xl border border-primary-200">
                <span className="text-3xl font-black text-primary-600">{testResult.score_percentage}%</span>
                <span className="text-xs text-gray-400 font-bold">score</span>
              </div>
              {testResult.passed ? (
                <span className="flex items-center text-xs font-bold bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-lg border border-emerald-300">
                  <CheckCircle className="h-4 w-4 mr-1 shrink-0" /> PASSED
                </span>
              ) : (
                <span className="flex items-center text-xs font-bold bg-red-100 text-red-800 px-3 py-1.5 rounded-lg border border-red-300">
                  <XCircle className="h-4 w-4 mr-1 shrink-0" /> FAILED
                </span>
              )}
            </div>
          </div>

          {!testResult.passed && (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start space-x-3 text-xs text-amber-800 leading-relaxed">
              <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <span className="font-bold block">Improvement required!</span>
                Try reviewing course lecture notes or target specific subjects to build up your overall placement readiness.
              </div>
            </div>
          )}

          {/* Test Answers Breakdown */}
          <div className="space-y-4 pt-2">
            <h3 className="font-bold text-gray-800 text-sm">Question Review & Correct Solutions</h3>
            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
              {testResult.results?.map((res, idx) => (
                <div key={idx} className="p-4 bg-gray-50 rounded-xl border space-y-2 text-xs">
                  <div className="flex justify-between items-start gap-4">
                    <h4 className="font-bold text-gray-800">Q{idx + 1}: {res.question}</h4>
                    {res.is_correct ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">Correct</span>
                    ) : (
                      <span className="text-[10px] font-bold text-red-700 bg-red-100 border border-red-200 px-2 py-0.5 rounded-full shrink-0">Wrong</span>
                    )}
                  </div>
                  <p className="text-gray-500"><span className="font-bold">Your answer:</span> {res.user_answer || '(No response)'}</p>
                  {!res.is_correct && <p className="text-emerald-700 font-medium"><span className="font-bold">Correct answer:</span> {res.correct_answer}</p>}
                  <div className="bg-white p-2.5 rounded border border-gray-100 leading-relaxed">
                    <span className="font-bold text-gray-700 block mb-0.5">Explanation:</span>
                    {res.explanation}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <button onClick={() => setViewState('list_subjects')} className="bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm px-6 py-2.5 rounded-xl cursor-pointer">
              Finish & Return
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
