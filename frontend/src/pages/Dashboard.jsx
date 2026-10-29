import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { learningService, resumeService } from '../services/api';
import { Sparkles, FileText, ArrowRight, BookOpen, MessageSquare, AlertCircle, Award } from 'lucide-react';

export default function Dashboard() {
  const [recommendations, setRecommendations] = useState([]);
  const [progress, setProgress] = useState([]);
  const [resume, setResume] = useState(null);
  const [certStatus, setCertStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      learningService.getRecommendations().catch(() => []),
      learningService.getProgress().catch(() => []),
      resumeService.getAnalysis().catch(() => null),
      learningService.getCertificate().catch(() => null)
    ]).then(([recsData, progData, resumeData, certData]) => {
      setRecommendations(recsData);
      setProgress(progData);
      setResume(resumeData);
      setCertStatus(certData);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="ml-3 text-sm text-gray-500 dark:text-gray-400">Loading student metrics...</span>
      </div>
    );
  }

  const overallReadinessScore = resume?.analysis?.score || 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-4">
      {/* Certificate Congratulations Banner */}
      {certStatus?.eligible && (
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-600 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row justify-between items-center gap-4 border border-amber-400">
          <div className="flex items-center space-x-4">
            <div className="bg-white/20 p-3 rounded-full text-yellow-200">
              <Award className="h-8 w-8 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-black">Congratulations! You Cleared All Placement Subjects!</h2>
              <p className="text-xs text-amber-100 mt-1 max-w-xl">
                Your digital Certificate of Interview Readiness has been issued. Click the button to view and print your verifiable credential.
              </p>
            </div>
          </div>
          <Link 
            to="/certificate" 
            className="bg-white hover:bg-yellow-50 text-amber-700 font-extrabold text-xs px-5 py-3 rounded-xl shadow-md transition-all whitespace-nowrap"
          >
            Claim / View Certificate 🎓
          </Link>
        </div>
      )}

      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white rounded-2xl p-6 shadow-md">
        <h1 className="text-2xl md:text-3xl font-extrabold">Welcome back to your Career Desk!</h1>
        <p className="mt-2 text-primary-100 text-sm md:text-base max-w-xl">
          Use the AI recommendations below to target your knowledge gaps, complete subject tests, and prepare for placement interviews.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core Career Score Column */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-gray-800 dark:text-white text-base">ATS Career Readiness Score</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Determined by your resume evaluation</p>
            
            <div className="mt-6 flex items-baseline justify-center">
              <span className="text-6xl font-black text-primary-600 dark:text-primary-400">{overallReadinessScore}</span>
              <span className="text-gray-400 dark:text-gray-500 font-semibold text-lg">/100</span>
            </div>
            
            {resume ? (
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-6 text-center italic bg-gray-50 dark:bg-slate-900/60 p-3 rounded-lg border border-gray-100 dark:border-slate-700">
                "{resume.analysis?.summary}"
              </p>
            ) : (
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">No resume analyzed yet.</p>
                <Link to="/resume" className="mt-3 inline-flex items-center text-xs font-bold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 bg-primary-50 dark:bg-primary-950/30 px-3 py-1.5 rounded-lg border border-primary-200 dark:border-primary-800">
                  Upload Resume <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
              </div>
            )}
          </div>
          {resume && (
            <Link to="/resume" className="mt-6 text-center text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline inline-flex items-center justify-center">
              View Detailed Resume Report <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          )}
        </div>

        {/* AI Recommendations Column */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center space-x-2 pb-4 border-b border-gray-100 dark:border-slate-700">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <h3 className="font-bold text-gray-800 dark:text-white text-base">Personalized AI Study Priority List</h3>
          </div>
          
          <div className="mt-4 space-y-3">
            {recommendations.length > 0 ? (
              recommendations.map((rec, idx) => (
                <div key={idx} className="flex items-start justify-between p-3.5 bg-gray-50 dark:bg-slate-900/50 rounded-xl border border-gray-100 dark:border-slate-700/80 hover:border-primary-200 dark:hover:border-primary-700 hover:bg-primary-50/20 dark:hover:bg-primary-950/10 transition-all">
                  <div className="flex space-x-3">
                    <span className={`inline-flex p-2 rounded-lg text-xs font-bold shrink-0 ${
                      rec.type === 'Resume Gap' ? 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/40' :
                      rec.type === 'Interview Weakness' ? 'bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-900/40' :
                      'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/40'
                    }`}>
                      {rec.type}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-gray-800 dark:text-white">{rec.name}</h4>
                      <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">{rec.reason}</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 capitalize shrink-0 ml-2">{rec.subject}</span>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-gray-500 dark:text-gray-400 text-sm">
                No custom recommendations yet. Upload your resume or take a mock interview!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progress Cards */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm">
        <h3 className="font-bold text-gray-800 dark:text-white text-base mb-4">Your Academic Placement Quizzes</h3>
        
        {progress.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {progress.map((prog, idx) => (
              <div key={idx} className="p-4 bg-gray-50 dark:bg-slate-900/50 rounded-xl border border-gray-100 dark:border-slate-700/80">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-200 px-2 py-0.5 rounded-full capitalize">
                    {prog.subject_name}
                  </span>
                  <BookOpen className="h-4 w-4 text-gray-400 dark:text-slate-500" />
                </div>
                <h4 className="font-bold text-gray-800 dark:text-white text-sm">{prog.subject_name} Module</h4>
                <div className="mt-3 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>Completed: {prog.completed_topics?.length || 0} topics</span>
                  <span className="font-semibold text-primary-600 dark:text-primary-400">
                    Highest Score: {Object.values(prog.scores || {}).length > 0 ? Math.max(...Object.values(prog.scores)) : 0}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 dark:bg-slate-900/40 rounded-xl border border-dashed border-gray-200 dark:border-slate-700">
            <BookOpen className="h-8 w-8 text-gray-400 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No subject progress logged yet.</p>
            <Link to="/learning" className="mt-3 inline-flex items-center text-xs font-bold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 px-3.5 py-1.5 rounded-lg shadow-sm">
              Start Placement Subjects
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
