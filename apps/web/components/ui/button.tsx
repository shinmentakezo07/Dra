import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-white text-black hover:bg-gray-100 shadow-sm",
        primary:
          "bg-[#3b82f6] text-white hover:bg-[#3b82f6]/90 shadow-[0_0_20px_rgba(59,130,246,0.3)]",
        secondary:
          "bg-white/5 text-white border border-white/10 hover:bg-white/10 hover:border-white/20",
        ghost:
          "text-gray-400 hover:text-white hover:bg-white/10",
        destructive:
          "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20",
        outline:
          "border border-white/10 bg-transparent hover:bg-white/5 text-white",
        cyber:
          "relative overflow-hidden bg-gradient-to-r from-violet-600 to-blue-600 text-white hover:shadow-[0_0_30px_rgba(124,58,237,0.5)]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3 text-xs",
        lg: "h-12 px-6",
        xl: "h-14 px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
