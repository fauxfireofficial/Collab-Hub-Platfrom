import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  startAdornment?: React.ReactNode;
  endAdornment?: React.ReactNode;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helperText,
  startAdornment,
  endAdornment,
  fullWidth = false,
  className = '',
  ...props
}, ref) => {
  
  const widthClass = fullWidth ? 'w-full' : '';
  const errorClass = error 
    ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500/20 focus:border-red-500 bg-red-50/30 dark:bg-red-950/20 dark:border-red-800 dark:text-red-300' 
    : 'border-gray-300 dark:border-gray-700 focus:ring-primary-500/20 focus:border-primary-500 bg-white dark:bg-gray-900 dark:text-white hover:border-gray-400 dark:hover:border-gray-600 placeholder-gray-400 dark:placeholder-gray-500';
  
  const inputBaseClass = `block rounded-lg border px-3 py-2.5 shadow-sm focus:outline-none focus:ring-4 transition-all duration-200 ease-in-out sm:text-sm ${errorClass}`;
  const startAdornmentClass = startAdornment ? 'pl-10' : '';
  const endAdornmentClass = endAdornment ? 'pr-10' : '';
  const adornmentClass = `${startAdornmentClass} ${endAdornmentClass}`;
  
  return (
    <div className={`${widthClass} ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
      )}
      
      <div className="relative">
        {startAdornment && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 dark:text-gray-400">
            {startAdornment}
          </div>
        )}
        
        <input
          ref={ref}
          className={`${inputBaseClass} ${adornmentClass} ${widthClass}`}
          {...props}
        />
        
        {endAdornment && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 dark:text-gray-400 z-10">
            {endAdornment}
          </div>
        )}
      </div>
      
      {(error || helperText) && (
        <p className={`mt-1 text-sm ${error ? 'text-error-500' : 'text-gray-500 dark:text-gray-400'}`}>
          {error || helperText}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';