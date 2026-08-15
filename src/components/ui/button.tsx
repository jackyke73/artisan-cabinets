import { cn } from "@/lib/utils";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({ variant = "primary", className, ...props }: Props) {
  const styles = {
    primary: "bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-50",
    secondary: "bg-white border border-border text-foreground hover:bg-muted disabled:opacity-50",
    ghost: "text-slate-700 hover:bg-muted disabled:opacity-50",
  }[variant];
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed",
        styles,
        className,
      )}
      {...props}
    />
  );
}
