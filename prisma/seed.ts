import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const db = new PrismaClient();

// Realistic FMCG products for the Nigerian market. Prices are local-market rough
// estimates for testing only — not authoritative.

function seedSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function unsplashUrl(_keyword: string): string {
  return "/placeholders/product.svg";
}

 

async function main() {
   

  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    console.log(`Seeding admin user ${adminEmail}…`);
    const passwordHash = await hash(adminPassword, 10);
    await db.user.upsert({
      where: { email: adminEmail },
      update: { role: "SUPER_ADMIN" },
      create: {
        email: adminEmail,
        role: "SUPER_ADMIN",
        name: "Admin",
        passwordHash,
      },
    });
  } else {
    console.warn("SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set — skipping admin user.");
  }

  // Bank transfer details are DB-backed and admin-editable. Backfill the
  // singleton from the legacy BANK_* env vars only when the stored fields are
  // still empty, so re-seeding never clobbers values entered in the back office.
  const settings = await db.siteSetting.upsert({
    where: { id: "singleton" },
    create: { id: "singleton" },
    update: {},
  });
  const bankBackfill: {
    bankName?: string;
    bankAccountName?: string;
    bankAccountNumber?: string;
  } = {};
  if (!settings.bankName && process.env.BANK_NAME) {
    bankBackfill.bankName = process.env.BANK_NAME;
  }
  if (!settings.bankAccountName && process.env.BANK_ACCOUNT_NAME) {
    bankBackfill.bankAccountName = process.env.BANK_ACCOUNT_NAME;
  }
  if (!settings.bankAccountNumber && process.env.BANK_ACCOUNT_NUMBER) {
    bankBackfill.bankAccountNumber = process.env.BANK_ACCOUNT_NUMBER;
  }
  if (Object.keys(bankBackfill).length > 0) {
    console.log("Backfilling bank details from BANK_* env vars…");
    await db.siteSetting.update({ where: { id: "singleton" }, data: bankBackfill });
  }

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
