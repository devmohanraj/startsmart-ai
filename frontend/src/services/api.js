import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { "Content-Type": "application/json" },
});

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
    const { data } = await api.request({ method, url: path });
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
