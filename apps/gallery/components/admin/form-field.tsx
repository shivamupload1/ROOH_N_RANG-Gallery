import type { InputHTMLAttributes } from "react";

type FormFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
  error?: string;
};

export function FormField({ label, name, error, className, ...props }: FormFieldProps) {
  return (
    <label className="grid gap-2 text-sm font-medium text-ink">
      {label}
      <input
        name={name}
        className={`rounded-md border border-ink/15 bg-ivory px-3 py-2 outline-none transition focus:border-rust ${className || ""}`}
        {...props}
      />
      {error ? <span className="text-xs font-medium text-rust">{error}</span> : null}
    </label>
  );
}
