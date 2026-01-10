import { useState, useRef, useEffect } from 'react';
import { FiChevronDown, FiCheck } from 'react-icons/fi';

const CustomDropdown = ({ options, value, onChange, placeholder = 'Select...' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Find the current selected option
    const selectedOption = options.find(opt => opt.value === value);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (optionValue) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    return (
        <div ref={dropdownRef} className="relative">
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-4 py-3 rounded-xl flex items-center justify-between gap-2 transition-all duration-200"
                style={{
                    background: 'rgba(255, 255, 255, 0.9)',
                    border: isOpen ? '1px solid #0ea5e9' : '1px solid rgba(0, 0, 0, 0.1)',
                    color: '#1e293b'
                }}
            >
                <span className={selectedOption ? 'text-slate-800' : 'text-slate-400'}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <FiChevronDown
                    className={`w-5 h-5 text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div
                    className="absolute top-full left-0 right-0 mt-2 rounded-xl overflow-hidden"
                    style={{
                        background: '#fff',
                        border: '1px solid rgba(0, 0, 0, 0.1)',
                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
                        zIndex: 9999
                    }}
                >
                    {options.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => handleSelect(option.value)}
                            className="w-full px-4 py-3 flex items-center justify-between text-left transition-colors duration-150"
                            style={{
                                background: value === option.value ? 'rgba(14, 165, 233, 0.1)' : 'transparent',
                                color: value === option.value ? '#0284c7' : '#334155',
                                borderBottom: '1px solid rgba(0, 0, 0, 0.05)'
                            }}
                            onMouseEnter={(e) => {
                                if (value !== option.value) {
                                    e.target.style.background = 'rgba(0, 0, 0, 0.03)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (value !== option.value) {
                                    e.target.style.background = 'transparent';
                                }
                            }}
                        >
                            <span>{option.label}</span>
                            {value === option.value && (
                                <FiCheck className="w-4 h-4 text-cyan-600" />
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CustomDropdown;
