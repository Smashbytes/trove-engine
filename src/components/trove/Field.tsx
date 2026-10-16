import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type ControlProps = {
  id?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

const CONTROL_TAGS = new Set(["input", "select", "textarea"]);

/** True for a child we can wire directly: a DOM control or a ui control component. */
function isDirectControl(child: ReactElement) {
  if (typeof child.type === "string") return CONTROL_TAGS.has(child.type);
  const name =
    (child.type as { displayName?: string; name?: string }).displayName ??
    (child.type as { name?: string }).name ??
    "";
  return /^(Input|Textarea|SelectTrigger)$/.test(name);
}

/**
 * Labelled form field. Links the label to its control (htmlFor/id) and any
 * hint or error to it via aria-describedby, so clicking the label focuses the
 * input and screen readers announce the label and the error.
 *
 * - A single control child (Input, Textarea, native select…) is wired directly.
 * - Composite children (icon + input, custom widgets) are wired after mount by
 *   finding the first input/select/textarea inside.
 */
export function Field({
  label,
  children,
  hint,
  error,
  className,
  labelClassName,
}: {
  label: string;
  children: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  className?: string;
  labelClassName?: string;
}) {
  const autoId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const single =
    Children.count(children) === 1 && isValidElement(children) && isDirectControl(children)
      ? (children as ReactElement<ControlProps>)
      : null;

  const [foundId, setFoundId] = useState<string | undefined>(undefined);
  const controlId = single ? single.props.id || autoId : foundId;
  const hintId = hint ? `${autoId}-hint` : undefined;
  const errorId = error ? `${autoId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  // Composite children: find the real control and give it an id + aria links.
  useEffect(() => {
    if (single) return;
    // Radix Select renders a visible combobox button plus a hidden native
    // <select>; the button is the one users (and the label) interact with.
    const el = containerRef.current?.querySelector<HTMLElement>(
      'button[role="combobox"], input:not([type="hidden"]):not([aria-hidden="true"]), select:not([aria-hidden="true"]), textarea',
    );
    if (!el) return;
    if (!el.id) el.id = autoId;
    if (describedBy) el.setAttribute("aria-describedby", describedBy);
    else el.removeAttribute("aria-describedby");
    if (error) el.setAttribute("aria-invalid", "true");
    else el.removeAttribute("aria-invalid");
    setFoundId(el.id);
    // `children` is a dependency so a swapped-out control gets re-linked.
  }, [single, autoId, describedBy, error, children]);

  const control = single
    ? cloneElement(single, {
        id: controlId,
        "aria-invalid": error ? true : single.props["aria-invalid"],
        "aria-describedby":
          [single.props["aria-describedby"], describedBy].filter(Boolean).join(" ") || undefined,
      })
    : children;

  return (
    <div ref={containerRef} className={cn("space-y-2", className)}>
      <Label htmlFor={controlId} className={labelClassName}>
        {label}
      </Label>
      {control}
      {hint && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
