import { db } from "@/lib/db";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  createBandFormAction,
  createVehicleFormAction,
  deleteBandAction,
  deleteVehicleAction,
  updateBandFormAction,
  updateCostAction,
  updateVehicleFormAction,
} from "./actions";
import { ConfirmDeleteButton } from "./row-controls";

export default async function LogisticsPage() {
  const [vehicles, bands, costs] = await Promise.all([
    db.vehicle.findMany({ orderBy: { sortOrder: "asc" } }),
    db.distanceBand.findMany({ orderBy: { sortOrder: "asc" } }),
    db.logisticsCost.findMany(),
  ]);

  const costMap = new Map(
    costs.map((c) => [`${c.vehicleId}__${c.distanceBandId}`, c.costKobo]),
  );

  return (
    <div className="space-y-10">
      <header>
        <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Logistics
        </span>
        <h1 className="font-serif text-3xl">Vehicles, bands &amp; cost matrix</h1>
        <p className="text-sm text-muted-foreground">
          Changes here affect future invoices only. Existing invoices keep their snapshotted
          totals.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="font-serif text-xl">Vehicles</h2>
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Tonnage (kg)</TableHead>
                <TableHead className="text-right">Fuel/km</TableHead>
                <TableHead className="text-right">Sort</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="w-[140px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicles.map((v) => (
                <TableRow key={v.id}>
                  <TableCell>
                    <form
                      id={`vehicle-${v.id}`}
                      action={updateVehicleFormAction.bind(null, v.id)}
                      className="contents"
                    />
                    <Input
                      form={`vehicle-${v.id}`}
                      name="name"
                      defaultValue={v.name}
                      className="h-8"
                      required
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      form={`vehicle-${v.id}`}
                      name="tonnageKg"
                      type="number"
                      defaultValue={v.tonnageKg}
                      className="h-8 text-right tabular-nums"
                      required
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      form={`vehicle-${v.id}`}
                      name="fuelPerKm"
                      defaultValue={String(v.fuelPerKm)}
                      className="h-8 text-right tabular-nums"
                      required
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      form={`vehicle-${v.id}`}
                      name="sortOrder"
                      type="number"
                      defaultValue={v.sortOrder}
                      className="h-8 text-right tabular-nums"
                      required
                    />
                  </TableCell>
                  <TableCell>
                    <input
                      form={`vehicle-${v.id}`}
                      type="checkbox"
                      name="active"
                      defaultChecked={v.active}
                      className="h-4 w-4 rounded border-input"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Button form={`vehicle-${v.id}`} type="submit" size="sm">
                        Save
                      </Button>
                      <form action={deleteVehicleAction.bind(null, v.id)}>
                        <ConfirmDeleteButton label={`Delete ${v.name}`} />
                      </form>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <details className="rounded-md border p-4">
          <summary className="cursor-pointer text-sm font-medium">Add vehicle</summary>
          <form action={createVehicleFormAction} className="mt-3 grid gap-3 md:grid-cols-2">
            <Field id="name" label="Name" required />
            <Field id="tonnageKg" label="Tonnage (kg)" type="number" required />
            <Field id="fuelPerKm" label="Fuel/km" defaultValue="0.300" required />
            <Field id="sortOrder" label="Sort order" type="number" defaultValue="100" required />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="active" defaultChecked />
              Active
            </label>
            <div className="md:col-span-2">
              <Button type="submit" size="sm">
                Add vehicle
              </Button>
            </div>
          </form>
        </details>
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-xl">Distance bands</h2>
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Label</TableHead>
                <TableHead className="text-right">Min km</TableHead>
                <TableHead className="text-right">Max km</TableHead>
                <TableHead className="text-right">Sort</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="w-[140px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {bands.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>
                    <form
                      id={`band-${b.id}`}
                      action={updateBandFormAction.bind(null, b.id)}
                      className="contents"
                    />
                    <Input
                      form={`band-${b.id}`}
                      name="label"
                      defaultValue={b.label}
                      className="h-8"
                      required
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      form={`band-${b.id}`}
                      name="minKm"
                      type="number"
                      defaultValue={b.minKm}
                      className="h-8 text-right tabular-nums"
                      required
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      form={`band-${b.id}`}
                      name="maxKm"
                      type="number"
                      defaultValue={b.maxKm}
                      className="h-8 text-right tabular-nums"
                      required
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      form={`band-${b.id}`}
                      name="sortOrder"
                      type="number"
                      defaultValue={b.sortOrder}
                      className="h-8 text-right tabular-nums"
                      required
                    />
                  </TableCell>
                  <TableCell>
                    <input
                      form={`band-${b.id}`}
                      type="checkbox"
                      name="active"
                      defaultChecked={b.active}
                      className="h-4 w-4 rounded border-input"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Button form={`band-${b.id}`} type="submit" size="sm">
                        Save
                      </Button>
                      <form action={deleteBandAction.bind(null, b.id)}>
                        <ConfirmDeleteButton label={`Delete ${b.label}`} />
                      </form>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <details className="rounded-md border p-4">
          <summary className="cursor-pointer text-sm font-medium">Add distance band</summary>
          <form action={createBandFormAction} className="mt-3 grid gap-3 md:grid-cols-2">
            <Field id="label" label="Label (e.g. 60-80km)" required />
            <div className="grid grid-cols-2 gap-3">
              <Field id="minKm" label="Min km" type="number" required />
              <Field id="maxKm" label="Max km" type="number" required />
            </div>
            <Field id="sortOrder" label="Sort order" type="number" defaultValue="100" required />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="active" defaultChecked />
              Active
            </label>
            <div className="md:col-span-2">
              <Button type="submit" size="sm">
                Add band
              </Button>
            </div>
          </form>
        </details>
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-xl">Cost matrix (₦)</h2>
        <p className="text-xs text-muted-foreground">
          Press Tab/Enter after editing a cell to save it.
        </p>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-3 py-2 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  Band ＼ Vehicle
                </th>
                {vehicles.map((v) => (
                  <th
                    key={v.id}
                    className="px-3 py-2 text-right text-xs uppercase tracking-wide text-muted-foreground"
                  >
                    {v.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bands.map((b) => (
                <tr key={b.id} className="border-b last:border-0">
                  <th className="px-3 py-2 text-left font-medium">{b.label}</th>
                  {vehicles.map((v) => {
                    const kobo = costMap.get(`${v.id}__${b.id}`) ?? 0;
                    return (
                      <td key={v.id} className="px-2 py-2 text-right">
                        <form action={updateCostAction} className="inline">
                          <input type="hidden" name="vehicleId" value={v.id} />
                          <input type="hidden" name="distanceBandId" value={b.id} />
                          <input
                            type="number"
                            name="costNaira"
                            step="0.01"
                            min={0}
                            defaultValue={(kobo / 100).toFixed(2)}
                            onBlur={undefined}
                            className="h-8 w-28 rounded border border-input bg-transparent px-2 text-right tabular-nums focus:outline-none focus:ring-1 focus:ring-ring"
                          />
                        </form>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">
          Inputs submit on form action — press Enter inside a cell to save.
        </p>
      </section>
    </div>
  );
}

function Field({
  id,
  label,
  type = "text",
  defaultValue,
  required,
}: {
  id: string;
  label: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} type={type} defaultValue={defaultValue} required={required} />
    </div>
  );
}
