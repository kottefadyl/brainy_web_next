// One icon per field type, beside the type name (entry form, entry details).
import { AlignLeft, Box, CalendarClock, CalendarDays, CaseSensitive, CircleDot, Clock, Hash, Heading, Link2, ListChecks, Map, MapPin, Paperclip, Ruler, SquareCheck, Tags, Timer, Type, Users, type LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  TITLE: Heading, TEXT: Type, LONG_TEXT: AlignLeft, NUMBER: Hash, DATE: CalendarDays, TIME: Clock, DATETIME: CalendarClock,
  DURATION: Timer, LINK: Link2, CHARACTER: CaseSensitive, BOOLEAN: SquareCheck, SELECT: CircleDot, MULTI_SELECT: ListChecks,
  ATTACHMENT: Paperclip, OBJECT_REF: Box, COLLABORATOR: Users, MEASURE: Ruler, POSITION: MapPin, ZONE: Map, CODE: Tags,
};

export function FieldKindIcon({ kind, size = 13 }: { kind: string; size?: number }) {
  const Icon = ICONS[kind] ?? Type;
  return <Icon size={size} aria-hidden="true" className="field-kind-icon" />;
}
