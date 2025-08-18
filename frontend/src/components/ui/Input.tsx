import React from 'react';

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export default function Input({ label, error, className = '', id, ...props }: InputProps) {
  const base = 'mt-1 block w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500';
  const border = error ? 'border-red-500' : 'border-gray-300';
  return (
    <div>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <input id={id} className={[base, border, className].join(' ')} {...props} />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
