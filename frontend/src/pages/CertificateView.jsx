import React, { useState, useEffect } from 'react';
import { learningService } from '../services/api';
import { Award, Printer, ArrowLeft, Lock, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function CertificateView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadEligibility();
  }, []);

  const loadEligibility = async () => {
    setLoading(true);
    try {
      const res = await learningService.getCertificate();
      setData(res);
    } catch (err) {
      console.error("Failed to load certificate eligibility", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <RefreshCw className="h-8 w-8 text-primary-600 animate-spin" />
        <span className="ml-3 text-sm text-gray-500 dark:text-gray-400">Verifying completion requirements...</span>
      </div>
    );
  }

  // Not eligible
  if (!data?.eligible) {
    return (
      <div className="max-w-xl mx-auto py-8 text-center space-y-6">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl border dark:border-gray-700 shadow-sm space-y-4">
          <div className="bg-amber-50 dark:bg-amber-950/20 p-3 rounded-full text-amber-600 dark:text-amber-400 inline-block">
            <Lock className="h-12 w-12" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-white">Certificate Locked</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            You must clear **all syllabus topics** under all active academic subjects with at least **60% passing score** on each quiz to unlock this certificate.
          </p>

          <div className="space-y-3 mt-6 border-t dark:border-gray-700 pt-4 text-left">
            <h4 className="font-bold text-xs text-gray-700 dark:text-gray-300">Your Current Progress Status:</h4>
            {data?.subjects_status?.map((sub, idx) => (
              <div key={idx} className="flex justify-between items-center text-xs">
                <span className="text-gray-600 dark:text-gray-400">{sub.subject_name}</span>
                <span className={`font-bold px-2 py-0.5 rounded ${
                  sub.status === 'completed' 
                    ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400' 
                    : 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400'
                }`}>
                  {sub.completed_topics} / {sub.total_topics} Topics Passed
                </span>
              </div>
            ))}
          </div>

          <button 
            onClick={() => navigate('/learning')}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs py-3 rounded-xl transition-colors mt-6 shadow-sm"
          >
            Go to Academic Classes
          </button>
        </div>
      </div>
    );
  }

  // Eligible
  return (
    <div className="max-w-5xl mx-auto py-4 space-y-6">
      {/* Top Bar (Hidden during printing) */}
      <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-xl border dark:border-gray-700 shadow-sm print:hidden">
        <button 
          onClick={() => navigate('/dashboard')} 
          className="flex items-center text-xs font-bold text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
        </button>
        <button 
          onClick={handlePrint}
          className="bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center transition-colors shadow-sm"
        >
          <Printer className="h-4 w-4 mr-1.5" /> Print / Save PDF
        </button>
      </div>

      {/* Printable Certificate wrapper */}
      <div className="print-container w-full overflow-x-auto bg-gray-950/5 p-4 rounded-2xl">
        <div 
          id="certificate-print"
          className="mx-auto w-[1000px] h-[707px] bg-[#fbfbfa] border-[16px] border-[#0c1b33] p-10 flex flex-col justify-between relative shadow-2xl overflow-hidden font-serif text-[#0c1b33]"
          style={{ boxSizing: 'border-box' }}
        >
          {/* Double Gold border inner line */}
          <div className="absolute inset-2 border-2 border-[#bfa15f] pointer-events-none"></div>
          {/* Corner gold brackets */}
          <div className="absolute top-4 left-4 w-6 h-6 border-t-4 border-l-4 border-[#bfa15f] pointer-events-none"></div>
          <div className="absolute top-4 right-4 w-6 h-6 border-t-4 border-r-4 border-[#bfa15f] pointer-events-none"></div>
          <div className="absolute bottom-4 left-4 w-6 h-6 border-b-4 border-l-4 border-[#bfa15f] pointer-events-none"></div>
          <div className="absolute bottom-4 right-4 w-6 h-6 border-b-4 border-r-4 border-[#bfa15f] pointer-events-none"></div>

          {/* Header Row */}
          <div className="flex justify-between items-start z-10">
            <div className="text-left font-sans">
              <h4 className="text-[10px] tracking-[0.2em] font-extrabold uppercase opacity-80">National Technical Assessment Board</h4>
              <h3 className="text-xs tracking-[0.1em] font-black uppercase text-[#0d2a4a] mt-0.5">Engineering Placement Directorate</h3>
            </div>
            <div className="border border-[#bfa15f] px-3 py-1 font-sans text-[8px] font-bold tracking-[0.1em] text-[#bfa15f] uppercase bg-white">
              ★ Certified by AI-Career-Coach
            </div>
          </div>

          {/* Certificate Title */}
          <div className="text-center space-y-1.5 z-10">
            <h1 className="text-3xl font-black tracking-[0.15em] text-[#0c1b33] uppercase">
              Certificate of Interview Readiness
            </h1>
            <p className="italic text-xs text-gray-500 font-sans">
              This credential is honorably conferred upon
            </p>
          </div>

          {/* Candidate Name */}
          <div className="text-center z-10">
            <div className="text-2xl font-extrabold tracking-wide border-b-2 border-[#bfa15f] inline-block px-10 pb-1.5">
              Candidate Name / {data.username}
            </div>
          </div>

          {/* Core Text */}
          <div className="text-center font-sans text-[10px] text-gray-600 max-w-[700px] mx-auto leading-relaxed z-10">
            for demonstrating comprehensive technical expertise, algorithmic proficiency, and analytical rigor across core software engineering and corporate recruitment assessment competencies.
          </div>

          {/* Subjects Grid (Replicating exact layout of demo certificate) */}
          <div className="grid grid-cols-4 gap-x-4 gap-y-2.5 font-sans z-10">
            {/* Subject 1 */}
            <div className="bg-[#f2f2f0] border-l-4 border-[#0c1b33] p-2 text-left">
              <h5 className="font-extrabold text-[9px] text-gray-800 leading-tight">Python Programming</h5>
              <p className="text-[7px] text-gray-400 mt-0.5">OOP, Functional Design, Modules & Scripts</p>
            </div>
            {/* Subject 2 */}
            <div className="bg-[#f2f2f0] border-l-4 border-[#0c1b33] p-2 text-left">
              <h5 className="font-extrabold text-[9px] text-gray-800 leading-tight">Data Structures & Algos</h5>
              <p className="text-[7px] text-gray-400 mt-0.5">Trees, Graphs, DP, Sorting & Complexities</p>
            </div>
            {/* Subject 3 */}
            <div className="bg-[#f2f2f0] border-l-4 border-[#0c1b33] p-2 text-left">
              <h5 className="font-extrabold text-[9px] text-gray-800 leading-tight">Core Java</h5>
              <p className="text-[7px] text-gray-400 mt-0.5">JVM, Collections, Concurrency & Streams</p>
            </div>
            {/* Subject 4 */}
            <div className="bg-[#f2f2f0] border-l-4 border-[#0c1b33] p-2 text-left">
              <h5 className="font-extrabold text-[9px] text-gray-800 leading-tight">Operating Systems (OS)</h5>
              <p className="text-[7px] text-gray-400 mt-0.5">Process Scheduling, Memory & Threading</p>
            </div>
            {/* Subject 5 */}
            <div className="bg-[#f2f2f0] border-l-4 border-[#0c1b33] p-2 text-left">
              <h5 className="font-extrabold text-[9px] text-gray-800 leading-tight">Computer Networks (CN)</h5>
              <p className="text-[7px] text-gray-400 mt-0.5">OSI / TCP-IP Models, Routing & Protocols</p>
            </div>
            {/* Subject 6 */}
            <div className="bg-[#f2f2f0] border-l-4 border-[#0c1b33] p-2 text-left">
              <h5 className="font-extrabold text-[9px] text-gray-800 leading-tight">SQL & Databases</h5>
              <p className="text-[7px] text-gray-400 mt-0.5">Complex Joins, Indexing & Normalization</p>
            </div>
            {/* Subject 7 */}
            <div className="bg-[#f2f2f0] border-l-4 border-[#0c1b33] p-2 text-left">
              <h5 className="font-extrabold text-[9px] text-gray-800 leading-tight">Logical Reasoning</h5>
              <p className="text-[7px] text-gray-400 mt-0.5">Analytical Puzzles & Deductive Logic</p>
            </div>
            {/* Subject 8 */}
            <div className="bg-[#f2f2f0] border-l-4 border-[#0c1b33] p-2 text-left">
              <h5 className="font-extrabold text-[9px] text-gray-800 leading-tight">Quantitative Aptitude</h5>
              <p className="text-[7px] text-gray-400 mt-0.5">Speed Math, Arithmetic & Data Analysis</p>
            </div>
          </div>

          {/* Footer signatures & Stamp */}
          <div className="flex justify-between items-end border-t border-gray-200 pt-3 z-10">
            {/* Left Evaluator */}
            <div className="text-center font-sans w-64">
              <div className="border-b border-[#0c1b33] pb-1 font-semibold text-[10px]">
                Dr. R. K. Mukherjee
              </div>
              <div className="text-[8px] text-gray-400 mt-1 uppercase tracking-wider font-bold">
                Head of Technical Evaluation
              </div>
            </div>

            {/* Verification Stamp */}
            <div className="flex flex-col items-center justify-center relative">
              <div className="h-16 w-16 border-2 border-dashed border-[#bfa15f] rounded-full flex flex-col items-center justify-center bg-white p-1 text-[#bfa15f] font-sans">
                <div className="h-full w-full border border-solid border-[#bfa15f] rounded-full flex flex-col items-center justify-center text-center">
                  <span className="text-[6px] tracking-wider uppercase font-black">Authentic</span>
                  <span className="text-[8px] font-bold">★</span>
                  <span className="text-[6px] tracking-wider uppercase font-black">Verified</span>
                </div>
              </div>
            </div>

            {/* Right Director */}
            <div className="text-center font-sans w-64">
              <div className="border-b border-[#0c1b33] pb-1 font-semibold text-[10px]">
                Prof. V. Raman
              </div>
              <div className="text-[8px] text-gray-400 mt-1 uppercase tracking-wider font-bold">
                Director of Training & Placements
              </div>
            </div>
          </div>

          {/* Bottom small print ID */}
          <div className="text-center text-[7px] font-sans text-gray-400 tracking-widest uppercase z-10">
            Credential ID: {data.credential_id} | Issue Date: {data.issue_date} | Verified Interview-Ready
          </div>
        </div>
      </div>

      {/* CSS @media print styling overrides */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
            background: none !important;
          }
          .print-container, #certificate-print, #certificate-print * {
            visibility: visible;
          }
          .print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            background: none !important;
          }
          #certificate-print {
            border: 16px solid #0c1b33 !important;
            box-shadow: none !important;
            margin: 0 auto !important;
            top: 50% !important;
            transform: translateY(-50%) !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
