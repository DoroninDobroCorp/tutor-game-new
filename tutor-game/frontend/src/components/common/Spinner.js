import { jsx as _jsx } from "react/jsx-runtime";
const sizeMap = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
};
const Spinner = ({ size = 'md', className = '' }) => {
    const sizeClass = sizeMap[size];
    return (_jsx("div", { className: `flex items-center justify-center ${className}`, children: _jsx("div", { className: `${sizeClass} animate-spin rounded-full border-4 border-solid border-blue-500 border-t-transparent`, role: "status", children: _jsx("span", { className: "sr-only", children: "Loading..." }) }) }));
};
export default Spinner;
