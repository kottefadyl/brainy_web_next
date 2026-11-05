import type { ReactNode } from "react";

type Props = { title: string; description: string; icon?: ReactNode; action?: ReactNode; className?: string };

export function EmptyState({ title, description, icon, action, className = "" }: Props) {
  return <div className={`ui-empty-state ${className}`.trim()}>{icon}<strong>{title}</strong><p>{description}</p>{action}</div>;
}
