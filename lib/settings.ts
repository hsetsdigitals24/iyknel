import type { SiteSetting } from "@prisma/client";

import { db } from "@/lib/db";
import { formatNaira } from "@/lib/utils";

const SINGLETON_ID = "singleton";

export type BankDetails = { name: string; accountName: string; accountNumber: string };

/**
 * Derive the payee bank details from the singleton settings row. Returns null
 * unless all three fields are present, mirroring the all-or-nothing contract
 * the app relied on when these lived in BANK_* env vars.
 */
export function bankFromSettings(s: SiteSetting): BankDetails | null {
  if (!s.bankName || !s.bankAccountName || !s.bankAccountNumber) return null;
  return {
    name: s.bankName,
    accountName: s.bankAccountName,
    accountNumber: s.bankAccountNumber,
  };
}

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
