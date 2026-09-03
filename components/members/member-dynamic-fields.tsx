"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { MemberFormFieldConfiguration, MemberFormFieldKey } from "@/lib/members/member-form-config";

const fieldClass = "space-y-1.5 text-sm font-medium";

export function MemberDynamicFields({
  fields,
  values,
  errors,
  register,
  setValue,
}: {
  fields: MemberFormFieldConfiguration[];
  values: Partial<Record<MemberFormFieldKey, string | number | null | undefined>>;
  errors?: Partial<Record<MemberFormFieldKey, string | undefined>>;
  register: (name: MemberFormFieldKey) => Record<string, unknown>;
  setValue?: (name: MemberFormFieldKey, value: string) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {fields.map((field) => {
        const message = errors?.[field.key];
        const className = cn(fieldClass, field.fullWidth && "md:col-span-2 xl:col-span-3");
        if (field.input === "select") {
          return (
            <label key={field.key} className={className}>
              <span>{field.label}{field.required ? " *" : ""}</span>
              <select {...register(field.key)} className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">Select</option>
                {field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              {message ? <p className="text-xs text-red-600">{message}</p> : null}
            </label>
          );
        }

        if (field.input === "textarea") {
          return (
            <label key={field.key} className={className}>
              <span>{field.label}{field.required ? " *" : ""}</span>
              <textarea
                {...register(field.key)}
                defaultValue={typeof values[field.key] === "string" ? String(values[field.key]) : ""}
                placeholder={field.placeholder}
                className="mt-1.5 min-h-24 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30"
              />
              {message ? <p className="text-xs text-red-600">{message}</p> : null}
            </label>
          );
        }

        if (field.input === "tel" && setValue) {
          return (
            <label key={field.key} className={className}>
              <span>{field.label}{field.required ? " *" : ""}</span>
              <div className="mt-1.5 flex items-center rounded-lg border bg-background">
                <span className="border-r px-3 text-sm text-muted-foreground">+91</span>
                <Input
                  value={String(values[field.key] ?? "").replace(/^\+91/, "")}
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder={field.placeholder ?? "9876543210"}
                  className="border-0 focus-visible:ring-0"
                  onChange={(event) => setValue(field.key, event.target.value.replace(/\D/g, "").slice(0, 10))}
                />
              </div>
              {message ? <p className="text-xs text-red-600">{message}</p> : null}
            </label>
          );
        }

        return (
          <label key={field.key} className={className}>
            <span>{field.label}{field.required ? " *" : ""}</span>
            <Input
              {...register(field.key)}
              type={field.input === "number" ? "number" : field.input}
              min={field.input === "number" ? "0" : undefined}
              step={field.key === "height_cm" || field.key === "weight_kg" ? "0.1" : undefined}
              placeholder={field.placeholder}
            />
            {message ? <p className="text-xs text-red-600">{message}</p> : null}
          </label>
        );
      })}
    </div>
  );
}
