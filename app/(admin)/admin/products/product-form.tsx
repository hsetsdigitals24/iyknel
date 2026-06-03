"use client";

import Image from "next/image";
import { useFormState, useFormStatus } from "react-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { FormState } from "@/lib/validation";

export type ProductFormData = {
  id?: string;
  sku: string;
  name: string;
  description: string;
  priceNaira: string;
  weightGrams: number;
  unitsPerCarton: number | null;
  stockCartons: number;
  stockLoosePieces: number;
  categoryName: string;
  active: boolean;
  images: string[];
  imageUrls?: string[];
};

type Props = {
  mode: "create" | "edit";
  initial?: ProductFormData;
  categories: string[];
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
};

export function ProductForm({ initial, categories, action }: Props) {
  const [state, formAction] = useFormState(action, null);
  const [keptImages, setKeptImages] = useState<string[]>(initial?.images ?? []);
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  function toggleRemove(url: string) {
    setKeptImages((prev) => (prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url]));
  }

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
          id="sku"
          label="SKU"
          defaultValue={initial?.sku}
          error={fieldErrors?.sku?.[0]}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={initial?.description}
          rows={4}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Field
          id="priceNaira"
          label="Price per piece (₦)"
          type="number"
          step="0.01"
          defaultValue={initial?.priceNaira}
          error={fieldErrors?.priceNaira?.[0]}
          required
        />
        <Field
          id="weightGrams"
          label="Weight per piece (grams)"
          type="number"
          step="1"
          defaultValue={initial?.weightGrams}
          error={fieldErrors?.weightGrams?.[0]}
          required
        />
        <Field
          id="unitsPerCarton"
          label="Units per carton"
          type="number"
          step="1"
          defaultValue={initial?.unitsPerCarton ?? ""}
          error={fieldErrors?.unitsPerCarton?.[0]}
          placeholder="Blank if sold by piece only"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          id="stockCartons"
          label="Stock — whole cartons"
          type="number"
          step="1"
          defaultValue={initial?.stockCartons ?? 0}
          error={fieldErrors?.stockCartons?.[0]}
          required
        />
        <Field
          id="stockLoosePieces"
          label="Stock — loose pieces"
          type="number"
          step="1"
          defaultValue={initial?.stockLoosePieces ?? 0}
          error={fieldErrors?.stockLoosePieces?.[0]}
          required
        />
      </div>
      <p className="-mt-3 text-xs text-muted-foreground">
        Leave units-per-carton blank for piece-only products. Loose pieces are the units from an
        opened carton.
      </p>

      <div className="space-y-2">
        <Label htmlFor="categoryName">Category</Label>
        <Input
          id="categoryName"
          name="categoryName"
          list="category-list"
          defaultValue={initial?.categoryName}
          placeholder="Type to find or create"
        />
        <datalist id="category-list">
          {categories.map((c) => (
            <option value={c} key={c} />
          ))}
        </datalist>
      </div>

      <div className="space-y-2">
        <Label htmlFor="images">Add images</Label>
        <Input id="images" name="images" type="file" accept="image/*" multiple />
        <p className="text-xs text-muted-foreground">JPG, PNG, or WEBP. Up to 5 MB each.</p>
      </div>

      {initial?.images && initial.images.length > 0 && (
        <div className="space-y-2">
          <Label>Current images</Label>
          <div className="grid grid-cols-3 gap-3 md:grid-cols-5">
            {initial.images.map((key, idx) => {
              const willRemove = !keptImages.includes(key);
              const previewUrl = initial.imageUrls?.[idx] ?? key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleRemove(key)}
                  className={`relative aspect-square overflow-hidden rounded-md border ${
                    willRemove ? "opacity-30 ring-2 ring-destructive" : ""
                  }`}
                >
                  <Image
                    src={previewUrl}
                    alt=""
                    fill
                    sizes="(min-width: 768px) 160px, 33vw"
                    className="object-cover"
                  />
                  {willRemove && (
                    <span className="absolute inset-0 flex items-center justify-center bg-destructive/30 text-xs font-semibold text-destructive-foreground">
                      Remove
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {initial.images
            .filter((u) => !keptImages.includes(u))
            .map((u) => (
              <input key={u} type="hidden" name="removeImages" value={u} />
            ))}
          <p className="text-xs text-muted-foreground">Click an image to mark it for removal.</p>
        </div>
      )}

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="active"
          defaultChecked={initial?.active ?? true}
          className="h-4 w-4 rounded border-input"
        />
        Visible in catalog
      </label>

      {state && !state.ok && !fieldErrors && (
        <p className="text-sm text-destructive">{state.message}</p>
      )}

      <SubmitButton />
    </form>
  );
}

function Field({
  id,
  label,
  error,
  type = "text",
  step,
  defaultValue,
  required,
  placeholder,
}: {
  id: string;
  label: string;
  error?: string;
  type?: string;
  step?: string;
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
        step={step}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
        aria-invalid={!!error}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <div className="flex justify-end">
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save product"}
      </Button>
    </div>
  );
}
