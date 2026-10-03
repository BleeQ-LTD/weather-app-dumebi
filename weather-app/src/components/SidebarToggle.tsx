interface SidebarToggleProps {
  open: boolean;
  onToggle: () => void;
}

// The "sidebar" icon: a rounded window with a panel line on the left
function SidebarToggle({ open, onToggle }: SidebarToggleProps) {
  const label = open ? "Hide sidebar" : "Show sidebar";

  return (
    <button
      type="button"
      className="icon-button"
      onClick={onToggle}
      aria-label={label}
      aria-expanded={open}
      title={label}
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="5" width="18" height="14" rx="3" />
        <line x1="9" y1="5" x2="9" y2="19" />
      </svg>
    </button>
  );
}

export default SidebarToggle;
