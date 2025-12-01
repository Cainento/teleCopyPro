import { forwardRef } from 'react';
import { Hash, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

interface ChannelInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helpText?: string;
  isValidating?: boolean;
  isValid?: boolean;
}

export const ChannelInput = forwardRef<HTMLInputElement, ChannelInputProps>(
  ({ label, error, helpText, isValidating, isValid, className, ...props }, ref) => {
    return (
      <div className="space-y-2">
        <label htmlFor={props.id} className="block text-sm font-medium">
          {label}
        </label>

        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <Hash className="h-5 w-5" />
          </div>

          <input
            ref={ref}
            {...props}
            className={cn(
              'w-full pl-10 pr-10 py-2 border rounded-md',
              'focus:outline-none focus:ring-2 focus:ring-primary',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              error ? 'border-destructive' : 'border-input',
              className
            )}
          />

          {/* Validation Indicators */}
          {(isValidating || isValid) && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {isValidating && (
                <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
              )}
              {!isValidating && isValid && (
                <CheckCircle className="h-5 w-5 text-success" />
              )}
            </div>
          )}
        </div>

        {/* Help Text */}
        {helpText && !error && (
          <p className="text-xs text-muted-foreground flex items-start gap-1">
            <span className="mt-0.5">💡</span>
            <span>{helpText}</span>
          </p>
        )}

        {/* Error Message */}
        {error && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </p>
        )}
      </div>
    );
  }
);

ChannelInput.displayName = 'ChannelInput';
