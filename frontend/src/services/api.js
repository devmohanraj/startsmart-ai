import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { "Content-Type": "application/json" },
  // Cold Render backend needs a bounded per-attempt timeout while the interceptor retries.
  timeout: 30000,
});

// Retry cold-start failures (no response, or proxy 502/503) with backoff; other responses are real errors.
const MAX_RETRIES = 2;
const BASE_DELAY_MS = 2000;
const RETRYABLE_STATUSES = new Set([502, 503]);

let connectingCount = 0;
const connectingListeners = new Set();

function notifyConnecting(active) {
  connectingListeners.forEach((listener) => listener(active));
}

export function onConnectingChange(listener) {
  connectingListeners.add(listener);
  return () => connectingListeners.delete(listener);
}

function isRetryableFailure(error) {
  if (!axios.isAxiosError(error) || !error.config) return false;

  // A cancelled request is a deliberate caller decision and must not be replayed.
  if (error.code === "ERR_CANCELED") return false;

  return !error.response || RETRYABLE_STATUSES.has(error.response.status);
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config || {};
    const retryCount = config.__retryCount || 0;

    if (!isRetryableFailure(error) || retryCount >= MAX_RETRIES) {
      return Promise.reject(error);
    }

    connectingCount += 1;
    if (connectingCount === 1) notifyConnecting(true);

    try {
      config.__retryCount = retryCount + 1;
      const delay = BASE_DELAY_MS * 2 ** retryCount;
      await new Promise((resolve) => setTimeout(resolve, delay));
      return await api.request(config);
    } finally {
      connectingCount = Math.max(0, connectingCount - 1);
      if (connectingCount === 0) notifyConnecting(false);
    }
  },
);

function statusMessage(status) {
  return `Request failed with status ${status}`;
}

async function request(config, buildFallbackMessage = statusMessage) {
  try {
    const { data } = await api.request(config);
    return data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response) {
      throw new Error(
        err.response.data?.error || buildFallbackMessage(err.response.status),
        { cause: err },
      );
    }
    throw new Error(err.message, { cause: err });
  }
}

export const authApi = {
  login: (credentials) =>
    request(
      { method: "post", url: "/api/auth/login", data: credentials },
      () => "Authentication failed",
    ),
  signup: (formData) =>
    request(
      { method: "post", url: "/api/auth/signup", data: formData },
      () => "Authentication failed",
    ),
};

export const projectsApi = {
  list: async (userId) => {
    try {
      const { data } = await api.request({
        method: "get",
        url: `/api/projects/user/${userId}`,
      });
      return data;
    } catch (err) {
      throw new Error("Failed to fetch projects", { cause: err });
    }
  },
  create: (userId, payload) =>
    request({
      method: "post",
      url: "/api/projects",
      params: { userId },
      data: payload,
    }),
  remove: (projectId) =>
    request(
      { method: "delete", url: `/api/projects/${projectId}` },
      () => "Failed to delete project",
    ),
};

export const dashboardApi = {
  summary: (userId) =>
    request({
      method: "get",
      url: "/api/dashboard/summary",
      params: { userId },
    }),
};

export const marketAnalysisApi = {
  get: async (projectId) => {
    try {
      const { data } = await api.request({
        method: "get",
        url: `/api/projects/${projectId}/market-analysis`,
      });
      return { ok: true, data };
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        if (err.response.status === 404) return { ok: false, notFound: true };
        throw new Error(statusMessage(err.response.status), { cause: err });
      }
      throw new Error(err.message, { cause: err });
    }
  },
  generate: (projectId) =>
    request({
      method: "post",
      url: `/api/projects/${projectId}/market-analysis`,
      // Generation waits on Groq server-side, so disable the base timeout for it.
      timeout: 0,
    }),

  poll: async (projectId) => {
    try {
      const { data } = await api.request({
        method: "get",
        url: `/api/projects/${projectId}/market-analysis`,
      });
      return data;
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        throw new Error(statusMessage(err.response.status), { cause: err });
      }
      throw new Error(err.message, { cause: err });
    }
  },
};

async function fetchOrGenerate(path, method) {
  try {
    const { data } = await api.request({
      method,
      url: path,
      // POST generation waits on ML/Groq; GET of cached data stays bounded by the timeout.
      timeout: method === "POST" ? 0 : undefined,
    });
    return data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response) {
      if (err.response.status === 404 && method === "GET") {
        throw new Error("NOT_FOUND", { cause: err });
      }
      throw new Error(
        err.response.data?.error || statusMessage(err.response.status),
        { cause: err },
      );
    }
    throw new Error(err.message, { cause: err });
  }
}

export const riskAnalysisApi = {
  fetchOrGenerate: (projectId, method) =>
    fetchOrGenerate(`/api/projects/${projectId}/risk-analysis`, method),
};

export const recommendationsApi = {
  fetchOrGenerate: (projectId, method) =>
    fetchOrGenerate(`/api/projects/${projectId}/recommendations`, method),
};

export const reportsApi = {
  generate: async (projectId) => {
    try {
      const { data } = await api.request({
        method: "post",
        url: `/api/projects/${projectId}/report`,
        timeout: 0,
      });
      return data;
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        throw new Error(
          err.response.data?.error || statusMessage(err.response.status),
          { cause: err },
        );
      }
      throw new Error(err.message, { cause: err });
    }
  },
  generatePortfolio: async (userId) => {
    try {
      const response = await api.request({
        method: "post",
        url: "/api/reports/portfolio",
        params: { userId },
        responseType: "blob",
        timeout: 0,
      });
      const fileName = `StartSmart-Portfolio-Report-${userId}.pdf`;
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      return { ok: true };
    } catch (err) {
      if (axios.isAxiosError(err) && err.response && err.response.data) {
        const text = await err.response.data.text();
        try {
          const parsed = JSON.parse(text);
          throw new Error(parsed.error || "Failed to generate portfolio report", { cause: err });
        } catch {
          throw new Error("Failed to generate portfolio report");
        }
      }
      throw new Error(err.message, { cause: err });
    }
  },
  downloadReport: async (reportId, fallbackName) => {
    try {
      const response = await api.request({
        method: "get",
        url: `/api/reports/${reportId}/download`,
        responseType: "blob",
      });
      const disposition = response.headers["content-disposition"] || "";
      const match = /filename\*=UTF-8''([^;]+)/.exec(disposition);
      const fileName = match
        ? decodeURIComponent(match[1])
        : fallbackName || `StartSmart-report-${reportId}.pdf`;
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      return { ok: true };
    } catch (err) {
      if (axios.isAxiosError(err) && err.response && err.response.data) {
        const text = await err.response.data.text();
        try {
          const parsed = JSON.parse(text);
          throw new Error(parsed.error || "Failed to download report", { cause: err });
        } catch {
          throw new Error("Failed to download report");
        }
      }
      throw new Error(err.message, { cause: err });
    }
  },
};
