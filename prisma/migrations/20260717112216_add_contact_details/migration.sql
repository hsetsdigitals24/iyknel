-- AlterTable
ALTER TABLE "SiteSetting" ADD COLUMN     "contactAddressLga" TEXT NOT NULL DEFAULT 'Alimosho LGA',
ADD COLUMN     "contactAddressLine1" TEXT NOT NULL DEFAULT 'Plot 10 Abesan Estate Road',
ADD COLUMN     "contactAddressLine2" TEXT NOT NULL DEFAULT 'Abesan Estate, Ipaja',
ADD COLUMN     "contactAddressState" TEXT NOT NULL DEFAULT 'Lagos',
ADD COLUMN     "contactEmail" TEXT NOT NULL DEFAULT 'info@iyknel.com',
ADD COLUMN     "contactPhones" TEXT NOT NULL DEFAULT '08182806282,08114499558';
