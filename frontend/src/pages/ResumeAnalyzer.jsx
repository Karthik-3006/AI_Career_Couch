import React, { useState, useEffect } from 'react';
import { resumeService } from '../services/api';
import { Upload, FileText, CheckCircle, AlertTriangle, ShieldCheck, HelpCircle, Book } from 'lucide-react';

export default function ResumeAnalyzer() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [jobRole, setJobRole] = useState('Software Engineer');
  const [experience, setExperience] = useState('Entry Level (0-2 years)');
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    // Load existing analysis on mount if available
    resumeService.getAnalysis()
      .then((data) => {
        if (data) {
          setParsedData({ parsed_profile: data.parsed_profile, filename: data.filename });
          setAnalysis(data.analysis);
          if (data.target_role) setJobRole(data.target_role);
          if (data.target_experience) setExperience(data.target_experience);
        }
      })
      .catch(() => {});
  }, []);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setMessage('');
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setMessage('Please select a resume file first.');
      return;
    }

    setLoading(true);
    setMessage('');
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await resumeService.upload(formData);
      setParsedData(res);
      setAnalysis(null); // Clear old analysis till user triggers new role check
      setMessage('Resume uploaded and text parsed successfully! Review the detected profile below, adjust your target role, and click "Run ATS Analysis".');
    } catch (err) {
      setMessage(err.response?.data?.detail || 'Failed to upload and extract text.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setMessage('');
    
    const formData = new FormData();
    formData.append('job_role', jobRole);
    formData.append('experience', experience);

    try {
      const res = await resumeService.analyze(formData);
      setAnalysis(res);
      setMessage('ATS Analysis finished!');
    } catch (err) {
      setMessage(err.response?.data?.detail || 'Failed to complete resume analysis.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-4">
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Resume ATS Analyzer</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Upload PDF, DOCX, or scanned PNG/JPG. OCR will convert images and IBM Granite will score content.
        </p>

        {/* Upload Form */}
        <form onSubmit={handleUpload} className="mt-6 flex flex-col sm:flex-row items-center gap-4">
          <div className="w-full flex-grow">
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-slate-600 hover:border-primary-500 dark:hover:border-primary-400 rounded-xl h-24 cursor-pointer bg-gray-50 dark:bg-slate-900 transition-colors">
              <div className="flex flex-col items-center justify-center pt-2">
                <Upload className="h-6 w-6 text-gray-400 dark:text-slate-500" />
                <p className="text-xs text-gray-500 dark:text-slate-300 mt-1 font-semibold">
                  {file ? file.name : 'Select PDF, DOCX, PNG, JPG, or JPEG file'}
                </p>
                <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">Max size 10 MB</p>
              </div>
              <input type="file" required className="hidden" accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg,.webp" onChange={handleFileChange} />
            </label>
          </div>
          <button type="submit" disabled={loading} className="w-full sm:w-auto bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-bold text-sm px-6 py-4 rounded-xl transition-colors shrink-0">
            {loading ? 'Extracting Text / OCR...' : 'Upload & Parse'}
          </button>
        </form>

        {message && (
          <p className="mt-4 text-xs font-semibold text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-950/30 border border-primary-100 dark:border-primary-900/50 p-3 rounded-lg leading-relaxed">
            {message}
          </p>
        )}
      </div>

      {parsedData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Detected Profile Info */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm">
            <h3 className="font-bold text-gray-800 dark:text-white text-sm pb-3 border-b dark:border-slate-700">Auto-Detected profile</h3>
            <div className="mt-4 space-y-3.5 text-sm">
              <div>
                <span className="text-xs text-gray-400 dark:text-slate-400 block font-medium">Candidate Name</span>
                <span className="font-semibold text-gray-700 dark:text-gray-200">{parsedData.parsed_profile?.name || 'Unknown'}</span>
              </div>
              <div>
                <span className="text-xs text-gray-400 dark:text-slate-400 block font-medium">Inferred Job Role</span>
                <span className="font-semibold text-gray-700 dark:text-gray-200">{parsedData.parsed_profile?.job_role || 'Unknown'}</span>
              </div>
              <div>
                <span className="text-xs text-gray-400 dark:text-slate-400 block font-medium">Inferred Experience</span>
                <span className="font-semibold text-gray-700 dark:text-gray-200">{parsedData.parsed_profile?.experience || 'Unknown'}</span>
              </div>
              <div>
                <span className="text-xs text-gray-400 dark:text-slate-400 block font-medium">Skills Detected</span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {parsedData.parsed_profile?.skills?.map((s, idx) => (
                    <span key={idx} className="bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 text-[10px] font-bold px-2 py-0.5 rounded">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Run Analysis Settings */}
            <div className="mt-8 pt-6 border-t dark:border-slate-700 space-y-4">
              <h4 className="font-bold text-gray-800 dark:text-white text-xs">Run ATS Optimization Match</h4>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Target Placement Role</label>
                <input type="text" value={jobRole} onChange={(e) => setJobRole(e.target.value)} className="block w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-800 dark:text-white px-3 py-1.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Experience Tier</label>
                <select value={experience} onChange={(e) => setExperience(e.target.value)} className="block w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-800 dark:text-white px-3 py-1.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="Entry Level (0-2 years)">Entry Level (0-2 years)</option>
                  <option value="Mid Level (2-5 years)">Mid Level (2-5 years)</option>
                  <option value="Senior Level (5-8 years)">Senior Level (5-8 years)</option>
                  <option value="Lead / Principal (8+ years)">Lead / Principal (8+ years)</option>
                </select>
              </div>
              <button onClick={handleAnalyze} disabled={analyzing} className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs py-2.5 rounded-lg transition-colors">
                {analyzing ? 'Analyzing Match Score...' : 'Run ATS Analysis'}
              </button>
            </div>
          </div>

          {/* ATS Analysis Report Column */}
          <div className="md:col-span-2 space-y-6">
            {analysis ? (
              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b dark:border-slate-700 pb-4">
                  <div>
                    <h3 className="font-bold text-gray-800 dark:text-white text-lg">ATS Evaluator Report</h3>
                    <p className="text-xs text-gray-400 dark:text-slate-400 mt-0.5">Matching target: {jobRole} ({experience})</p>
                  </div>
                  <div className="flex items-baseline space-x-1 shrink-0">
                    <span className="text-4xl font-extrabold text-primary-600 dark:text-primary-400">{analysis.score}</span>
                    <span className="text-gray-400 dark:text-slate-500 text-sm font-semibold">/100</span>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-slate-900/50 p-4 rounded-xl border border-gray-100 dark:border-slate-800">
                  <h4 className="font-bold text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">AI Executive Summary</h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300 italic">"{analysis.summary}"</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Strengths */}
                  <div className="space-y-2">
                    <h4 className="flex items-center font-bold text-gray-800 dark:text-white text-sm">
                      <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-500 mr-1.5 shrink-0" />
                      Strengths / Highlights
                    </h4>
                    <ul className="space-y-1.5">
                      {analysis.strengths?.map((str, idx) => (
                        <li key={idx} className="text-xs text-gray-600 dark:text-gray-300 pl-4 border-l-2 border-emerald-500 dark:border-emerald-600 leading-relaxed">
                          {str}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Suggestions */}
                  <div className="space-y-2">
                    <h4 className="flex items-center font-bold text-gray-800 dark:text-white text-sm">
                      <AlertTriangle className="h-4 w-4 text-amber-500 dark:text-amber-400 mr-1.5 shrink-0" />
                      Suggestions for Improvement
                    </h4>
                    <ul className="space-y-1.5">
                      {analysis.suggestions?.map((sug, idx) => (
                        <li key={idx} className="text-xs text-gray-600 dark:text-gray-300 pl-4 border-l-2 border-amber-500 dark:border-amber-600 leading-relaxed">
                          {sug}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t dark:border-slate-700">
                  {/* Missing Skills */}
                  <div>
                    <h4 className="font-bold text-gray-800 dark:text-white text-xs uppercase tracking-wider mb-2">
                      Missing Placement Skills
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {analysis.missing_skills?.map((sk, idx) => (
                        <span key={idx} className="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-xs font-semibold px-2.5 py-1 rounded-md border border-red-100 dark:border-red-900/50">
                          {sk}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Keywords */}
                  <div>
                    <h4 className="font-bold text-gray-800 dark:text-white text-xs uppercase tracking-wider mb-2">
                      Keywords Detected
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {analysis.keywords?.map((kw, idx) => (
                        <span key={idx} className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold px-2.5 py-1 rounded-md border border-emerald-100 dark:border-emerald-900/50">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Suggested Placement Courses */}
                {analysis.suggested_courses && analysis.suggested_courses.length > 0 && (
                  <div className="pt-6 border-t dark:border-slate-700 space-y-3">
                    <h4 className="font-bold text-gray-800 dark:text-white text-xs uppercase tracking-wider flex items-center">
                      <Book className="h-4.5 w-4.5 text-indigo-500 mr-2 shrink-0" /> Suggested Courses to Close Skill Gaps
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {analysis.suggested_courses.map((course, idx) => (
                        <div key={idx} className="bg-gray-50 dark:bg-slate-900/50 p-4 rounded-xl border border-gray-100 dark:border-slate-800 space-y-2">
                          <h5 className="font-bold text-gray-800 dark:text-white text-xs">{course.title}</h5>
                          <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-900/50 font-semibold inline-block">
                            {course.channel || course.platform || "Free Course"}
                          </span>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed">"{course.reason}"</p>
                          <a href={course.url} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-primary-600 dark:text-primary-400 hover:underline block pt-1">
                            Go to Course →
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-800 p-12 rounded-2xl border border-gray-200 dark:border-slate-700 border-dashed text-center flex flex-col justify-center items-center h-full min-h-[300px]">
                <FileText className="h-10 w-10 text-gray-300 dark:text-slate-600 mb-3" />
                <h4 className="font-bold text-gray-700 dark:text-slate-300 text-sm">ATS Analysis Report Empty</h4>
                <p className="text-xs text-gray-400 dark:text-slate-500 max-w-sm mt-1">
                  Adjust target settings in the left column and click "Run ATS Analysis" to evaluate keyword match rates.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
