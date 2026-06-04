"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import type { FormState } from "@/lib/validation";
import { AppError, friendlyError } from "@/lib/errors";

const vehicleSchema = z.object({
  name: z.string().min(2).max(80),
  tonnageKg: z.coerce.number().int().positive().max(100_000),
  fuelPerKm: z.string().regex(/^\d+(\.\d{1,3})?$/, "e.g. 0.301"),
  sortOrder: z.coerce.number().int().min(0).max(1000),
  active: z.coerce.boolean().optional().default(true),
});

const bandSchema = z.object({
  label: z.string().min(2).max(40),
  minKm: z.coerce.number().int().min(0).max(10_000),
  maxKm: z.coerce.number().int().min(0).max(10_000),
  sortOrder: z.coerce.number().int().min(0).max(1000),
  active: z.coerce.boolean().optional().default(true),
});

const costSchema = z.object({
  vehicleId: z.string().min(1),
  distanceBandId: z.string().min(1),
  costNaira: z.coerce.number().nonnegative().max(100_000_000),
});

function bump() {
  revalidatePath("/admin/logistics");
}

function parseFormState(parsed: z.SafeParseReturnType<unknown, unknown>): FormState {
  if (parsed.success) return null;
  return { ok: false, message: friendlyError(parsed.error) };
}

export async function createVehicleAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  const parsed = vehicleSchema.safeParse({
    name: formData.get("name"),
    tonnageKg: formData.get("tonnageKg"),
    fuelPerKm: formData.get("fuelPerKm"),
    sortOrder: formData.get("sortOrder") ?? 100,
    active: formData.get("active") === "on",
  });
  if (!parsed.success) return parseFormState(parsed);
  await db.vehicle.create({ data: parsed.data });
  bump();
  return { ok: true, message: "Vehicle added." };
}

export async function updateVehicleAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  const parsed = vehicleSchema.safeParse({
    name: formData.get("name"),
    tonnageKg: formData.get("tonnageKg"),
    fuelPerKm: formData.get("fuelPerKm"),
    sortOrder: formData.get("sortOrder"),
    active: formData.get("active") === "on",
  });
  if (!parsed.success) return parseFormState(parsed);
  await db.vehicle.update({ where: { id }, data: parsed.data });
  bump();
  return { ok: true };
}

export async function createBandAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  const parsed = bandSchema.safeParse({
    label: formData.get("label"),
    minKm: formData.get("minKm"),
    maxKm: formData.get("maxKm"),
    sortOrder: formData.get("sortOrder") ?? 100,
    active: formData.get("active") === "on",
  });
  if (!parsed.success) return parseFormState(parsed);
  await db.distanceBand.create({ data: parsed.data });
  bump();
  return { ok: true, message: "Band added." };
}

export async function updateBandAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  const parsed = bandSchema.safeParse({
    label: formData.get("label"),
    minKm: formData.get("minKm"),
    maxKm: formData.get("maxKm"),
    sortOrder: formData.get("sortOrder"),
    active: formData.get("active") === "on",
  });
  if (!parsed.success) return parseFormState(parsed);
  await db.distanceBand.update({ where: { id }, data: parsed.data });
  bump();
  return { ok: true };
}

export async function createVehicleFormAction(formData: FormData): Promise<void> {
  await createVehicleAction(null, formData);
}

export async function createBandFormAction(formData: FormData): Promise<void> {
  await createBandAction(null, formData);
}

export async function updateVehicleFormAction(id: string, formData: FormData): Promise<void> {
  await updateVehicleAction(id, null, formData);
}

export async function updateBandFormAction(id: string, formData: FormData): Promise<void> {
  await updateBandAction(id, null, formData);
}

export async function deleteVehicleAction(id: string): Promise<void> {
  await requireAdmin();
  const inUse = await db.logisticsCost.count({ where: { vehicleId: id } });
  if (inUse > 0) {
    throw new AppError("Vehicle has cost rows. Clear matrix or deactivate instead.");
  }
  await db.vehicle.delete({ where: { id } });
  bump();
}

export async function deleteBandAction(id: string): Promise<void> {
  await requireAdmin();
  const inUse = await db.logisticsCost.count({ where: { distanceBandId: id } });
  if (inUse > 0) {
    throw new AppError("Band has cost rows. Clear matrix or deactivate instead.");
  }
  await db.distanceBand.delete({ where: { id } });
  bump();
}

export async function updateCostAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const parsed = costSchema.safeParse({
    vehicleId: formData.get("vehicleId"),
    distanceBandId: formData.get("distanceBandId"),
    costNaira: formData.get("costNaira"),
  });
  if (!parsed.success) return;
  const costKobo = Math.round(parsed.data.costNaira * 100);
  await db.logisticsCost.upsert({
    where: {
      vehicleId_distanceBandId: {
        vehicleId: parsed.data.vehicleId,
        distanceBandId: parsed.data.distanceBandId,
      },
    },
    update: { costKobo },
    create: { vehicleId: parsed.data.vehicleId, distanceBandId: parsed.data.distanceBandId, costKobo },
  });
  bump();
}
