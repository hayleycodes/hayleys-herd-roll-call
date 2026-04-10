import "./Button.css";

type ButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  variant?: "primary" | "secondary";
  className?: string;
};

const Button = ({
  children,
  onClick,
  type = "button",
  disabled = false,
  variant = "primary",
  className,
}: ButtonProps) => {
  return (
    <button
      className={`btn btn--${variant}${className ? ` ${className}` : ""}`}
      onClick={onClick}
      type={type}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export default Button;
