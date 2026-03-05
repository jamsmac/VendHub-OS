interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  className?: string;
  id?: string;
}

export default function SectionHeader({
  title,
  subtitle,
  className = "",
  id,
}: SectionHeaderProps) {
  return (
    <div
      id={id}
      className={["text-center mb-12", className].filter(Boolean).join(" ")}
    >
      <h2 className="font-display text-3xl sm:text-4xl font-bold text-espresso-dark">
        {title}
      </h2>
      {subtitle && (
        <p className="font-body text-lg text-chocolate/60 mt-2">{subtitle}</p>
      )}
    </div>
  );
}
