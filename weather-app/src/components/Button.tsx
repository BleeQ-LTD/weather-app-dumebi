import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
  // primary: the one main action on a screen
  // secondary: outlined, for everything else (the default)
  // ghost: no outline, for low-emphasis actions
  variant?: ButtonVariant;
  // Shown before the label; give it aria-hidden so the label is read once
  icon?: ReactNode;
  children: ReactNode;
}

function Button({
  variant = "secondary",
  icon,
  type = "button",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button type={type} className={`btn btn-${variant}`} {...rest}>
      {icon}
      <span>{children}</span>
    </button>
  );
}

export default Button;
