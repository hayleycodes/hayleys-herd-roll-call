import "./EmojiButton.css";

type EmojiButtonProps = {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
  size?: "sm" | "md" | "lg";
  shape?: "square" | "circle";
  variant?: "default" | "pig";
  style?: React.CSSProperties;
};

const EmojiButton = ({
  children,
  onClick,
  disabled = false,
  className,
  "aria-label": ariaLabel,
  size = "md",
  shape = "square",
  variant = "default",
  style,
}: EmojiButtonProps) => {
  return (
    <button
      className={`emoji-btn emoji-btn--${size} emoji-btn--${shape} emoji-btn--${variant}${className ? ` ${className}` : ""}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      type="button"
      style={style}
    >
      {children}
    </button>
  );
};

export default EmojiButton;
