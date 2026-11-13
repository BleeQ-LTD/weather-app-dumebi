import type { ButtonHTMLAttributes, ReactNode } from "react";

interface NavItemProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> {
  icon: ReactNode;
  label: string;
  detail?: string; // small line under the label
  trailing?: ReactNode; // for example a chevron
  active?: boolean;
  collapsed?: boolean; // icon only; the label becomes the accessible name
}

// One row of the sidebar
function NavItem({
  icon,
  label,
  detail,
  trailing,
  active = false,
  collapsed = false,
  type = "button",
  ...rest
}: NavItemProps) {
  const classes = ["nav-item", active ? "active" : "", collapsed ? "collapsed" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={type}
      className={classes}
      aria-current={active ? "true" : undefined}
      aria-label={collapsed ? label : undefined}
      title={collapsed ? label : undefined}
      {...rest}
    >
      <span className="nav-icon">{icon}</span>
      {!collapsed && (
        <span className="nav-text">
          <span className="nav-label">{label}</span>
          {detail && <span className="nav-detail">{detail}</span>}
        </span>
      )}
      {!collapsed && trailing}
    </button>
  );
}

export default NavItem;
