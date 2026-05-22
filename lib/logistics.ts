import { db } from "@/lib/db";

export type VehiclePick = {
  vehicleId: string;
  vehicleName: string;
  tonnageKg: number;
  tripCount: number;
  overflow: boolean;
};

/**
 * Pick the smallest vehicle whose tonnage fits the order weight.
 * If no vehicle fits a single trip, return the largest with tripCount = ceil(weight/tonnage)
 * and overflow = true (flag for admin review).
 */
export async function pickVehicleForWeight(weightGrams: number): Promise<VehiclePick | null> {
  const vehicles = await db.vehicle.findMany({
    where: { active: true },
    orderBy: { tonnageKg: "asc" },
  });
  if (vehicles.length === 0) return null;
  const weightKg = weightGrams / 1000;
  const fit = vehicles.find((v) => v.tonnageKg >= weightKg);
  if (fit) {
    return {
      vehicleId: fit.id,
      vehicleName: fit.name,
      tonnageKg: fit.tonnageKg,
      tripCount: 1,
      overflow: false,
    };
  }
  const largest = vehicles[vehicles.length - 1];
  return {
    vehicleId: largest.id,
    vehicleName: largest.name,
    tonnageKg: largest.tonnageKg,
    tripCount: Math.ceil(weightKg / largest.tonnageKg),
    overflow: true,
  };
}

export async function logisticsCostKobo(
  vehicleId: string,
  distanceBandId: string,
  tripCount = 1,
): Promise<number> {
  const row = await db.logisticsCost.findUnique({
    where: { vehicleId_distanceBandId: { vehicleId, distanceBandId } },
  });
  if (!row) throw new Error("No logistics cost configured for this vehicle/band");
  return row.costKobo * tripCount;
}
