import React, { useState, useEffect, useMemo } from 'react';
import { updatesService } from '../services/api';
import { Calendar, Tag, BookOpen, RefreshCw, Search } from 'lucide-react';

export default function Updates() {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  useEffect(() => {
    loadUpdates();
  }, []);

  const loadUpdates = async () => {
    setLoading(true);
    try {
      const data = await updatesService.getUpdates();
      setUpdates(data);
    } catch (err) {
      alert("Failed to load updates board.");
    } finally {
      setLoading(false);
    }
  };

  const filteredUpdates = useMemo(() => {
    return updates.filter((up) => {
      const matchesCategory = categoryFilter === 'ALL' || up.category === categoryFilter;
      const matchesSearch = !searchFilter.trim() || 
        (up.title && up.title.toLowerCase().includes(searchFilter.toLowerCase())) ||
        (up.content && up.content.toLowerCase().includes(searchFilter.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [updates, categoryFilter, searchFilter]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full py-16">
        <RefreshCw className="h-8 w-8 text-emerald-600 dark:text-palegreen animate-spin" />
        <span className="ml-3 text-sm font-bold text-black dark:text-white">Loading updates & notes board...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-black p-6 rounded-2xl border-2 border-gray-200 dark:border-palegreen shadow-sm dark:shadow-[0_0_20px_rgba(159,188,173,0.15)] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-black dark:text-white tracking-tight">
              Admin Updates & Notes Board
            </h2>
            <p className="text-xs font-semibold text-blue-600 dark:text-blue-300 mt-0.5">
              Placement notes, study guidelines, and career preparation insights directly from the training cell.
            </p>
          </div>
          <button
            onClick={loadUpdates}
            className="self-start sm:self-auto flex items-center bg-emerald-50 hover:bg-emerald-100 dark:bg-black border-2 border-emerald-300 dark:border-palegreen text-emerald-800 dark:text-palegreen text-xs font-black px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-sm"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Refresh
          </button>
        </div>

        {/* Filter bar: Search & Category Filter */}
        <div className="pt-2 space-y-2 border-t-2 border-gray-100 dark:border-palegreen/30">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-blue-600 dark:text-blue-300" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search guidelines and notes..."
              className="w-full pl-9 pr-8 py-2 text-xs font-medium bg-white dark:bg-black border-2 border-gray-300 dark:border-palegreen/60 rounded-xl text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-blue-600 dark:focus:border-palegreen"
            />
            {searchFilter && (
              <button
                type="button"
                onClick={() => setSearchFilter('')}
                className="absolute right-3 top-2 text-xs font-bold text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white cursor-pointer"
              >
                ×
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {['ALL', 'Placement Idea', 'Academic Note', 'General Note'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                  categoryFilter === cat
                    ? 'bg-emerald-600 text-white shadow-sm dark:bg-palegreen dark:text-black'
                    : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200 dark:bg-black dark:text-blue-300 dark:border dark:border-palegreen/40 hover:dark:bg-palegreen/10'
                }`}
              >
                {cat === 'ALL' ? 'All Updates' : cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filteredUpdates.length === 0 ? (
        <div className="bg-white dark:bg-black p-10 rounded-2xl border-2 border-dashed border-gray-200 dark:border-palegreen text-center space-y-2">
          <BookOpen className="h-10 w-10 text-blue-600 dark:text-palegreen mx-auto" />
          <h3 className="font-black text-sm text-black dark:text-white">No updates found</h3>
          <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
            {updates.length === 0 ? "Check back later for notes and guidelines from the admin." : "No updates match your selected filter criteria."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredUpdates.map((up) => {
            const formattedDate = up.created_at ? new Date(up.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            }) : '';
            
            return (
              <div 
                key={up._id}
                className="bg-white dark:bg-black p-6 rounded-2xl border-2 border-gray-200 dark:border-palegreen shadow-sm dark:shadow-[0_0_15px_rgba(159,188,173,0.12)] space-y-4 hover:border-blue-500 dark:hover:border-palegreen transition-all"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-gray-100 dark:border-palegreen/30 pb-3">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                    up.category === 'Placement Idea' 
                      ? 'bg-amber-50 text-amber-900 border-amber-300 dark:bg-black dark:text-palegreen dark:border-palegreen' 
                      : up.category === 'Academic Note' 
                      ? 'bg-blue-50 text-blue-900 border-blue-300 dark:bg-black dark:text-blue-300 dark:border-palegreen' 
                      : 'bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-black dark:text-palegreen dark:border-palegreen'
                  }`}>
                    {up.category}
                  </span>
                  
                  <div className="flex items-center space-x-2 text-xs font-bold text-blue-700 dark:text-blue-300">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{formattedDate}</span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <h3 className="text-base font-black text-black dark:text-white leading-snug">
                    {up.title}
                  </h3>
                  {/* High contrast text: Pure Black on bright mode, Pure White on dark mode */}
                  <p className="text-sm font-medium text-black dark:text-white whitespace-pre-line leading-relaxed bg-gray-50/70 dark:bg-black/60 p-4 rounded-xl border border-gray-200 dark:border-palegreen/30">
                    {up.content}
                  </p>
                  
                  {up.attachments && up.attachments.length > 0 && (
                    <div className="pt-3 border-t border-gray-100 dark:border-palegreen/30 mt-3 space-y-1.5">
                      <p className="text-[10px] font-black text-blue-900 dark:text-blue-300 uppercase tracking-wider">
                        Reference Attachments ({up.attachments.length}):
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {up.attachments.map((file, fIdx) => (
                          <a
                            key={fIdx}
                            href={file.file_data}
                            download={file.filename}
                            className="inline-flex items-center text-xs font-bold text-blue-700 hover:text-blue-900 dark:text-blue-300 hover:underline bg-blue-50 dark:bg-black border border-blue-300 dark:border-palegreen px-3 py-1.5 rounded-xl transition-all"
                          >
                            <span className="mr-1">📎</span>
                            {file.filename}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
