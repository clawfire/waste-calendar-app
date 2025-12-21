import React, { useState, useRef, useEffect, useMemo } from 'react';
import { IoChevronDown, IoSearchOutline } from 'react-icons/io5';

const CustomSelect = ({ label, placeholder, value, options, onChange, disabled }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef(null);
    const searchInputRef = useRef(null);

    const selectedOption = options.find(opt => opt.value === value);

    // Filter options based on search term
    const filteredOptions = useMemo(() => {
        if (!searchTerm) return options;
        return options.filter(opt =>
            (opt.label || opt.value).toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [options, searchTerm]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Reset search when opening/closing
    useEffect(() => {
        if (!isOpen) {
            setSearchTerm('');
        } else {
            // Focus search input when opened
            setTimeout(() => {
                searchInputRef.current?.focus();
            }, 50);
        }
    }, [isOpen]);

    const handleSelect = (option) => {
        onChange(option.value);
        setIsOpen(false);
    };

    return (
        <div className={`custom-select-wrapper ${disabled ? 'disabled' : ''}`} ref={wrapperRef}>
            {label && <label className="select-label">{label}</label>}

            <div
                className={`select-trigger ${isOpen ? 'open' : ''}`}
                onClick={() => !disabled && setIsOpen(!isOpen)}
            >
                <span className={!selectedOption ? 'placeholder' : ''}>
                    {selectedOption ? (selectedOption.label || selectedOption.value) : placeholder}
                </span>
                <IoChevronDown className={`arrow-icon ${isOpen ? 'rotated' : ''}`} />
            </div>

            {isOpen && !disabled && (
                <div className="options-list">
                    <div className="search-container" onClick={(e) => e.stopPropagation()}>
                        <IoSearchOutline className="search-icon" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            className="search-input"
                            placeholder="Rechercher..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="options-scroll">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option) => (
                                <div
                                    key={option.value}
                                    className={`option-item ${value === option.value ? 'selected' : ''}`}
                                    onClick={() => handleSelect(option)}
                                >
                                    {option.label || option.value}
                                </div>
                            ))
                        ) : (
                            <div className="option-item no-data">Aucun résultat</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomSelect;
