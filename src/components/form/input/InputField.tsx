import * as React from "react";

// Kế thừa tất cả props của <input>
export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  success?: boolean;
  error?: boolean;
  hint?: string;
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      type = "text",
      className = "",
      disabled = false,
      success = false,
      error = false,
      hint,
      ...props // ✅ chứa onBlur, onChange, value, name, id, autoComplete, inputMode, v.v…
    },
    ref
  ) => {
    let baseClasses = `
      h-11 w-full rounded-md border px-4 py-2.5 text-sm
      placeholder:text-gray-400
      focus:outline-none focus:ring-0
      transition-all duration-150
    `;

    if (disabled) {
      baseClasses += `
        text-gray-400 border-gray-300 bg-gray-100 cursor-not-allowed
      `;
    } else if (error) {
      // viền đỏ rõ ràng
      baseClasses += `
        border-[#EF4444] text-gray-900 bg-white
        focus:border-[#EF4444]
        placeholder:text-gray-400
      `;
    } else if (success) {
      baseClasses += `
        border-green-500 focus:border-green-500
        bg-white
      `;
    } else {
      baseClasses += `
        border-gray-300 bg-white
        focus:border-brand-500
        dark:border-gray-700 dark:bg-transparent dark:text-white/90
      `;
    }

    return (
      <div className="relative">
        <input
          ref={ref}
          type={type}
          className={`${baseClasses} ${className}`}
          disabled={disabled}
          {...props} // ✅ forward toàn bộ props (onBlur, onChange, value, id, name, min, max, step, autoComplete, inputMode...)
        />

        {hint && (
          <p
            className={`mt-1.5 text-xs ${
              error ? "text-[#EF4444]" : success ? "text-green-500" : "text-gray-500"
            }`}
          >
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
