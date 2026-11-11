import "./boolean-checkbox.css";
// T49: a yes/no field is a checkbox. Unchecking keeps "false" only when the field already had a value,
// so an untouched box stays empty (no answer) instead of becoming "no".
export function BooleanCheckbox({ value, onChange, yes, no }: { value: string | undefined; onChange: (next: string) => void; yes: string; no: string }) {
  const checked = value === "true";
  return <span className="boolean-check">
    <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked ? "true" : value ? "false" : "")} />
    <span aria-hidden="true">{checked ? yes : value === "false" ? no : "—"}</span>
  </span>;
}
