import React from 'react';
import { BookOpen, Code, FileText, MessageSquare, Award, Sparkles, Check, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Tutorial() {
  return (
    <div className="max-w-4xl mx-auto py-4 space-y-8">
      {/* Intro Banner */}
      <div className="bg-gradient-to-r from-primary-600 to-indigo-700 text-white rounded-2xl p-6 shadow-md text-center space-y-2">
        <h1 className="text-2xl md:text-3xl font-extrabold">Welcome to your Portal Guide!</h1>
        <p className="text-xs text-primary-100 max-w-xl mx-auto">
          Learn how to navigate the platform, leverage our artificial intelligence modules, and complete tests to earn your certificate.
        </p>
      </div>

      {/* Feature breakdown */}
      <div className="space-y-6">
        <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center">
          <HelpCircle className="h-5 w-5 mr-2 text-primary-500" />
          Interactive Platform Quick Walkthrough
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1 */}
          <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border dark:border-gray-700 shadow-sm space-y-3">
            <div className="flex items-center space-x-3 text-primary-600 dark:text-primary-400">
              <span className="p-2 bg-primary-50 dark:bg-primary-950/20 rounded-xl">
                <BookOpen className="h-5 w-5" />
              </span>
              <h3 className="font-extrabold text-sm text-gray-800 dark:text-white">Academic Subjects</h3>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Explore subject syllabi for core CS and Quantitative Aptitude. Solve topic-wise 30 MCQ test banks. Passing any test with a score of 60% or higher marks the topic as completed.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border dark:border-gray-700 shadow-sm space-y-3">
            <div className="flex items-center space-x-3 text-emerald-600 dark:text-emerald-400">
              <span className="p-2 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl">
                <Code className="h-5 w-5" />
              </span>
              <h3 className="font-extrabold text-sm text-gray-800 dark:text-white">Coding Practice</h3>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Over 200 coding questions ranging from Easy to Hard. Support for Python, Java, DSA, C++, and C. The questions automatically rotate and display the next unsolved item once you successfully compile and pass the test cases.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border dark:border-gray-700 shadow-sm space-y-3">
            <div className="flex items-center space-x-3 text-red-600 dark:text-red-400">
              <span className="p-2 bg-red-50 dark:bg-red-950/20 rounded-xl">
                <FileText className="h-5 w-5" />
              </span>
              <h3 className="font-extrabold text-sm text-gray-800 dark:text-white">Resume Analyzer</h3>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Upload your PDF/Word/Image resume. The AI will extract your skills, compute an ATS score against your target role, list strengths, and pinpoint syllabus priority gaps.
            </p>
          </div>

          {/* Card 4 */}
          <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border dark:border-gray-700 shadow-sm space-y-3">
            <div className="flex items-center space-x-3 text-indigo-600 dark:text-indigo-400">
              <span className="p-2 bg-indigo-50 dark:bg-indigo-950/20 rounded-xl">
                <MessageSquare className="h-5 w-5" />
              </span>
              <h3 className="font-extrabold text-sm text-gray-800 dark:text-white">Mock Interviews</h3>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Participate in dynamic, AI-conferred placement interviews. The interviewer asks tailored questions based on your profile or targets. You receive comprehensive feedback and grades.
            </p>
          </div>
        </div>
      </div>

      {/* Subscription Benefits */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-2xl p-6 shadow-md space-y-4">
        <div className="flex items-center space-x-2 border-b border-white/20 pb-3">
          <Sparkles className="h-5 w-5 text-amber-200" />
          <h2 className="text-lg font-bold">Premium Subscription Benefits</h2>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-start space-x-2">
            <Check className="h-5 w-5 text-amber-200 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm">Full Classroom Unlock</h4>
              <p className="text-xs text-amber-100">Full access to study syllabus modules and MCQs.</p>
            </div>
          </div>

          <div className="flex items-start space-x-2">
            <Check className="h-5 w-5 text-amber-200 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm">Unlimited Coding Sandbox</h4>
              <p className="text-xs text-amber-100">Submit and run solutions on C, C++, Java, Python infinitely.</p>
            </div>
          </div>

          <div className="flex items-start space-x-2">
            <Check className="h-5 w-5 text-amber-200 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm">Unlimited ATS Scanning</h4>
              <p className="text-xs text-amber-100">Analyze your resume for different job titles or coordinates.</p>
            </div>
          </div>

          <div className="flex items-start space-x-2">
            <Check className="h-5 w-5 text-amber-200 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm">Unlimited Mock AI Prep</h4>
              <p className="text-xs text-amber-100">Take as many mock interviews as needed to master placement.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Verification details for certificate */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border dark:border-gray-700 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 border-b dark:border-gray-700 pb-3">
          <Award className="h-5 w-5 text-primary-500" />
          <h2 className="text-base font-bold text-gray-800 dark:text-white">Earning Your Placement Certificate</h2>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          The Engineering Placement Directorate (National Technical Assessment Board) issues a digital **Certificate of Interview Readiness** for students who successfully clear all active academic courses.
        </p>
        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400 space-y-2">
          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 bg-primary-500 rounded-full"></span>
            <span>You must finish **100% of the syllabus topics** under all active subjects.</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 bg-primary-500 rounded-full"></span>
            <span>You must score **60% or higher** in the 30 MCQ test on each syllabus topic.</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 bg-primary-500 rounded-full"></span>
            <span>Your certificate is custom-generated automatically, featuring your name and a verifiable credential ID.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
