import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            setUser(null);
            setLoading(false);
            return;
        }

        try {
            const response = await axios.get('/api/user', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            setUser(response.data.user || response.data);
        } catch (error) {
            console.error('Auth check error:', error);
            localStorage.removeItem('token');
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        try {
            const response = await axios.post('/api/login', { email, password });
            if (response.data.token) {
                localStorage.setItem('token', response.data.token);
                setUser(response.data.user);
                return { success: true };
            } else {
                return {
                    success: false,
                    errors: { email: ['Login failed - no token received'] }
                };
            }
        } catch (error) {
            console.error('Login error:', error);
            const errorMessage = error.response?.data?.error || error.message || 'Invalid credentials';
            return {
                success: false,
                errors: { 
                    email: [errorMessage],
                    general: [errorMessage]
                }
            };
        }
    };

    const register = async (data) => {
        try {
            const response = await axios.post('/api/register', data);
            if (response.data.token) {
                localStorage.setItem('token', response.data.token);
                setUser(response.data.user);
                return { success: true };
            } else {
                return {
                    success: false,
                    errors: { 
                        general: ['Registration failed - no token received']
                    }
                };
            }
        } catch (error) {
            console.error('Register error:', error);
            const errorMessage = error.response?.data?.error || error.message || 'Registration failed';
            return {
                success: false,
                errors: { 
                    email: [errorMessage],
                    general: [errorMessage]
                }
            };
        }
    };

    const logout = async () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    const value = {
        user,
        loading,
        login,
        register,
        logout,
        checkAuth,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

