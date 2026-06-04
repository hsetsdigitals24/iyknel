"use client";

import Image from "next/image";
import { useState } from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { FormState } from "@/lib/validation";

export type CategoryFormData = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  sortOrder: number;
  active: boolean;
  image: string | null;
  imageUrl: string | null;
};

type Props = {
  mode: "create" | "edit";
  initial?: CategoryFormData;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
};

export function CategoryForm({ mode, initial, action }: Props) {
  const [state, formAction] = useFormState(action, null);
  const [removeImage, setRemoveImage] = useState(false);
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  const hasExistingImage = !!initial?.imageUrl;

  return (
    <form action={formAction} className="space-y-6" encType="multipart/form-data">
      <div className="grid gap-4 md:grid-cols-2">
        <Field
          id="name"
          label="Name"
          defaultValue={initial?.name}
          error={fieldErrors?.name?.[0]}
          required
        />
        <Field
          id="slug"
          label="Slug"
          defaultValue={initial?.slug}
          placeholder="Leave blank to auto-generate"
          error={fieldErrors?.slug?.[0]}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={initial?.description}
          placeholder="Short blurb shown on the category header (optional)."
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          id="sortOrder"
          label="Sort order"
          type="number"
          defaultValue={initial?.sortOrder ?? 100}
          error={fieldErrors?.sortOrder?.[0]}
          required
        />
        <label className="mt-7 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="active"
            defaultChecked={initial?.active ?? true}
            className="h-4 w-4 rounded border-input"
          />
          Visible on the public catalog
        </label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="image">{hasExistingImage ? "Replace image" : "Image"}</Label>
        <Input id="image" name="image" type="file" accept="image/*" />
        <p className="text-xs text-muted-foreground">JPG, PNG, or WEBP. Up to 5 MB.</p>
      </div>

      {hasExistingImage && (
        <div className="space-y-2">
          <Label>Current image</Label>
          <div className="grid grid-cols-3 md:grid-cols-5">
            <div
              className={`relative aspect-square overflow-hidden rounded-md border ${
                removeImage ? "opacity-40 ring-2 ring-destructive" : ""
              }`}
            >
              <Image
                src={initial!.imageUrl!}
                alt=""
                fill
                sizes="(min-width: 768px) 160px, 33vw"
                className="object-cover"
              />
              {removeImage && (
                <span className="absolute inset-x-0 bottom-0 bg-destructive px-2 py-1 text-center text-[10px] font-semibold uppercase tracking-wider text-destructive-foreground">
                  Will remove on save
                </span>
              )}
              <button
                type="button"
                onClick={() => setRemoveImage((r) => !r)}
                aria-label={removeImage ? "Undo remove" : "Remove image"}
                title={removeImage ? "Undo remove" : "Remove image"}
                className={`absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full shadow ring-1 ring-border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  removeImage
                    ? "bg-background text-foreground hover:bg-secondary"
                    : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                }`}
              >
                {removeImage ? <RotateCcw className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {removeImage && <input type="hidden" name="removeImage" value="1" />}
        </div>
      )}

      {state && !state.ok && !fieldErrors && (
        <p className="text-sm text-destructive">{state.message}</p>
      )}
      {state && state.ok && state.message && (
        <p className="text-sm text-success">{state.message}</p>
      )}

      <SubmitButton mode={mode} />
    </form>
  );
}

function Field({
  id,
  label,
  error,
  type = "text",
  defaultValue,
  required,
  placeholder,
}: {
  id: string;
  label: string;
  error?: string;
  type?: string;
  defaultValue?: string | number;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={id}
        type={type}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
        aria-invalid={!!error}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function SubmitButton({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus();
  return (
    <div className="flex justify-end">
      <Button type="submit" disabled={pending}>
        {pending
          ? mode === "create"
            ? "Creating…"
            : "Saving…"
          : mode === "create"
            ? "Create category"
            : "Save category"}
      </Button>
    </div>
  );
}
