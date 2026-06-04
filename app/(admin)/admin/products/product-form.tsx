"use client";

import Image from "next/image";
import { RotateCcw, Trash2, X } from "lucide-react";
import { useFormState, useFormStatus } from "react-dom";
import { useEffect, useRef, useState } from "react";
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
  featured: boolean;
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

  const imagesInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingUrls, setPendingUrls] = useState<string[]>([]);

  useEffect(() => {
    return () => {
      for (const url of pendingUrls) URL.revokeObjectURL(url);
    };
  }, [pendingUrls]);

  function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    for (const url of pendingUrls) URL.revokeObjectURL(url);
    setPendingFiles(files);
    setPendingUrls(files.map((f) => URL.createObjectURL(f)));
  }

  function removePendingAt(idx: number) {
    const next = pendingFiles.filter((_, i) => i !== idx);
    const url = pendingUrls[idx];
    if (url) URL.revokeObjectURL(url);
    setPendingFiles(next);
    setPendingUrls(pendingUrls.filter((_, i) => i !== idx));
    if (imagesInputRef.current) {
      const dt = new DataTransfer();
      next.forEach((f) => dt.items.add(f));
      imagesInputRef.current.files = dt.files;
    }
  }

  function clearPending() {
    for (const url of pendingUrls) URL.revokeObjectURL(url);
    setPendingFiles([]);
    setPendingUrls([]);
    if (imagesInputRef.current) imagesInputRef.current.value = "";
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
        <Input
          ref={imagesInputRef}
          id="images"
          name="images"
          type="file"
          accept="image/*"
          multiple
          onChange={onPickFiles}
        />
        <p className="text-xs text-muted-foreground">JPG, PNG, or WEBP. Up to 5 MB each.</p>
      </div>

      {pendingFiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Selected to upload</Label>
            <button
              type="button"
              onClick={clearPending}
              className="text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Clear all
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3 md:grid-cols-5">
            {pendingFiles.map((file, idx) => (
              <div
                key={`${file.name}-${idx}`}
                className="relative aspect-square overflow-hidden rounded-md border ring-2 ring-primary/40"
              >
                <Image
                  src={pendingUrls[idx]}
                  alt={file.name}
                  fill
                  sizes="(min-width: 768px) 160px, 33vw"
                  className="object-cover"
                />
                <button
                  type="button"
                  onClick={() => removePendingAt(idx)}
                  aria-label={`Remove ${file.name}`}
                  title={`Remove ${file.name}`}
                  className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-background text-foreground shadow ring-1 ring-border transition hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {initial?.images && initial.images.length > 0 && (
        <div className="space-y-2">
          <Label>Current images</Label>
          <div className="grid grid-cols-3 gap-3 md:grid-cols-5">
            {initial.images.map((key, idx) => {
              const willRemove = !keptImages.includes(key);
              const previewUrl = initial.imageUrls?.[idx] ?? key;
              return (
                <div
                  key={key}
                  className={`group relative aspect-square overflow-hidden rounded-md border ${
                    willRemove ? "opacity-40 ring-2 ring-destructive" : ""
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
                    <span className="absolute inset-x-0 bottom-0 bg-destructive px-2 py-1 text-center text-[10px] font-semibold uppercase tracking-wider text-destructive-foreground">
                      Will remove on save
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => toggleRemove(key)}
                    aria-label={willRemove ? "Undo remove image" : "Remove image"}
                    title={willRemove ? "Undo remove" : "Remove image"}
                    className={`absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full shadow ring-1 ring-border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      willRemove
                        ? "bg-background text-foreground hover:bg-secondary"
                        : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    }`}
                  >
                    {willRemove ? (
                      <RotateCcw className="h-4 w-4" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
          {initial.images
            .filter((u) => !keptImages.includes(u))
            .map((u) => (
              <input key={u} type="hidden" name="removeImages" value={u} />
            ))}
        </div>
      )}

      <div className="flex flex-wrap gap-x-6 gap-y-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="active"
            defaultChecked={initial?.active ?? true}
            className="h-4 w-4 rounded border-input"
          />
          Visible in catalog
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="featured"
            defaultChecked={initial?.featured ?? false}
            className="h-4 w-4 rounded border-input"
          />
          Feature on homepage
        </label>
      </div>

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
