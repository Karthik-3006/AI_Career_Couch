import React, { useState, useEffect, useMemo } from 'react';
import { adminService, subscriptionService, updatesService, learningService } from '../services/api';
import { 
  Lock, Sparkles, PlusCircle, CreditCard, BookOpen, FileText, 
  Trash2, CheckCircle, RefreshCw, Search, Filter, Calendar, 
  Tag, Paperclip, Check, ChevronRight
} from 'lucide-react';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('subscriptions');

  // Subscriptions Tab states
  const [email, setEmail] = useState('');
  const [months, setMonths] = useState(1);
  const [upiId, setUpiId] = useState('');
  const [qrCode, setQrCode] = useState(null); // base64 representation
  const [plans, setPlans] = useState([]);
  const [newPlanPrice, setNewPlanPrice] = useState('');

  // Academics Tab states
  const [subjects, setSubjects] = useState([]);
  const [selectedSubjId, setSelectedSubjId] = useState('');
  const [newSubjName, setNewSubjName] = useState('');
  const [newSubjCategory, setNewSubjCategory] = useState('Core CS');
  const [newSubjDesc, setNewSubjDesc] = useState('');
  const [newTopicName, setNewTopicName] = useState('');
  const [newTopicDesc, setNewTopicDesc] = useState('');

  // Updates Tab states
  const [updates, setUpdates] = useState([]);
  const [newUpdateTitle, setNewUpdateTitle] = useState('');
  const [newUpdateContent, setNewUpdateContent] = useState('');
  const [newUpdateCategory, setNewUpdateCategory] = useState('General Note');
  const [updateAttachments, setUpdateAttachments] = useState([]);

  // Filter & Search states for the Updates Feed / Blogs
  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Payments Verification Tab states
  const [payments, setPayments] = useState([]);

  // Common UI states
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadSubscriptionData();
    loadAcademicsData();
    loadUpdatesData();
    loadPaymentsData();
  }, []);

  const loadSubscriptionData = async () => {
    try {
      const data = await subscriptionService.getSettings();
      setPlans(data.plans || []);
      setUpiId(data.upi_id || '');
      setQrCode(data.qr_code || null);
      if (data.plans?.length > 0) {
        setNewPlanPrice(data.plans[0].price);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadPaymentsData = async () => {
    try {
      const data = await adminService.getPaymentsList();
      setPayments(data || []);
    } catch (err) {
      console.error("Failed to load payments requests", err);
    }
  };

  const loadAcademicsData = async () => {
    try {
      const data = await learningService.getSubjects();
      setSubjects(data);
      if (data.length > 0) {
        setSelectedSubjId(data[0]._id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadUpdatesData = async () => {
    try {
      const data = await updatesService.getUpdates();
      setUpdates(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Filtered updates feed (Blogs filter)
  const filteredUpdates = useMemo(() => {
    return updates.filter((up) => {
      const matchesCategory = categoryFilter === 'ALL' || up.category === categoryFilter;
      const matchesSearch = !searchFilter.trim() || 
        (up.title && up.title.toLowerCase().includes(searchFilter.toLowerCase())) ||
        (up.content && up.content.toLowerCase().includes(searchFilter.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [updates, categoryFilter, searchFilter]);

  // 1. Grant subscription manually
  const handleGrant = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      await adminService.grantSubscription(email, months);
      setMessage(`Successfully granted ${months} months subscription to user ${email}.`);
      setEmail('');
    } catch (err) {
      setMessage("Error: " + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleQrUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setQrCode(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // 2. Update Payment settings (UPI and/or QR code image base64)
  const handleUpdatePaymentSettings = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      await subscriptionService.updatePaymentSettings({ upi_id: upiId, qr_code: qrCode });
      setMessage("Successfully updated Payment Gateway settings.");
      loadSubscriptionData();
    } catch (err) {
      setMessage("Error updating payment settings: " + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  // 3. Save lifetime subscription plan price
  const handleSaveLifetimePrice = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      await subscriptionService.createPlan({
        name: "Lifetime Unlimited Premium Access",
        price: parseFloat(newPlanPrice),
        duration_months: 999
      });
      setMessage(`Successfully updated Lifetime plan price to: ₹${newPlanPrice}`);
      loadSubscriptionData();
    } catch (err) {
      setMessage("Error saving lifetime price: " + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  // 4. Create Academic Subject
  const handleCreateSubject = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      await adminService.createSubject({
        name: newSubjName,
        category: newSubjCategory,
        description: newSubjDesc
      });
      setMessage(`Successfully added academic subject: ${newSubjName}`);
      setNewSubjName('');
      setNewSubjDesc('');
      loadAcademicsData();
    } catch (err) {
      setMessage("Error creating subject: " + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  // 5. Add Topic to Subject
  const handleAddTopic = async (e) => {
    e.preventDefault();
    if (!selectedSubjId) {
      alert("Please select a subject first.");
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      await adminService.addTopic(selectedSubjId, {
        name: newTopicName,
        description: newTopicDesc,
        order: 0
      });
      setMessage(`Successfully added topic '${newTopicName}' (Auto-seeded 30 MCQs tests).`);
      setNewTopicName('');
      setNewTopicDesc('');
    } catch (err) {
      setMessage("Error adding topic: " + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  // 6. Publish Announcement Update / Blog
  const handlePublishUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      await updatesService.publishUpdate({
        title: newUpdateTitle,
        content: newUpdateContent,
        category: newUpdateCategory,
        attachments: updateAttachments
      });
      setMessage(`Successfully published note: ${newUpdateTitle}`);
      setNewUpdateTitle('');
      setNewUpdateContent('');
      setUpdateAttachments([]);
      loadUpdatesData();
    } catch (err) {
      setMessage("Error publishing update: " + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAttachmentsChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUpdateAttachments(prev => [
          ...prev,
          {
            filename: file.name,
            file_data: reader.result,
            file_type: file.type
          }
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeUpdateAttachment = (index) => {
    setUpdateAttachments(prev => prev.filter((_, idx) => idx !== index));
  };

  // 7. Delete Announcement Update
  const handleDeleteUpdate = async (id) => {
    if (!window.confirm("Are you sure you want to delete this update note?")) return;
    setLoading(true);
    try {
      await updatesService.deleteUpdate(id);
      setMessage("Announcement note deleted.");
      loadUpdatesData();
    } catch (err) {
      alert("Error deleting update: " + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleApprovePayment = async (paymentId) => {
    if (!window.confirm("Are you sure you want to APPROVE this payment and grant premium access?")) return;
    setLoading(true);
    setMessage('');
    try {
      const res = await adminService.approvePayment(paymentId);
      setMessage(res.message);
      loadPaymentsData();
    } catch (err) {
      setMessage("Error: " + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleRejectPayment = async (paymentId) => {
    if (!window.confirm("Are you sure you want to REJECT this payment?")) return;
    setLoading(true);
    setMessage('');
    try {
      const res = await adminService.rejectPayment(paymentId);
      setMessage(res.message);
      loadPaymentsData();
    } catch (err) {
      setMessage("Error: " + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-4 space-y-6">
      {/* Admin Portal Header Card */}
      <div className="bg-white dark:bg-black p-6 rounded-2xl border-2 border-gray-200 dark:border-palegreen shadow-sm dark:shadow-[0_0_20px_rgba(159,188,173,0.15)] transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-gray-100 dark:border-palegreen/30 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-palegreen/20 border border-emerald-200 dark:border-palegreen">
              <Lock className="h-6 w-6 text-emerald-600 dark:text-palegreen" />
            </div>
            <div>
              <h2 className="text-xl font-black text-black dark:text-white tracking-tight">
                Admin Platform Control Portal
              </h2>
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-300">
                Manage subscriptions, syllabus modules, payments & training updates
              </p>
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-gray-50 dark:bg-black p-1.5 rounded-xl border border-gray-200 dark:border-palegreen/40 mt-5">
          <button
            type="button"
            onClick={() => { setActiveTab('subscriptions'); setMessage(''); }}
            className={`px-4 py-2.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
              activeTab === 'subscriptions'
                ? 'bg-emerald-600 text-white shadow-md dark:bg-palegreen dark:text-black dark:shadow-[0_0_12px_rgba(159,188,173,0.35)]'
                : 'text-black hover:text-blue-700 hover:bg-gray-100 dark:text-white dark:hover:text-blue-300 dark:hover:bg-palegreen/10'
            }`}
          >
            Subscriptions & Gateway
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('academics'); setMessage(''); }}
            className={`px-4 py-2.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
              activeTab === 'academics'
                ? 'bg-emerald-600 text-white shadow-md dark:bg-palegreen dark:text-black dark:shadow-[0_0_12px_rgba(159,188,173,0.35)]'
                : 'text-black hover:text-blue-700 hover:bg-gray-100 dark:text-white dark:hover:text-blue-300 dark:hover:bg-palegreen/10'
            }`}
          >
            Academic Syllabus
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('updates'); setMessage(''); }}
            className={`px-4 py-2.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
              activeTab === 'updates'
                ? 'bg-emerald-600 text-white shadow-md dark:bg-palegreen dark:text-black dark:shadow-[0_0_12px_rgba(159,188,173,0.35)]'
                : 'text-black hover:text-blue-700 hover:bg-gray-100 dark:text-white dark:hover:text-blue-300 dark:hover:bg-palegreen/10'
            }`}
          >
            Updates & Blogs Feed
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('payments'); setMessage(''); }}
            className={`px-4 py-2.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
              activeTab === 'payments'
                ? 'bg-emerald-600 text-white shadow-md dark:bg-palegreen dark:text-black dark:shadow-[0_0_12px_rgba(159,188,173,0.35)]'
                : 'text-black hover:text-blue-700 hover:bg-gray-100 dark:text-white dark:hover:text-blue-300 dark:hover:bg-palegreen/10'
            }`}
          >
            Verify Payments
          </button>
        </div>

        {/* Messaging Area */}
        {message && (
          <div className="mt-4 bg-emerald-50 dark:bg-black text-xs font-bold text-black dark:text-white p-3.5 rounded-xl border-2 border-emerald-400 dark:border-palegreen flex items-center shadow-sm">
            <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-palegreen mr-2 flex-shrink-0" />
            <span>{message}</span>
          </div>
        )}
      </div>

      {/* ── TAB A: SUBSCRIPTIONS & PAYMENT GATEWAY ── */}
      {activeTab === 'subscriptions' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Sub A1: UPI Setup & Grant Subscriptions */}
          <div className="bg-white dark:bg-black p-6 rounded-2xl border-2 border-gray-200 dark:border-palegreen shadow-sm dark:shadow-[0_0_15px_rgba(159,188,173,0.1)] space-y-6">
            <form onSubmit={handleUpdatePaymentSettings} className="space-y-4">
              <h3 className="font-black text-sm text-black dark:text-white flex items-center">
                <CreditCard className="h-4.5 w-4.5 text-blue-600 dark:text-palegreen mr-2 flex-shrink-0" />
                Configure Admin Payment Gateway
              </h3>
              
              <div>
                <label className="block text-xs font-black text-blue-900 dark:text-palegreen uppercase tracking-wider mb-1">
                  Administrator UPI ID (Optional)
                </label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="admin@upi"
                  className="block w-full border-2 border-gray-300 dark:border-palegreen/60 bg-white dark:bg-black text-black dark:text-white font-medium px-3.5 py-2.5 rounded-xl text-xs focus:border-blue-600 dark:focus:border-palegreen focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-blue-900 dark:text-palegreen uppercase tracking-wider mb-1">
                  Upload Payment QR Code Image (Optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleQrUpload}
                  className="block w-full text-xs text-black dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-emerald-50 file:text-emerald-800 dark:file:bg-palegreen/20 dark:file:text-palegreen hover:file:bg-emerald-100 cursor-pointer"
                />
                {qrCode && (
                  <div className="mt-3 p-3 border-2 border-gray-200 dark:border-palegreen rounded-xl inline-block bg-white dark:bg-black">
                    <img src={qrCode} alt="Uploaded QR Code Preview" className="h-28 w-28 object-contain" />
                    <button
                      type="button"
                      onClick={() => setQrCode(null)}
                      className="block text-[11px] text-rose-600 dark:text-rose-400 font-bold hover:underline mt-1 text-center w-full cursor-pointer"
                    >
                      Remove QR Code
                    </button>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 dark:bg-palegreen dark:hover:bg-[#8ea89b] text-white dark:text-black font-black text-xs py-3 rounded-xl transition-all shadow-md active:scale-[0.99] cursor-pointer disabled:opacity-50"
              >
                Update Payment Settings
              </button>
            </form>

            <form onSubmit={handleGrant} className="space-y-4 border-t-2 border-gray-100 dark:border-palegreen/30 pt-6">
              <h3 className="font-black text-sm text-black dark:text-white flex items-center">
                <Sparkles className="h-4.5 w-4.5 text-blue-600 dark:text-palegreen mr-2 flex-shrink-0" />
                Manual Premium Overrides
              </h3>
              <div>
                <label className="block text-xs font-black text-blue-900 dark:text-palegreen uppercase tracking-wider mb-1">
                  Student Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@college.edu"
                  className="block w-full border-2 border-gray-300 dark:border-palegreen/60 bg-white dark:bg-black text-black dark:text-white font-medium px-3.5 py-2.5 rounded-xl text-xs focus:border-blue-600 dark:focus:border-palegreen focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-blue-900 dark:text-palegreen uppercase tracking-wider mb-1">
                  Grant Period (Months)
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={months}
                  onChange={(e) => setMonths(parseInt(e.target.value))}
                  className="block w-full border-2 border-gray-300 dark:border-palegreen/60 bg-white dark:bg-black text-black dark:text-white font-medium px-3.5 py-2.5 rounded-xl text-xs focus:border-blue-600 dark:focus:border-palegreen focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 dark:bg-palegreen dark:hover:bg-[#8ea89b] text-white dark:text-black font-black text-xs py-3 rounded-xl transition-all shadow-md active:scale-[0.99] cursor-pointer disabled:opacity-50"
              >
                Grant Free Subscription
              </button>
            </form>
          </div>

          {/* Sub A2: Lifetime Access Plan Config */}
          <div className="bg-white dark:bg-black p-6 rounded-2xl border-2 border-gray-200 dark:border-palegreen shadow-sm dark:shadow-[0_0_15px_rgba(159,188,173,0.1)] space-y-6">
            <form onSubmit={handleSaveLifetimePrice} className="space-y-4">
              <h3 className="font-black text-sm text-black dark:text-white flex items-center">
                <PlusCircle className="h-4.5 w-4.5 text-blue-600 dark:text-palegreen mr-2 flex-shrink-0" />
                Configure Lifetime Access Plan
              </h3>
              
              <div className="bg-blue-50 dark:bg-black p-4 rounded-xl border-2 border-blue-200 dark:border-palegreen/60 text-xs text-black dark:text-white leading-relaxed">
                <strong className="text-blue-900 dark:text-palegreen">Platform Requirement:</strong> There is exactly one subscription plan for lifetime access. You can decide and update the price below.
              </div>

              <div>
                <label className="block text-xs font-black text-blue-900 dark:text-palegreen uppercase tracking-wider mb-1">
                  Lifetime Plan Price (INR)
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  required
                  value={newPlanPrice}
                  onChange={(e) => setNewPlanPrice(e.target.value)}
                  placeholder="2999"
                  className="block w-full border-2 border-gray-300 dark:border-palegreen/60 bg-white dark:bg-black text-black dark:text-white font-medium px-3.5 py-2.5 rounded-xl text-xs focus:border-blue-600 dark:focus:border-palegreen focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 dark:bg-palegreen dark:hover:bg-[#8ea89b] text-white dark:text-black font-black text-xs py-3 rounded-xl transition-all shadow-md active:scale-[0.99] cursor-pointer disabled:opacity-50"
              >
                Save Lifetime Plan Price
              </button>
            </form>

            <div className="space-y-3 border-t-2 border-gray-100 dark:border-palegreen/30 pt-6">
              <h4 className="font-black text-xs text-blue-900 dark:text-palegreen uppercase tracking-wider">
                Active Subscription Plan
              </h4>
              <div className="divide-y divide-gray-200 dark:divide-palegreen/40 border-2 border-gray-200 dark:border-palegreen rounded-xl bg-white dark:bg-black overflow-hidden text-xs">
                {plans.length === 0 ? (
                  <div className="p-4 text-center text-xs text-gray-500 dark:text-gray-400">
                    No active plans defined.
                  </div>
                ) : (
                  plans.map((p) => (
                    <div key={p._id} className="p-4 flex justify-between items-center">
                      <div>
                        <div className="font-black text-black dark:text-white">{p.name}</div>
                        <div className="text-xs font-bold text-blue-700 dark:text-palegreen mt-0.5">
                          Lifetime Membership • Unlimited Access
                        </div>
                      </div>
                      <div className="text-base font-black text-blue-600 dark:text-blue-300">
                        ₹{p.price}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB B: ACADEMIC SYLLABUS ── */}
      {activeTab === 'academics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Create Subject */}
          <div className="bg-white dark:bg-black p-6 rounded-2xl border-2 border-gray-200 dark:border-palegreen shadow-sm dark:shadow-[0_0_15px_rgba(159,188,173,0.1)] space-y-4">
            <h3 className="font-black text-sm text-black dark:text-white flex items-center">
              <BookOpen className="h-4.5 w-4.5 text-blue-600 dark:text-palegreen mr-2 flex-shrink-0" />
              Add Academic Subject
            </h3>
            <form onSubmit={handleCreateSubject} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-blue-900 dark:text-palegreen uppercase tracking-wider mb-1">
                  Subject Name
                </label>
                <input
                  type="text"
                  required
                  value={newSubjName}
                  onChange={(e) => setNewSubjName(e.target.value)}
                  placeholder="Computer Networks"
                  className="block w-full border-2 border-gray-300 dark:border-palegreen/60 bg-white dark:bg-black text-black dark:text-white font-medium px-3.5 py-2.5 rounded-xl text-xs focus:border-blue-600 dark:focus:border-palegreen focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-blue-900 dark:text-palegreen uppercase tracking-wider mb-1">
                  Category Group
                </label>
                <select
                  value={newSubjCategory}
                  onChange={(e) => setNewSubjCategory(e.target.value)}
                  className="block w-full border-2 border-gray-300 dark:border-palegreen/60 bg-white dark:bg-black text-black dark:text-white font-medium px-3.5 py-2.5 rounded-xl text-xs focus:border-blue-600 dark:focus:border-palegreen focus:outline-none"
                >
                  <option value="Core CS">Core CS</option>
                  <option value="Programming">Programming</option>
                  <option value="Placement">Placement Prep</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-blue-900 dark:text-palegreen uppercase tracking-wider mb-1">
                  Brief Syllabus Summary
                </label>
                <textarea
                  required
                  value={newSubjDesc}
                  onChange={(e) => setNewSubjDesc(e.target.value)}
                  placeholder="Relational logic, OSI models, routing algorithms..."
                  rows={3}
                  className="block w-full border-2 border-gray-300 dark:border-palegreen/60 bg-white dark:bg-black text-black dark:text-white font-medium px-3.5 py-2.5 rounded-xl text-xs focus:border-blue-600 dark:focus:border-palegreen focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 dark:bg-palegreen dark:hover:bg-[#8ea89b] text-white dark:text-black font-black text-xs py-3 rounded-xl transition-all shadow-md active:scale-[0.99] cursor-pointer disabled:opacity-50"
              >
                Create Subject Module
              </button>
            </form>
          </div>

          {/* Add Syllabus Topic */}
          <div className="bg-white dark:bg-black p-6 rounded-2xl border-2 border-gray-200 dark:border-palegreen shadow-sm dark:shadow-[0_0_15px_rgba(159,188,173,0.1)] space-y-4">
            <h3 className="font-black text-sm text-black dark:text-white flex items-center">
              <PlusCircle className="h-4.5 w-4.5 text-blue-600 dark:text-palegreen mr-2 flex-shrink-0" />
              Add Syllabus Topic & Quizzes
            </h3>
            <form onSubmit={handleAddTopic} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-blue-900 dark:text-palegreen uppercase tracking-wider mb-1">
                  Select Subject Link
                </label>
                <select
                  value={selectedSubjId}
                  onChange={(e) => setSelectedSubjId(e.target.value)}
                  className="block w-full border-2 border-gray-300 dark:border-palegreen/60 bg-white dark:bg-black text-black dark:text-white font-medium px-3.5 py-2.5 rounded-xl text-xs focus:border-blue-600 dark:focus:border-palegreen focus:outline-none"
                >
                  {subjects.map((s) => (
                    <option key={s._id} value={s._id}>{s.name} ({s.category})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-blue-900 dark:text-palegreen uppercase tracking-wider mb-1">
                  Topic Title
                </label>
                <input
                  type="text"
                  required
                  value={newTopicName}
                  onChange={(e) => setNewTopicName(e.target.value)}
                  placeholder="OSI Reference Model"
                  className="block w-full border-2 border-gray-300 dark:border-palegreen/60 bg-white dark:bg-black text-black dark:text-white font-medium px-3.5 py-2.5 rounded-xl text-xs focus:border-blue-600 dark:focus:border-palegreen focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-blue-900 dark:text-palegreen uppercase tracking-wider mb-1">
                  Topic Description
                </label>
                <textarea
                  required
                  value={newTopicDesc}
                  onChange={(e) => setNewTopicDesc(e.target.value)}
                  placeholder="Covering Layer 1 (Physical) through Layer 7 (Application)..."
                  rows={3}
                  className="block w-full border-2 border-gray-300 dark:border-palegreen/60 bg-white dark:bg-black text-black dark:text-white font-medium px-3.5 py-2.5 rounded-xl text-xs focus:border-blue-600 dark:focus:border-palegreen focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 dark:bg-palegreen dark:hover:bg-[#8ea89b] text-white dark:text-black font-black text-xs py-3 rounded-xl transition-all shadow-md active:scale-[0.99] cursor-pointer disabled:opacity-50"
              >
                Add Topic & Auto-Seed 30 MCQ Quizzes
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── TAB C: UPDATES CELL & BLOGS FEED ── */}
      {activeTab === 'updates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Publish Updates / Blog Form */}
          <div className="bg-white dark:bg-black p-6 rounded-2xl border-2 border-gray-200 dark:border-palegreen shadow-sm dark:shadow-[0_0_15px_rgba(159,188,173,0.1)] space-y-4">
            <h3 className="font-black text-sm text-black dark:text-white flex items-center">
              <FileText className="h-4.5 w-4.5 text-blue-600 dark:text-palegreen mr-2 flex-shrink-0" />
              Publish Training Update / Blog Post
            </h3>
            <form onSubmit={handlePublishUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-blue-900 dark:text-palegreen uppercase tracking-wider mb-1">
                  Title Heading
                </label>
                <input
                  type="text"
                  required
                  value={newUpdateTitle}
                  onChange={(e) => setNewUpdateTitle(e.target.value)}
                  placeholder="IBM Placement Test Guidelines & Tips"
                  className="block w-full border-2 border-gray-300 dark:border-palegreen/60 bg-white dark:bg-black text-black dark:text-white font-medium px-3.5 py-2.5 rounded-xl text-xs focus:border-blue-600 dark:focus:border-palegreen focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-blue-900 dark:text-palegreen uppercase tracking-wider mb-1">
                  Category Tag
                </label>
                <select
                  value={newUpdateCategory}
                  onChange={(e) => setNewUpdateCategory(e.target.value)}
                  className="block w-full border-2 border-gray-300 dark:border-palegreen/60 bg-white dark:bg-black text-black dark:text-white font-medium px-3.5 py-2.5 rounded-xl text-xs focus:border-blue-600 dark:focus:border-palegreen focus:outline-none"
                >
                  <option value="General Note">General Update</option>
                  <option value="Placement Idea">Placement Idea</option>
                  <option value="Academic Note">Academic Note</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-blue-900 dark:text-palegreen uppercase tracking-wider mb-1">
                  Content / Blog Description
                </label>
                <textarea
                  required
                  value={newUpdateContent}
                  onChange={(e) => setNewUpdateContent(e.target.value)}
                  placeholder="Detailed guidelines, preparation roadmap, or key interview notes..."
                  rows={5}
                  className="block w-full border-2 border-gray-300 dark:border-palegreen/60 bg-white dark:bg-black text-black dark:text-white font-medium px-3.5 py-2.5 rounded-xl text-xs focus:border-blue-600 dark:focus:border-palegreen focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-blue-900 dark:text-palegreen uppercase tracking-wider mb-1">
                  Attach Reference Files (PDF, Word, Images)
                </label>
                <input
                  type="file"
                  multiple
                  onChange={handleUpdateAttachmentsChange}
                  className="block w-full text-xs text-black dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-emerald-50 file:text-emerald-800 dark:file:bg-palegreen/20 dark:file:text-palegreen hover:file:bg-emerald-100 cursor-pointer"
                />
                {updateAttachments.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {updateAttachments.map((file, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs bg-gray-50 dark:bg-black border border-gray-300 dark:border-palegreen/40 px-3 py-1.5 rounded-lg">
                        <span className="truncate max-w-[200px] text-black dark:text-white font-bold">{file.filename}</span>
                        <button
                          type="button"
                          onClick={() => removeUpdateAttachment(idx)}
                          className="text-rose-600 hover:text-rose-800 font-bold text-xs cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 dark:bg-palegreen dark:hover:bg-[#8ea89b] text-white dark:text-black font-black text-xs py-3 rounded-xl transition-all shadow-md active:scale-[0.99] cursor-pointer disabled:opacity-50"
              >
                Publish Note to Students
              </button>
            </form>
          </div>

          {/* Active Updates Feed (The Blogs List with Filter) */}
          <div className="bg-white dark:bg-black p-6 rounded-2xl border-2 border-gray-200 dark:border-palegreen shadow-sm dark:shadow-[0_0_15px_rgba(159,188,173,0.1)] space-y-4">
            <div className="flex items-center justify-between gap-2 border-b-2 border-gray-100 dark:border-palegreen/30 pb-3">
              <h3 className="font-black text-sm text-black dark:text-white uppercase tracking-wider">
                Active Updates Feed ({filteredUpdates.length} of {updates.length})
              </h3>
            </div>

            {/* Black & Blue Text Filter Bar for Bright Theme / White & Blue with Pale Green for Dark Theme */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-blue-600 dark:text-blue-300" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Filter blogs by keyword or topic..."
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

              {/* Category Filter Pills */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {['ALL', 'General Note', 'Placement Idea', 'Academic Note'].map((cat) => (
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
                    {cat === 'ALL' ? 'All Blogs' : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Blogs Feed Cards */}
            <div className="space-y-3.5 max-h-[520px] overflow-y-auto pr-1">
              {filteredUpdates.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed border-gray-200 dark:border-palegreen/40 rounded-xl bg-gray-50 dark:bg-black p-4">
                  <BookOpen className="h-8 w-8 text-blue-600 dark:text-palegreen mx-auto mb-2" />
                  <p className="text-xs font-bold text-black dark:text-white">No blogs or updates match your filter.</p>
                  <p className="text-[11px] font-medium text-blue-700 dark:text-blue-300 mt-1">Try changing the category or search keyword.</p>
                </div>
              ) : (
                filteredUpdates.map((up) => (
                  <div
                    key={up._id}
                    className="p-4 rounded-xl border-2 border-gray-200 dark:border-palegreen bg-white dark:bg-black shadow-sm space-y-3 transition-all hover:border-blue-500 dark:hover:border-palegreen"
                  >
                    {/* Header Row: Category Badge + Date + Delete */}
                    <div className="flex items-center justify-between gap-2 border-b border-gray-100 dark:border-palegreen/30 pb-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                        up.category === 'Placement Idea'
                          ? 'bg-amber-50 text-amber-900 border-amber-300 dark:bg-black dark:text-palegreen dark:border-palegreen'
                          : up.category === 'Academic Note'
                          ? 'bg-blue-50 text-blue-900 border-blue-300 dark:bg-black dark:text-blue-300 dark:border-palegreen'
                          : 'bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-black dark:text-palegreen dark:border-palegreen'
                      }`}>
                        {up.category}
                      </span>

                      <div className="flex items-center space-x-2">
                        <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 flex items-center">
                          <Calendar className="h-3 w-3 mr-1 inline" />
                          {up.created_at ? new Date(up.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                        </span>
                        <button
                          onClick={() => handleDeleteUpdate(up._id)}
                          title="Delete Update"
                          className="text-rose-600 hover:text-rose-800 p-1 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-all cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Title */}
                    <h4 className="font-black text-sm text-black dark:text-white leading-snug">
                      {up.title}
                    </h4>

                    {/* Blog Content - 100% visible: Crisp Black in bright mode, Crisp White in dark mode! */}
                    <p className="text-xs font-semibold text-black dark:text-white leading-relaxed whitespace-pre-line bg-gray-50/70 dark:bg-black/60 p-3 rounded-lg border border-gray-200 dark:border-palegreen/30">
                      {up.content}
                    </p>

                    {/* Attachments */}
                    {up.attachments && up.attachments.length > 0 && (
                      <div className="pt-2 border-t border-gray-100 dark:border-palegreen/30 space-y-1.5">
                        <p className="text-[10px] font-black text-blue-900 dark:text-blue-300 uppercase tracking-wider">
                          Attachments ({up.attachments.length}):
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {up.attachments.map((file, fIdx) => (
                            <a
                              key={fIdx}
                              href={file.file_data}
                              download={file.filename}
                              className="inline-flex items-center text-[11px] font-bold text-blue-700 hover:text-blue-900 dark:text-blue-300 hover:underline bg-blue-50 dark:bg-black border border-blue-300 dark:border-palegreen px-2.5 py-1 rounded-lg transition-all"
                            >
                              <span className="mr-1">📎</span>
                              {file.filename}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB D: PAYMENTS VERIFICATION ── */}
      {activeTab === 'payments' && (
        <div className="bg-white dark:bg-black p-6 rounded-2xl border-2 border-gray-200 dark:border-palegreen shadow-sm dark:shadow-[0_0_15px_rgba(159,188,173,0.1)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-gray-100 dark:border-palegreen/30 pb-4">
            <div>
              <h3 className="font-black text-sm text-black dark:text-white">
                UPI Payment UTR Verification Queue
              </h3>
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mt-0.5">
                Verify the UTR Reference Number against your UPI bank records before approving.
              </p>
            </div>
            <button
              type="button"
              onClick={loadPaymentsData}
              className="flex items-center bg-emerald-50 hover:bg-emerald-100 dark:bg-black border-2 border-emerald-300 dark:border-palegreen text-emerald-800 dark:text-palegreen text-xs font-black px-3.5 py-2 rounded-xl transition-all cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Reload Queue
            </button>
          </div>

          {payments.length === 0 ? (
            <p className="text-xs font-bold text-black dark:text-white text-center py-10">
              No payments request log found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs divide-y-2 divide-gray-200 dark:divide-palegreen/30">
                <thead>
                  <tr className="bg-blue-50 dark:bg-black text-blue-900 dark:text-palegreen font-black uppercase text-[10px] tracking-wider border-b-2 border-blue-200 dark:border-palegreen">
                    <th className="py-3 px-3">Student Email</th>
                    <th className="py-3 px-3">Plan</th>
                    <th className="py-3 px-3">Price</th>
                    <th className="py-3 px-3">Transaction UTR</th>
                    <th className="py-3 px-3">Submitted At</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-palegreen/20 text-black dark:text-white">
                  {payments.map((p) => (
                    <tr key={p._id} className="hover:bg-blue-50/40 dark:hover:bg-palegreen/5 transition-colors">
                      <td className="py-3.5 px-3 font-bold text-black dark:text-white">{p.email}</td>
                      <td className="py-3.5 px-3 font-medium text-black dark:text-white">{p.plan_name}</td>
                      <td className="py-3.5 px-3 font-black text-blue-600 dark:text-blue-300">₹{p.price}</td>
                      <td className="py-3.5 px-3">
                        <span className="bg-gray-100 dark:bg-black text-blue-800 dark:text-blue-300 px-2.5 py-1 rounded-lg font-mono font-black border border-blue-200 dark:border-palegreen text-xs select-all">
                          {p.utr}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 font-semibold text-blue-800 dark:text-blue-300 text-[11px]">
                        {p.created_at ? new Date(p.created_at).toLocaleString() : 'N/A'}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black border ${
                          p.status === 'Approved'
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-black dark:text-palegreen dark:border-palegreen'
                            : p.status === 'Rejected'
                            ? 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-black dark:text-rose-400 dark:border-rose-700'
                            : 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-black dark:text-amber-300 dark:border-amber-600'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right space-x-1.5 whitespace-nowrap">
                        {p.status === 'Pending' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleApprovePayment(p._id)}
                              className="bg-emerald-600 hover:bg-emerald-700 dark:bg-palegreen dark:hover:bg-[#8ea89b] text-white dark:text-black font-black text-[11px] px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-sm"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRejectPayment(p._id)}
                              className="bg-rose-600 hover:bg-rose-700 dark:bg-rose-700 dark:hover:bg-rose-800 text-white font-black text-[11px] px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-sm"
                            >
                              Reject
                            </button>
                          </>
                        ) : (
                          <span className="text-xs font-bold text-blue-700 dark:text-blue-300 italic">Handled</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
