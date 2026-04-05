import "./input.css";

type InputProps = {
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email" | "password";
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  name: string;
};

const Input = ({
  value,
  onChange,
  type = "text",
  placeholder,
  disabled = false,
  required = false,
  name,
}: InputProps) => {
  return (
    <input
      className="input"
      type={type}
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      name={name}
    />
  );
};

export default Input;
