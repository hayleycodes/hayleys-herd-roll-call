import "./Button.css";

type ButtonProps = {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  variant?: "default" | "danger" | "success";
  "aria-label"?: string;
};

const Button = ({
  children,
  onClick,
  type = "button",
  disabled = false,
  variant = "default",
  "aria-label": ariaLabel,
}: ButtonProps) => {
  return (
    <button
      className={`btn btn--outline${variant !== "default" ? ` btn--${variant}` : ""}`}
      onClick={onClick}
      type={type}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
};

export default Button;
