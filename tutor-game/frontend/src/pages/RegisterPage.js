import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRegisterMutation } from '@/features/auth/authApi';
import { toast } from 'react-hot-toast';
const registerSchema = z
    .object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
    role: z.enum(['student', 'teacher']),
})
    .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
});
export default function RegisterPage() {
    const [registerUser, { isLoading }] = useRegisterMutation();
    const [error, setError] = useState('');
    const { register, handleSubmit, formState: { errors }, watch, } = useForm({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            role: 'student',
        },
    });
    const onSubmit = async (formData) => {
        try {
            setError('');
            console.log('Registration form submitted:', formData);
            // Prepare the payload that matches the backend's expectations
            const registrationData = {
                email: formData.email,
                password: formData.password,
                role: formData.role.toUpperCase(),
                firstName: formData.firstName,
                lastName: formData.lastName,
            };
            console.log('Sending registration data:', registrationData);
            await registerUser(registrationData).unwrap();
            // onQueryStarted in authApi will handle the success case
            console.log('Registration successful, redirecting...');
        }
        catch (err) {
            console.error('Registration error:', err);
            const errorMessage = err.data?.message || 'Registration failed. Please try again.';
            setError(errorMessage);
            toast.error(errorMessage);
        }
    };
    return (_jsx("div", { className: "min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8", children: _jsxs("div", { className: "max-w-md w-full space-y-8", children: [_jsxs("div", { children: [_jsx("h2", { className: "mt-6 text-center text-3xl font-extrabold text-gray-900", children: "Create a new account" }), _jsxs("p", { className: "mt-2 text-center text-sm text-gray-600", children: ["Or", ' ', _jsx(Link, { to: "/login", className: "font-medium text-indigo-600 hover:text-indigo-500", children: "sign in to your existing account" })] })] }), error && (_jsx("div", { className: "bg-red-50 border-l-4 border-red-400 p-4", children: _jsxs("div", { className: "flex", children: [_jsx("div", { className: "flex-shrink-0", children: _jsx("svg", { className: "h-5 w-5 text-red-400", xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 20 20", fill: "currentColor", children: _jsx("path", { fillRule: "evenodd", d: "M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z", clipRule: "evenodd" }) }) }), _jsx("div", { className: "ml-3", children: _jsx("p", { className: "text-sm text-red-700", children: error }) })] }) })), _jsxs("form", { className: "mt-8 space-y-6", onSubmit: handleSubmit(onSubmit), children: [_jsxs("div", { className: "rounded-md shadow-sm -space-y-px", children: [_jsxs("div", { className: "grid grid-cols-2 gap-3 mb-3", children: [_jsxs("div", { children: [_jsx("label", { htmlFor: "first-name", className: "sr-only", children: "First name" }), _jsx("input", { id: "first-name", type: "text", autoComplete: "given-name", className: `appearance-none rounded relative block w-full px-3 py-2 border ${errors.firstName ? 'border-red-300' : 'border-gray-300'} placeholder-gray-500 text-gray-900 rounded-tl-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`, placeholder: "First name", ...register('firstName') }), errors.firstName && (_jsx("p", { className: "mt-1 text-sm text-red-600", children: errors.firstName.message }))] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "last-name", className: "sr-only", children: "Last name" }), _jsx("input", { id: "last-name", type: "text", autoComplete: "family-name", className: `appearance-none rounded relative block w-full px-3 py-2 border ${errors.lastName ? 'border-red-300' : 'border-gray-300'} placeholder-gray-500 text-gray-900 rounded-tr-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`, placeholder: "Last name", ...register('lastName') }), errors.lastName && (_jsx("p", { className: "mt-1 text-sm text-red-600", children: errors.lastName.message }))] })] }), _jsxs("div", { className: "mb-3", children: [_jsx("label", { htmlFor: "email-address", className: "sr-only", children: "Email address" }), _jsx("input", { id: "email-address", type: "email", autoComplete: "email", className: `appearance-none rounded-none relative block w-full px-3 py-2 border ${errors.email ? 'border-red-300' : 'border-gray-300'} placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`, placeholder: "Email address", ...register('email') }), errors.email && (_jsx("p", { className: "mt-1 text-sm text-red-600", children: errors.email.message }))] }), _jsxs("div", { className: "mb-3", children: [_jsx("label", { htmlFor: "password", className: "sr-only", children: "Password" }), _jsx("input", { id: "password", type: "password", autoComplete: "new-password", className: `appearance-none rounded-none relative block w-full px-3 py-2 border ${errors.password ? 'border-red-300' : 'border-gray-300'} placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`, placeholder: "Password", ...register('password') }), errors.password && (_jsx("p", { className: "mt-1 text-sm text-red-600", children: errors.password.message }))] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "confirm-password", className: "sr-only", children: "Confirm password" }), _jsx("input", { id: "confirm-password", type: "password", autoComplete: "new-password", className: `appearance-none rounded-none relative block w-full px-3 py-2 border ${errors.confirmPassword ? 'border-red-300' : 'border-gray-300'} placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`, placeholder: "Confirm password", ...register('confirmPassword') }), errors.confirmPassword && (_jsx("p", { className: "mt-1 text-sm text-red-600", children: errors.confirmPassword.message }))] })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-600 mb-2", children: "I am a:" }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("input", { id: "student-role", type: "radio", value: "student", className: "hidden peer", ...register('role') }), _jsx("label", { htmlFor: "student-role", className: `block w-full px-4 py-2 text-sm font-medium text-center rounded-md border ${watch('role') === 'student'
                                                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'} cursor-pointer`, children: "Student" })] }), _jsxs("div", { children: [_jsx("input", { id: "teacher-role", type: "radio", value: "teacher", className: "hidden peer", ...register('role') }), _jsx("label", { htmlFor: "teacher-role", className: `block w-full px-4 py-2 text-sm font-medium text-center rounded-md border ${watch('role') === 'teacher'
                                                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'} cursor-pointer`, children: "Teacher" })] })] })] }), _jsx("div", { children: _jsx("button", { type: "submit", disabled: isLoading, className: `group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`, children: isLoading ? 'Creating account...' : 'Create account' }) }), _jsx("div", { className: "text-sm text-center", children: _jsxs("p", { className: "text-gray-600", children: ["By creating an account, you agree to our", ' ', _jsx("a", { href: "#", className: "font-medium text-indigo-600 hover:text-indigo-500", children: "Terms of Service" }), ' ', "and", ' ', _jsx("a", { href: "#", className: "font-medium text-indigo-600 hover:text-indigo-500", children: "Privacy Policy" }), "."] }) })] })] }) }));
}
