import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLoginMutation } from '@/features/auth/authApi';
import { useAppDispatch } from '@/app/hooks';
import { setCredentials } from '@/features/auth/authSlice';
import { toast } from 'react-hot-toast';
const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});
export default function LoginPage() {
    const [login, { isLoading }] = useLoginMutation();
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const { register, handleSubmit, formState: { errors }, } = useForm({
        resolver: zodResolver(loginSchema),
    });
    const onSubmit = async (data) => {
        console.log('Login form submitted with data:', data);
        try {
            setError('');
            console.log('Calling login API...');
            const result = await login(data).unwrap();
            console.log('Login API response:', result);
            
            // Extract user data from the response
            const { user, accessToken, refreshToken } = result.data || {};
            
            if (!user || !accessToken) {
                throw new Error('Invalid response from server');
            }
            
            dispatch(setCredentials({
                user: user,
                token: accessToken,
                refreshToken: refreshToken
            }));
            
            console.log('Credentials set, navigating to dashboard...');
            toast.success('Login successful!');
            
            // Redirect based on user role
            const userRole = (user.role || '').toLowerCase();
            if (userRole) {
                navigate(`/${userRole}`);
            } else {
                console.error('No role found in user data');
                navigate('/');
            }
        }
        catch (err) {
            console.error('Login error:', err);
            const errorMessage = err?.data?.message || 'Login failed. Please try again.';
            console.error('Error details:', errorMessage);
            setError(errorMessage);
            toast.error(errorMessage);
        }
    };
    return (_jsx("div", { className: "min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8", children: _jsxs("div", { className: "max-w-md w-full space-y-8", children: [_jsxs("div", { children: [_jsx("h2", { className: "mt-6 text-center text-3xl font-extrabold text-gray-900", children: "Sign in to your account" }), _jsxs("p", { className: "mt-2 text-center text-sm text-gray-600", children: ["Or", ' ', _jsx(Link, { to: "/register", className: "font-medium text-indigo-600 hover:text-indigo-500", children: "create a new account" })] })] }), error && (_jsx("div", { className: "bg-red-50 border-l-4 border-red-400 p-4", children: _jsxs("div", { className: "flex", children: [_jsx("div", { className: "flex-shrink-0", children: _jsx("svg", { className: "h-5 w-5 text-red-400", xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 20 20", fill: "currentColor", children: _jsx("path", { fillRule: "evenodd", d: "M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z", clipRule: "evenodd" }) }) }), _jsx("div", { className: "ml-3", children: _jsx("p", { className: "text-sm text-red-700", children: error }) })] }) })), _jsxs("form", { className: "mt-8 space-y-6", onSubmit: handleSubmit(onSubmit), children: [_jsx("input", { type: "hidden", name: "remember", value: "true" }), _jsxs("div", { className: "rounded-md shadow-sm -space-y-px", children: [_jsxs("div", { children: [_jsx("label", { htmlFor: "email-address", className: "sr-only", children: "Email address" }), _jsx("input", { id: "email-address", type: "email", autoComplete: "email", className: `appearance-none rounded-none relative block w-full px-3 py-2 border ${errors.email ? 'border-red-300' : 'border-gray-300'} placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`, placeholder: "Email address", ...register('email') }), errors.email && (_jsx("p", { className: "mt-1 text-sm text-red-600", children: errors.email.message }))] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "password", className: "sr-only", children: "Password" }), _jsx("input", { id: "password", type: "password", autoComplete: "current-password", className: `appearance-none rounded-none relative block w-full px-3 py-2 border ${errors.password ? 'border-red-300' : 'border-gray-300'} placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`, placeholder: "Password", ...register('password') }), errors.password && (_jsx("p", { className: "mt-1 text-sm text-red-600", children: errors.password.message }))] })] }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center", children: [_jsx("input", { id: "remember-me", name: "remember-me", type: "checkbox", className: "h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" }), _jsx("label", { htmlFor: "remember-me", className: "ml-2 block text-sm text-gray-900", children: "Remember me" })] }), _jsx("div", { className: "text-sm", children: _jsx("a", { href: "#", className: "font-medium text-indigo-600 hover:text-indigo-500", children: "Forgot your password?" }) })] }), _jsx("div", { children: _jsx("button", { type: "submit", disabled: isLoading, className: `group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`, children: isLoading ? 'Signing in...' : 'Sign in' }) })] })] }) }));
}
