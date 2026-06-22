import api from "../api/api";
import { normalizeDateParams, normalizeTopicPayload, normalizeAssignmentPayload } from "../utils/analysisMonitorUtils.js";

const analysisService = {
  getTopics: (params) => api.get("/analysis/topics", { params: normalizeDateParams(params) }).then((r) => r.data),
  getTopicSummary: (params) => api.get("/analysis/topics/summary/stats", { params: normalizeDateParams(params) }).then((r) => r.data),
  getAssignmentSummary: () => api.get("/analysis/assignments/summary/stats").then((r) => r.data).catch(() => null),
  getTopic: (id) => api.get(`/analysis/topics/${id}`).then((r) => r.data),
  getTopicAssignments: (topicId) => api.get(`/analysis/topics/${topicId}/assignments`).then((r) => r.data),
  createTopic: (data) => api.post("/analysis/topics", normalizeTopicPayload(data)).then((r) => r.data),
  updateTopic: (id, data) => api.patch(`/analysis/topics/${id}`, normalizeTopicPayload(data)).then((r) => r.data),
  updateTopicStatus: (id, data) => api.patch(`/analysis/topics/${id}/status`, data).then((r) => r.data),
  reviewTopic: (id, data) => api.post(`/analysis/topics/${id}/review`, data).then((r) => r.data),
  resubmitTopic: (id, data) => api.post(`/analysis/topics/${id}/resubmit`, data).then((r) => r.data),
  archiveTopic: (id, data) => api.post(`/analysis/topics/${id}/archive`, data).then((r) => r.data),
  deleteTopic: (id) => api.delete(`/analysis/topics/${id}`).then((r) => r.data),

  getPolicies: () => api.get("/analysis/policies").then((r) => r.data),
  createPolicy: (data) => api.post("/analysis/policies", data).then((r) => r.data),

  getAssignments: (params) => api.get("/analysis/assignments", { params }).then((r) => r.data),
  getAssignment: (id) => api.get(`/analysis/assignments/${id}`).then((r) => r.data),
  createAssignment: (data) => api.post("/analysis/assignments", normalizeAssignmentPayload(data)).then((r) => r.data),
  updateAssignment: (id, data) => api.patch(`/analysis/assignments/${id}`, normalizeAssignmentPayload(data)).then((r) => r.data),
  cancelAssignment: (id, data) => api.post(`/analysis/assignments/${id}/cancel`, data).then((r) => r.data),
  updateAssignmentStatus: (id, data) => api.patch(`/analysis/assignments/${id}/status`, data).then((r) => r.data),

  createAnalysis: (assignmentId) => api.post(`/analysis/assignments/${assignmentId}/analysis`).then((r) => r.data),
  getAnalysis: (id) => api.get(`/analysis/analyses/${id}`).then((r) => r.data),
  getAnalysisByAssignment: (assignmentId) =>
    api.get(`/analysis/assignments/${assignmentId}/analysis`).then((r) => (r.data?.exists === false || !r.data?.id ? null : r.data)),

  getVersion: (id) => api.get(`/analysis/versions/${id}`).then((r) => r.data),
  saveVersion: (id, data) => api.put(`/analysis/versions/${id}`, data).then((r) => r.data),
  submitVersion: (id, data) => api.post(`/analysis/versions/${id}/submit`, data).then((r) => r.data),
  finalizeVersion: (id) => api.post(`/analysis/versions/${id}/finalize`).then((r) => r.data),

  getFeedbacks: (versionId) => api.get(`/analysis/versions/${versionId}/feedbacks`).then((r) => r.data),
  addFeedback: (data) => api.post("/analysis/feedbacks", data).then((r) => r.data),
  replyFeedback: (id, data) => api.post(`/analysis/feedbacks/${id}/reply`, data).then((r) => r.data),
  requestRevision: (versionId, data) => api.patch(`/analysis/versions/${versionId}/request-revision`, data).then((r) => r.data),

  getCriteria: () => api.get("/analysis/criteria").then((r) => r.data),
  submitScores: (versionId, data) => api.post(`/analysis/versions/${versionId}/scores`, data).then((r) => r.data),
  getScores: (versionId) => api.get(`/analysis/versions/${versionId}/scores`).then((r) => r.data),

  approveFinal: (analysisId, data) => api.post(`/analysis/analyses/${analysisId}/approve-final`, data).then((r) => r.data),
  exportPdf: (analysisId) =>
    api.get(`/analysis/analyses/${analysisId}/export/pdf`, { responseType: "blob" }).then((r) => r.data),

  uploadAttachment: (formData) =>
    api.post("/analysis/attachments", formData, { headers: { "Content-Type": "multipart/form-data" } }).then((r) => r.data),
  getAttachments: (params) => api.get("/analysis/attachments", { params }).then((r) => r.data),

  getReportTopics: (params) => api.get("/analysis/reports/topics", { params }).then((r) => r.data),
  getReportMissions: () => api.get("/analysis/reports/missions").then((r) => r.data),
  getReportAnalystPerformance: () => api.get("/analysis/reports/analyst-performance").then((r) => r.data),
  getReportDelays: () => api.get("/analysis/reports/delays").then((r) => r.data),
  getReportAnalyses: (params) => api.get("/analysis/reports/analyses", { params: normalizeDateParams(params) }).then((r) => r.data),
  getReportDashboard: (params) => api.get("/analysis/reports/dashboard", { params: normalizeDateParams(params) }).then((r) => r.data),
  getActivityLogs: (params) => api.get("/analysis/activity-logs", { params }).then((r) => r.data),
  getStatusHistory: (entityType, entityId) =>
    api.get(`/analysis/status-history/${entityType}/${entityId}`).then((r) => r.data),

  getAnalysts: () =>
    api.get("/analysis/users/analysts").then((r) => (Array.isArray(r.data) ? r.data : r.data?.users || [])),
  getMentors: () =>
    api.get("/analysis/users/mentors").then((r) => (Array.isArray(r.data) ? r.data : r.data?.users || [])),
};

export default analysisService;
