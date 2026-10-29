import React, { useState } from 'react';
import { interviewService } from '../services/api';
import { Sparkles, MessageSquare, Award, AlertCircle, Play, ChevronRight, RefreshCw, Star } from 'lucide-react';

export default function InterviewSetup() {
  // Outer state: 'setup' | 'session' | 'report'
  const [viewState, setViewState] = useState('setup');
  
  // Setup fields
  const [name, setName] = useState('');
  const [jobRole, setJobRole] = useState('Software Engineer');
  const [experience, setExperience] = useState('Entry Level (0-2 years)');
  const [interviewType, setInterviewType] = useState('Mixed');
  const [topic, setTopic] = useState('');
  const [useResume, setUseResume] = useState(false);
  const [setupError, setSetupError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Active session fields
  const [interviewId, setInterviewId] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [questionNum, setQuestionNum] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(7);
  const [answerInput, setAnswerInput] = useState('');
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [lastEvaluation, setLastEvaluation] = useState(null);
  
  // Completed report fields
  const [report, setReport] = useState(null);

  // 1. Starts mock interview
  const handleStart = async (e) => {
    e.preventDefault();
    setSetupError('');
    setLoading(true);
    try {
      const res = await interviewService.start({
        name,
        job_role: jobRole,
        experience,
        interview_type: interviewType,
        topic: topic || null,
        use_resume: useResume
      });
      setInterviewId(res.interview_id);
      setCurrentQuestion(res.question);
      setQuestionNum(res.question_number);
      setTotalQuestions(res.total_questions);
      setViewState('session');
      setAnswerInput('');
      setLastEvaluation(null);
    } catch (err) {
      setSetupError(err.response?.data?.detail || 'Failed to start interview session.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Evaluates current answer & fetches feedback
  const handleAnswerSubmit = async () => {
    if (!answerInput.strip()) {
      alert("Answer cannot be empty!");
      return;
    }
    setSubmittingAnswer(true);
    try {
      const res = await interviewService.submitAnswer(interviewId, answerInput);
      setLastEvaluation(res);
    } catch (err) {
      alert("Error submitting answer: " + (err.response?.data?.detail || err.message));
    } finally {
      setSubmittingAnswer(false);
    }
  };

  // 3. Move to next question or trigger completion
  const handleNextQuestion = () => {
    if (lastEvaluation?.is_last) {
      handleLoadReport();
    } else {
      setCurrentQuestion(lastEvaluation.next_question);
      setQuestionNum(lastEvaluation.next_question_number);
      setAnswerInput('');
      setLastEvaluation(null);
    }
  };

  // 4. Fetch final scoring metrics
  const handleLoadReport = async () => {
    setLoading(true);
    try {
      const res = await interviewService.getReport(interviewId);
      setReport(res);
      setViewState('report');
    } catch (err) {
      alert("Failed to load interview report: " + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setViewState('setup');
    setInterviewId(null);
    setReport(null);
    setLastEvaluation(null);
  };

  // --- VIEWS ---

  if (viewState === 'setup') {
    return (
      <div className="max-w-3xl mx-auto py-4 space-y-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center space-x-2">
            <MessageSquare className="h-6 w-6 text-primary-600 dark:text-primary-400" />
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">AI Mock Interview Practice Desk</h2>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Conduct a simulated voice/text interview. Questions can be aligned with specific subjects, target roles, or your uploaded resume context.
          </p>

          <form onSubmit={handleStart} className="mt-6 space-y-4">
            {setupError && (
              <div className="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-xs p-3 rounded-lg border border-red-200 dark:border-red-900/50">
                {setupError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-slate-300 mb-1">Your Name</label>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. John Doe" className="block w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-800 dark:text-white px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-slate-300 mb-1">Target Placement Role</label>
                <input type="text" required value={jobRole} onChange={(e) => setJobRole(e.target.value)} className="block w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-800 dark:text-white px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-slate-300 mb-1">Experience Level</label>
                <select value={experience} onChange={(e) => setExperience(e.target.value)} className="block w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-800 dark:text-white px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="Entry Level (0-2 years)">Entry Level (0-2 years)</option>
                  <option value="Mid Level (2-5 years)">Mid Level (2-5 years)</option>
                  <option value="Senior Level (5-8 years)">Senior Level (5-8 years)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-slate-300 mb-1">Interview Type</label>
                <select value={interviewType} onChange={(e) => setInterviewType(e.target.value)} className="block w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-800 dark:text-white px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="Mixed">Mixed (HR & Tech)</option>
                  <option value="Technical">Technical Depth</option>
                  <option value="HR">HR / Behavioural</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-slate-300 mb-1">Focus Subject/Topic (Optional)</label>
                <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Operating Systems" className="block w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-800 dark:text-white px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
            </div>

            <div className="flex items-center space-x-3 bg-gray-50 dark:bg-slate-900/50 p-3 rounded-xl border dark:border-slate-700">
              <input type="checkbox" id="useResume" checked={useResume} onChange={(e) => setUseResume(e.target.checked)} className="h-4 w-4 text-primary-600 dark:text-primary-400 bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded" />
              <label htmlFor="useResume" className="text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                Ground questions in my uploaded resume file context (asks questions about your past projects/skills).
              </label>
            </div>

            <button type="submit" disabled={loading} className="w-full flex items-center justify-center bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 rounded-xl transition-all shadow-sm">
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Generating bespoke questions...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" /> Start Mock Interview
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (viewState === 'session') {
    return (
      <div className="max-w-4xl mx-auto py-4 space-y-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-4">
          {/* Progress Header */}
          <div className="flex justify-between items-center border-b dark:border-slate-700 pb-3">
            <span className="text-xs font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider">
              Active Mock Interview
            </span>
            <span className="text-xs font-semibold text-gray-500 dark:text-slate-400">
              Question {questionNum} of {totalQuestions}
            </span>
          </div>
 
          {/* Question Display */}
          <div className="py-4">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white leading-snug">
              {currentQuestion}
            </h3>
          </div>
 
          {/* User Answer Textbox */}
          {!lastEvaluation && (
            <div className="space-y-4">
              <textarea
                rows={6}
                value={answerInput}
                onChange={(e) => setAnswerInput(e.target.value)}
                placeholder="Type your response here in detail (minimum 15 characters, try using the STAR method for behavioural questions)..."
                className="w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-800 dark:text-white p-4 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 placeholder-gray-400 dark:placeholder-slate-400"
              />
              <div className="flex justify-end">
                <button
                  onClick={handleAnswerSubmit}
                  disabled={submittingAnswer || !answerInput.strip()}
                  className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-bold px-6 py-2.5 rounded-xl transition-colors"
                >
                  {submittingAnswer ? 'Evaluating Answer...' : 'Submit Answer'}
                </button>
              </div>
            </div>
          )}
 
          {/* Single Question Evaluation Feedback */}
          {lastEvaluation && (
            <div className="mt-4 p-5 bg-gray-50 dark:bg-slate-900/50 rounded-2xl border border-gray-100 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b dark:border-slate-800 pb-3">
                <h4 className="font-bold text-sm text-gray-800 dark:text-white">IBM Granite Performance Feedback</h4>
                <div className="flex items-baseline space-x-0.5 shrink-0">
                  <span className="text-2xl font-extrabold text-primary-600 dark:text-primary-400">
                    {lastEvaluation.evaluation?.score}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-slate-500 font-semibold">/10</span>
                </div>
              </div>
 
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Strengths */}
                <div className="space-y-1">
                  <h5 className="font-bold text-emerald-700 dark:text-emerald-400">What You Did Well:</h5>
                  <ul className="list-disc pl-4 text-gray-600 dark:text-gray-300 space-y-0.5">
                    {lastEvaluation.evaluation?.strengths?.map((s, idx) => <li key={idx}>{s}</li>)}
                  </ul>
                </div>
                {/* Weaknesses */}
                <div className="space-y-1">
                  <h5 className="font-bold text-amber-700 dark:text-amber-400">Gaps Detected:</h5>
                  <ul className="list-disc pl-4 text-gray-600 dark:text-gray-300 space-y-0.5">
                    {lastEvaluation.evaluation?.weaknesses?.map((w, idx) => <li key={idx}>{w}</li>)}
                  </ul>
                </div>
              </div>
 
              <div className="text-xs text-gray-600 dark:text-gray-300 italic bg-white dark:bg-slate-800 p-3 rounded-lg border dark:border-slate-700">
                "{lastEvaluation.evaluation?.feedback}"
              </div>
 
              {/* Suggested Model Answer */}
              <div className="bg-primary-50/50 dark:bg-primary-950/20 p-4 rounded-xl border border-primary-100 dark:border-primary-900/30">
                <h5 className="flex items-center text-xs font-bold text-primary-700 dark:text-primary-300 mb-1">
                  <Star className="h-3.5 w-3.5 mr-1 text-amber-500 fill-amber-500" />
                  Model Answer Suggestion
                </h5>
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed italic">
                  "{lastEvaluation.suggested_answer}"
                </p>
              </div>
 
              {/* Progress Button */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleNextQuestion}
                  className="flex items-center bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all"
                >
                  {lastEvaluation.is_last ? 'View Summary Report' : 'Next Question'}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
 
  if (viewState === 'report' && report) {
    return (
      <div className="max-w-4xl mx-auto py-4 space-y-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b dark:border-slate-700 pb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">Placement Interview Score Card</h2>
              <p className="text-xs text-gray-400 dark:text-slate-400 mt-0.5">
                Session targeting: {report.job_role} {report.topic ? `(${report.topic})` : ''}
              </p>
            </div>
            <div className="flex items-baseline space-x-0.5 bg-primary-50 dark:bg-primary-950/20 border border-primary-200 dark:border-primary-900/30 px-4 py-2 rounded-xl">
              <span className="text-3xl font-black text-primary-600 dark:text-primary-400">{report.overall_score}</span>
              <span className="text-xs text-gray-400 dark:text-slate-500 font-bold">/10</span>
            </div>
          </div>
 
          {/* Weakness Warnings */}
          {report.detected_weaknesses?.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 p-4 rounded-xl flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-amber-500 dark:text-amber-400 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-bold text-xs text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                  Weaknesses Exported to Learning Recommendations
                </h4>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {report.detected_weaknesses.map((w, idx) => (
                    <span key={idx} className="bg-white dark:bg-slate-800 border border-amber-200 dark:border-slate-700 text-amber-700 dark:text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded">
                      {w}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
 
          {/* Individual Question QA Breakdown */}
          <div className="space-y-4 pt-4">
            <h3 className="font-bold text-gray-800 dark:text-white text-sm">Response Timeline & Review</h3>
            {report.answers?.map((item, idx) => (
              <div key={idx} className="p-4 bg-gray-50 dark:bg-slate-900/50 rounded-xl border border-gray-100 dark:border-slate-800 space-y-3">
                <div className="flex justify-between items-start border-b dark:border-slate-700 pb-2">
                  <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300">Q{idx + 1}: {item.question}</h4>
                  <span className="text-xs font-bold bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded-full shrink-0">
                    Score: {item.score}/10
                  </span>
                </div>
                <div className="text-xs space-y-2 text-gray-600 dark:text-gray-400">
                  <p><span className="font-bold text-gray-700 dark:text-gray-300">Your Answer:</span> "{item.answer}"</p>
                  <p><span className="font-bold text-gray-700 dark:text-gray-300">Coach Feedback:</span> "{item.feedback}"</p>
                  <p className="bg-white dark:bg-slate-800 p-2.5 rounded border dark:border-slate-700 italic"><span className="font-bold text-primary-700 dark:text-primary-400">Suggested Approach:</span> "{item.suggested_answer}"</p>
                </div>
              </div>
            ))}
          </div>
 
          <div className="flex justify-end pt-4 border-t dark:border-slate-700">
            <button
              onClick={handleReset}
              className="bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm px-6 py-2.5 rounded-xl transition-colors"
            >
              Start New Interview Session
            </button>
          </div>
        </div>
      </div>
    );
  }
 
  return null;
}
