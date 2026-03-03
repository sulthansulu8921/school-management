import React, { createContext, useContext, useState, useEffect } from 'react';

const AcademicYearContext = createContext();

export const AcademicYearProvider = ({ children }) => {
    // Default to 2024-25, or fetch from localStorage
    const [academicYear, setAcademicYear] = useState(
        localStorage.getItem('academic_year') || '2024-25'
    );

    useEffect(() => {
        localStorage.setItem('academic_year', academicYear);
        // Dispatch an event to notify other parts of the app if needed
        window.dispatchEvent(new CustomEvent('academic-year-changed', { detail: academicYear }));
    }, [academicYear]);

    return (
        <AcademicYearContext.Provider value={{ academicYear, setAcademicYear }}>
            {children}
        </AcademicYearContext.Provider>
    );
};

export const useAcademicYear = () => {
    const context = useContext(AcademicYearContext);
    if (!context) {
        throw new Error('useAcademicYear must be used within an AcademicYearProvider');
    }
    return context;
};
