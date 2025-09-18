import axios from 'axios';

// Create an Axios instance
const api = axios.create({
  baseURL: 'http://localhost:3000', // Your backend URL
  withCredentials: true, // This is crucial for sending cookies automatically
});

// Response interceptor to handle token refreshing
api.interceptors.response.use(
  (response) => response, // Directly return successful responses
  async (error) => {
    const originalRequest = error.config;

    // Check if the error is a 401 and it's not a retry request
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; // Mark it as a retry request

      try {
        // Attempt to refresh the token
        await api.post('/auth/refresh');
        
        // If successful, the new tokens are set in cookies by the backend.
        // Retry the original request, which should now succeed.
        return api(originalRequest);
        
      } catch (refreshError) {
        // If the refresh token is also invalid, redirect to login
        console.error('Session expired. Please log in again.');
        window.location.href = '/login'; // Redirect to the login page
        return Promise.reject(refreshError);
      }
    }

    // For all other errors, just reject the promise
    return Promise.reject(error);
  }
);

export default api;