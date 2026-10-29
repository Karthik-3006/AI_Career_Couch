import axios from 'axios';

const rawBaseURL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
const baseURL = rawBaseURL
  ? (rawBaseURL.endsWith('/api/v1') ? rawBaseURL : `${rawBaseURL}/api/v1`)
  : '/api/v1';

export const getErrorMessage = (err, fallback = 'An unexpected error occurred.') => {
  if (!err) return fallback;
  const data = err.response?.data;
  if (!data) return err.message || fallback;

  // 1. String detail
  if (typeof data.detail === 'string') {
    return data.detail;
  }
  // 2. FastAPI validation error list
  if (Array.isArray(data.detail)) {
    return data.detail
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item.msg) {
          const field = item.loc && item.loc.length > 0 ? item.loc[item.loc.length - 1] : null;
          return field && field !== 'body' ? `${field}: ${item.msg}` : item.msg;
        }
        return JSON.stringify(item);
      })
      .join(', ');
  }
  // 3. Object detail
  if (data.detail && typeof data.detail === 'object') {
    return data.detail.message || data.detail.msg || JSON.stringify(data.detail);
  }
  // 4. Message field
  if (typeof data.message === 'string') {
    return data.message;
  }
  return fallback;
};

const api = axios.create({
  baseURL: baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auto-inject JWT access token into headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const authService = {
  register: (data) => api.post('/auth/register', data).then(r => r.data),
  login: (data) => api.post('/auth/login', data).then(r => r.data),
  me: () => api.get('/auth/me').then(r => r.data),
  updateProfile: (data) => api.put('/auth/me', data).then(r => r.data),
};

export const resumeService = {
  upload: (formData) => api.post('/resume/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(r => r.data),
  analyze: (formData) => api.post('/resume/analyze', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(r => r.data),
  getAnalysis: () => api.get('/resume/analysis').then(r => r.data),
};

export const interviewService = {
  start: (data) => api.post('/interviews/start', data).then(r => r.data),
  submitAnswer: (id, answer) => api.post(`/interviews/${id}/answer`, { answer }).then(r => r.data),
  getReport: (id) => api.get(`/interviews/${id}/report`).then(r => r.data),
  getHistory: () => api.get('/interviews/history').then(r => r.data),
};

export const learningService = {
  getSubjects: (category) => api.get('/learning/subjects', { params: { category } }).then(r => r.data),
  getSubjectDetails: (id) => api.get(`/learning/subjects/${id}`).then(r => r.data),
  getTopicTest: (topicId) => api.get(`/learning/topics/${topicId}/test`).then(r => r.data),
  submitTest: (topicId, submissions) => api.post(`/learning/topics/${topicId}/test/submit`, submissions).then(r => r.data),
  getMockTest: () => api.get('/learning/mock-test').then(r => r.data),
  submitMockTest: (submissions) => api.post('/learning/mock-test/submit', submissions).then(r => r.data),
  getProgress: () => api.get('/learning/progress').then(r => r.data),
  getRecommendations: () => api.get('/learning/recommendations').then(r => r.data),
  getCertificate: () => api.get('/learning/certificate').then(r => r.data),
};

export const codingService = {
  getProblems: () => api.get('/coding/problems').then(r => r.data),
  getProblem: (id) => api.get(`/coding/problems/${id}`).then(r => r.data),
  submitSolution: (id, code) => api.post(`/coding/problems/${id}/submit`, { code }).then(r => r.data),
};

export const roadmapService = {
  generate: (domain, level, goal) => api.post('/roadmap/generate', { domain, level, goal }).then(r => r.data),
  getMe: () => api.get('/roadmap/me').then(r => r.data),
};

export const adminService = {
  grantSubscription: (email, months) => api.post('/admin/subscription/grant', { email, months }).then(r => r.data),
  createSubject: (data) => api.post('/admin/subjects', data).then(r => r.data),
  addTopic: (subjId, data) => api.post(`/admin/subjects/${subjId}/topics`, data).then(r => r.data),
  addQuizQuestion: (topicId, data) => api.post(`/admin/topics/${topicId}/quizzes`, data).then(r => r.data),
  getPaymentsList: () => api.get('/admin/payments').then(r => r.data),
  approvePayment: (paymentId) => api.post(`/admin/payments/${paymentId}/approve`).then(r => r.data),
  rejectPayment: (paymentId) => api.post(`/admin/payments/${paymentId}/reject`).then(r => r.data),
  addSubjectNote: (subjId, data) => api.post(`/admin/subjects/${subjId}/notes`, data).then(r => r.data),
  editSubjectNote: (subjId, noteId, data) => api.put(`/admin/subjects/${subjId}/notes/${noteId}`, data).then(r => r.data),
  deleteSubjectNote: (subjId, noteId) => api.delete(`/admin/subjects/${subjId}/notes/${noteId}`).then(r => r.data),
};

export const updatesService = {
  getUpdates: () => api.get('/updates').then(r => r.data),
  publishUpdate: (data) => api.post('/updates', data).then(r => r.data),
  deleteUpdate: (id) => api.delete(`/updates/${id}`).then(r => r.data),
};

export const subscriptionService = {
  getSettings: () => api.get('/subscription/settings').then(r => r.data),
  getStatus: () => api.get('/subscription/status').then(r => r.data),
  toggleEnforcement: (enforced) => api.post('/admin/subscription/toggle-enforcement', { enforced }).then(r => r.data),
  subscribe: (planId, utr) => api.post('/subscription/subscribe', { plan_id: planId, utr }).then(r => r.data),
  createPlan: (data) => api.post('/admin/subscription/plans', data).then(r => r.data),
  deletePlan: (id) => api.delete(`/admin/subscription/plans/${id}`).then(r => r.data),
  updatePaymentSettings: (data) => api.put('/admin/subscription/payment-settings', data).then(r => r.data),
  requestSubscription: (planId, utr) => api.post('/subscription/request', { plan_id: planId, utr }).then(r => r.data),
  getRequests: () => api.get('/subscription/requests').then(r => r.data),
};

export default api;
