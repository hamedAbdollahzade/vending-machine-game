import axios from 'axios';
import { strings } from '../i18n/fa.js';

/** Shared HTTP client; data paths resolve below the deployment directory. */
export const apiClient = axios.create({
  baseURL:
    typeof document === 'undefined' ? 'http://localhost/' : new URL('./', document.baseURI).href,
  timeout: 15000,
});
apiClient.interceptors.response.use(
  (response) => response,
  (error) =>
    Promise.reject(
      Object.assign(new Error(error.message || strings.app.dataFailed), {
        status: error.response?.status ?? null,
        code: error.code,
      }),
    ),
);
