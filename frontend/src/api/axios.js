import axios from 'axios';

// Axios instance that automatically attaches JWT from localStorage.
const api = axios.create({
	baseURL: '/',
	withCredentials: true,
});

api.interceptors.request.use((config) => {
	const token = localStorage.getItem('token');
	if (token) {
		config.headers.Authorization = `Bearer ${token}`;
	}
	return config;
});

export default api;
