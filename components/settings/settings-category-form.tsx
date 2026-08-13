"use client";

import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  addCategoryAction,
  deactivateCategoryAction,
  type SettingsActionState,
} from "@/app/actions/settings-actions";

interface CategoryRow {
  id: string;
  name: string;
  code: string | null;
  status: string;
}

export function SettingsCategoryForm({
  kind,
  rows,
}: {
  kind: "income" | "expense";
  rows: CategoryRow[];
}) {
  const title = kind === "income" ? "Income Categories" : "Expense Categories";

  const [addState, addAction, addPending] = useActionState<SettingsActionState, FormData>(
    addCategoryAction,
    {},
  );
  const [deactivateState, deactivateAction] = useActionState<SettingsActionState, FormData>(
    deactivateCategoryAction,
    {},
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {kind === "income"
            ? "Categories used when recording income entries."
            : "Categories used when recording expense entries."}
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Add category form */}
        <form action={addAction} className="flex flex-wrap gap-3">
          <input type="hidden" name="kind" value={kind} />
          <input
            name="name"
            required
            placeholder="Category name *"
            className="h-10 flex-1 min-w-48 rounded-lg border bg-background px-3 text-sm"
          />
          <input
            name="code"
            placeholder="Short code (optional)"
            className="h-10 w-32 rounded-lg border bg-background px-3 text-sm"
          />
          <Button type="submit" size="sm" disabled={addPending}>
            {addPending && <LoaderCircle className="size-3.5 animate-spin" />}
            Add category
          </Button>
        </form>

        {addState.error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{addState.error}</p>
        )}
        {addState.success && (
          <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
            ✓ {addState.success}
          </p>
        )}
        {deactivateState.error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{deactivateState.error}</p>
        )}

        {/* Category list */}
        <div className="divide-y">
          {rows.map((row) => (
            <div key={row.id} className="flex items-center gap-3 py-3">
              <div className="flex-1">
                <p className="font-medium">{row.name}</p>
                <p className="text-xs text-muted-foreground">{row.code ?? "No code"}</p>
              </div>
              <Badge variant={row.status === "active" ? "success" : "outline"}>
                {row.status}
              </Badge>
              {row.status === "active" && (
                <form action={deactivateAction}>
                  <input type="hidden" name="kind" value={kind} />
                  <input type="hidden" name="id" value={row.id} />
                  <Button variant="outline" size="sm" type="submit">
                    Deactivate
                  </Button>
                </form>
              )}
            </div>
          ))}
          {rows.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No categories yet. Add one above.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
