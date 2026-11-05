import { forwardRef, type ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "subtle" | "danger" };

export const Button = forwardRef<HTMLButtonElement, Props>(function Button({ variant = "secondary", className = "", type = "button", ...props }, ref) {
  return <button {...props} ref={ref} type={type} className={`button button-${variant} ${className}`.trim()} />;
});
