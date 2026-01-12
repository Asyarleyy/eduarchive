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

    // Initial auth check on app load
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
            // Ensure we handle both response formats: { user: {...} } or {...}
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
                // Save the full user object received from login
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
            const errorResponse = {
                success: false,
                errors: { 
                    email: [errorMessage],
                    general: [errorMessage]
                }
            };
            
            // If account is deleted, include the reason
            if (error.response?.data?.reason) {
                errorResponse.errors.reason = error.response.data.reason;
            }
            
            return errorResponse;
        }
    };

    const register = async (data) => {
        try {
            // 'data' now contains: name, first_name, last_name, email, role, school, gender, birth_date, image, teacher_proof (if teacher)
            const response = await axios.post('/api/register', data, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            
            if (response.data.token) {
                localStorage.setItem('token', response.data.token);
                
                /**
                 * 🟣 IMPORTANT FIX: 
                 * We ensure the user state is set with the COMPLETE data returned 
                 * from the server so the Profile page displays it immediately.
                 */
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
            console.error('Error response:', error.response?.data);
            
            const errorData = error.response?.data;
            const errorMessage = errorData?.error || errorData?.message || error.message || 'Registration failed';
            
            // Return structured errors for the Register component to display
            return {
                success: false,
                errors: errorData?.errors || { 
                    general: [errorMessage] 
                },
                message: errorMessage
            };
        }
    };

    const logout = async () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    // The 'value' object makes these variables and functions available to all components
    const value = {
        user,
        setUser,    // Allows Profile.jsx to manually update state after saving changes
        loading,
        login,
        register,
        logout,
        checkAuth,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}