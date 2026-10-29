import React, { useState, useEffect } from 'react';
import { roadmapService } from '../services/api';
import { Compass, Book, Play, HelpCircle, ArrowRight, Sparkles } from 'lucide-react';

export default function Roadmap() {
  const [domain, setDomain] = useState('Full Stack Web Development');
  const [level, setLevel] = useState('Complete Beginner');
  const [goal, setGoal] = useState('Land a Software Engineer job');
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    roadmapService.getMe()
      .then((data) => {
        setRoadmap(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setGenerating(true);
    try {
      const data = await roadmapService.generate(domain, level, goal);
      setRoadmap(data);
    } catch (err) {
      alert("Failed to generate career roadmap: " + (err.response?.data?.detail || err.message));
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="ml-3 text-sm text-gray-500">Loading career roadmap...</span>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-4">
      {/* Configuration Box */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center space-x-2">
          <Compass className="h-6 w-6 text-primary-600 dark:text-primary-400 animate-spin-slow" />
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Personalized Learning Roadmap</h2>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Define your target industry or job role. IBM Granite will build a structured weekly learning roadmap with courses, books, and study targets.
        </p>

        <form onSubmit={handleGenerate} className="mt-6 grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-slate-300 mb-1">Target Domain / Role</label>
            <input type="text" required value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="e.g. Data Scientist" className="block w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-800 dark:text-white px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-slate-300 mb-1">Current Knowledge Level</label>
            <select value={level} onChange={(e) => setLevel(e.target.value)} className="block w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-800 dark:text-white px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="Complete Beginner">Complete Beginner</option>
              <option value="Intermediate Developer">Intermediate Developer</option>
              <option value="Advanced / Professional">Advanced / Professional</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-slate-300 mb-1">Your End Goal</label>
            <input type="text" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. Pass placement exam" className="block w-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-800 dark:text-white px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div className="flex items-end">
            <button type="submit" disabled={generating} className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-colors">
              {generating ? 'Generating Map...' : 'Generate Roadmap'}
            </button>
          </div>
        </form>
      </div>

      {roadmap ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Vertical timeline details */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm">
              <h3 className="font-bold text-gray-800 dark:text-white text-base mb-2">Roadmap Syllabus Milestones</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed italic mb-6">
                "{roadmap.overview}"
              </p>

              {/* Vertical timeline graphics */}
              <div className="relative border-l-2 border-gray-200 dark:border-slate-700 ml-3 space-y-8">
                {roadmap.phases?.map((phase, idx) => (
                  <div key={idx} className="relative pl-6">
                    {/* Circle icon marker */}
                    <span className="absolute -left-[9px] top-1 bg-primary-600 dark:bg-primary-500 border-4 border-white dark:border-slate-800 h-4.5 w-4.5 rounded-full shadow-sm ring-4 ring-primary-50 dark:ring-primary-950/30"></span>
                    
                    <div className="bg-gray-50 dark:bg-slate-900/50 p-4 rounded-xl border border-gray-100 dark:border-slate-800 space-y-2">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-gray-800 dark:text-white text-sm leading-none">{phase.title}</h4>
                        <span className="text-[10px] font-bold bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded-full">
                          {phase.duration}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{phase.description}</p>
                      
                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {phase.topics?.map((topic, tIdx) => (
                          <span key={tIdx} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Reference lists: Books and Playlists */}
          <div className="space-y-6">
            {/* Recommended Books */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm">
              <h3 className="font-bold text-gray-800 dark:text-white text-sm border-b dark:border-slate-700 pb-3 mb-4 flex items-center">
                <Book className="h-4.5 w-4.5 text-indigo-500 mr-2 shrink-0" /> Recommended Books
              </h3>
              <div className="space-y-4">
                {roadmap.books?.map((book, idx) => (
                  <div key={idx} className="text-xs space-y-1">
                    <h4 className="font-bold text-gray-800 dark:text-white">{book.title}</h4>
                    <p className="text-gray-400 dark:text-slate-400 font-medium leading-none">by {book.author}</p>
                    <p className="text-gray-500 dark:text-gray-400 leading-relaxed pt-0.5">"{book.reason}"</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Video Playlists */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm">
              <h3 className="font-bold text-gray-800 dark:text-white text-sm border-b dark:border-slate-700 pb-3 mb-4 flex items-center">
                <Play className="h-4.5 w-4.5 text-red-500 mr-2 shrink-0" /> Free Video Playlists
              </h3>
              <div className="space-y-4">
                {roadmap.videos?.map((vid, idx) => (
                  <div key={idx} className="text-xs space-y-1">
                    <h4 className="font-bold text-gray-800 dark:text-white">{vid.title}</h4>
                    <span className="text-[10px] bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 px-2 py-0.5 rounded border border-red-100 dark:border-red-900/50 font-semibold inline-block">
                      {vid.channel}
                    </span>
                    <p className="text-gray-500 dark:text-gray-400 leading-relaxed pt-0.5">"{vid.reason}"</p>
                    <a href={vid.url} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-primary-600 dark:text-primary-400 hover:underline block pt-1 inline-flex items-center">
                      Watch on YouTube <ArrowRight className="h-3 w-3 ml-0.5" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 p-12 rounded-2xl border border-gray-200 dark:border-slate-700 border-dashed text-center flex flex-col justify-center items-center min-h-[300px]">
          <Compass className="h-10 w-10 text-gray-300 dark:text-slate-600 mb-3" />
          <h4 className="font-bold text-gray-700 dark:text-slate-300 text-sm">No Roadmap Generated</h4>
          <p className="text-xs text-gray-400 dark:text-slate-500 max-w-sm mt-1">
            Choose a target programming or CS path, configure options, and trigger the roadmap generator.
          </p>
        </div>
      )}
    </div>
  );
}
