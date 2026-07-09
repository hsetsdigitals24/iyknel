import type { SiteSetting } from "@prisma/client";

import { db } from "@/lib/db";
import { formatNaira } from "@/lib/utils";

const SINGLETON_ID = "singleton";

/**
 * Read the singleton site settings row, creating it with schema defaults on
 * first access so callers never have to handle a null.
 */
export async function getSiteSettings(): Promise<SiteSetting> {
  return db.siteSetting.upsert({
    where: { id: SINGLETON_ID },
    create: { id: SINGLETON_ID },
    update: {},
  });
}

/**
 * Render the free-logistics banner copy, replacing the `{amount}` placeholder
 * with the formatted threshold. Text without the placeholder renders verbatim.
 */
export function renderFreeLogisticsBanner(settings: SiteSetting): string {
  return settings.freeLogisticsBannerText.replaceAll(
    "{amount}",
    formatNaira(settings.freeLogisticsThresholdKobo),
  );
}
