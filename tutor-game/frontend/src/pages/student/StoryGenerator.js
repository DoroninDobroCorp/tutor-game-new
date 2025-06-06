import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
const StoryGenerator = () => {
    const [topic, setTopic] = useState('');
    const [story, setStory] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!topic.trim()) {
            setError('Please enter a topic');
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            if (!token) {
                setError('Please log in to generate stories');
                return;
            }
            const response = await fetch('/api/generate/story', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    prompt: topic,
                    ageGroup: 'elementary', // Default age group
                    subject: 'general'
                }),
            });
            if (!response.ok) {
                throw new Error('Failed to generate story');
            }
            const data = await response.json();
            setStory(data.story);
        }
        catch (err) {
            setError('Failed to generate story. Please try again.');
            console.error('Story generation error:', err);
        }
        finally {
            setIsLoading(false);
        }
    };
    return (_jsxs("div", { className: "max-w-4xl mx-auto p-6", children: [_jsx("h1", { className: "text-2xl font-bold mb-6", children: "Story Generator" }), _jsxs("form", { onSubmit: handleSubmit, className: "mb-8", children: [_jsxs("div", { className: "flex gap-4", children: [_jsx("input", { type: "text", value: topic, onChange: (e) => setTopic(e.target.value), placeholder: "Enter a topic for your story...", className: "flex-1 p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent", disabled: isLoading }), _jsx("button", { type: "submit", disabled: isLoading, className: "px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50", children: isLoading ? 'Generating...' : 'Generate' })] }), error && _jsx("p", { className: "mt-2 text-red-600", children: error })] }), story && (_jsxs("div", { className: "bg-white p-6 rounded-lg shadow-md", children: [_jsx("h2", { className: "text-xl font-semibold mb-4", children: "Your Story" }), _jsx("p", { className: "whitespace-pre-line", children: story })] }))] }));
};
export default StoryGenerator;
