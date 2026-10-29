import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, FileText, CheckCircle, Compass, Code, GraduationCap } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="bg-gradient-to-b from-primary-50 to-white min-h-screen flex flex-col justify-between">
      {/* Navbar */}
      <nav className="max-w-7xl mx-auto w-full px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-3xl">🛋️</span>
          <span className="font-extrabold text-2xl tracking-tight text-gray-800">AI Career Coach</span>
        </div>
        <div className="flex items-center space-x-4">
          <Link to="/login" className="text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors">
            Sign In
          </Link>
          <Link to="/register" className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors">
            Start Free
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto w-full px-6 py-16 text-center flex-grow flex flex-col justify-center items-center">
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-primary-100 text-primary-800 mb-6 animate-pulse">
          <Sparkles className="h-3 w-3 mr-1" /> Powered by IBM Granite LLM
        </span>
        
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-gray-900 max-w-4xl leading-tight">
          Your Unified AI-Powered <span className="text-primary-600">Career Coach & Placement Platform</span>
        </h1>
        
        <p className="mt-6 text-lg text-gray-600 max-w-2xl leading-relaxed">
          Upload your resume, build a structured gap profile, access standard academic/placement practice tests, solve python compiler tasks, and master mock AI interviews in one location.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
          <Link to="/register" className="bg-primary-600 hover:bg-primary-700 text-white font-extrabold px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all text-center">
            Analyze Resume & Start Now
          </Link>
          <Link to="/login" className="bg-white hover:bg-gray-50 text-gray-700 font-semibold px-8 py-4 rounded-xl border border-gray-300 transition-all text-center">
            Sign In to Dashboard
          </Link>
        </div>

        {/* Features grid */}
        <section className="mt-24 grid md:grid-cols-3 gap-8 w-full max-w-6xl">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-left">
            <div className="bg-blue-50 text-blue-600 p-3 rounded-xl inline-block mb-4">
              <FileText className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-lg text-gray-800">1. Resume ATS Analysis</h3>
            <p className="text-gray-500 mt-2 text-sm leading-relaxed">
              Extract structured profile info via OCR. Receive detailed ATS score cards, keyword match insights, and bullet optimization tips.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-left">
            <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl inline-block mb-4">
              <Compass className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-lg text-gray-800">2. Career Roadmaps</h3>
            <p className="text-gray-500 mt-2 text-sm leading-relaxed">
              Generate visual vertical timelines outlining milestones, study tasks, recommended books, video playlists, and quizzes.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-left">
            <div className="bg-indigo-50 text-indigo-600 p-3 rounded-xl inline-block mb-4">
              <GraduationCap className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-lg text-gray-800">3. Academic Subjects</h3>
            <p className="text-gray-500 mt-2 text-sm leading-relaxed">
              Practice Core CS subjects (OS, DBMS, DSA) and Aptitude preparation with 30 MCQ test modules, grading, and weakness logging.
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-left">
            <div className="bg-amber-50 text-amber-600 p-3 rounded-xl inline-block mb-4">
              <Code className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-lg text-gray-800">4. Subprocess Code Compiler</h3>
            <p className="text-gray-500 mt-2 text-sm leading-relaxed">
              Compile Python solutions in our sandbox environment. Non-subscribers receive 3 daily runs; subscribe to unlock unlimited compiler checks.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-left">
            <div className="bg-orange-50 text-orange-600 p-3 rounded-xl inline-block mb-4">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-lg text-gray-800">5. Mock AI Interviews</h3>
            <p className="text-gray-500 mt-2 text-sm leading-relaxed">
              Answer tailored behavioral or technical questions (general or topic-specific). Receive scoring feedback and perfect model answers.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-left">
            <div className="bg-purple-50 text-purple-600 p-3 rounded-xl inline-block mb-4">
              <CheckCircle className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-lg text-gray-800">6. AI Recommendations</h3>
            <p className="text-gray-500 mt-2 text-sm leading-relaxed">
              A centralized engine maps your exam failures, resume skills, and interview mistakes to guide your daily priority tasks.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-6 text-center text-sm text-gray-500">
        <p>&copy; {new Date().getFullYear()} AI Career Coach. Built for student placement readiness.</p>
      </footer>
    </div>
  );
}
