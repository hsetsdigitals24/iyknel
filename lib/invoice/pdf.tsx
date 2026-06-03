/* eslint-disable react/no-unescaped-entities */
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#111",
  },
  brand: { fontSize: 18, fontWeight: 700, marginBottom: 2 },
  subtle: { color: "#666" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between" },
  section: { marginTop: 20 },
  label: { fontSize: 8, textTransform: "uppercase", letterSpacing: 1.4, color: "#666" },
  th: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#111",
    paddingBottom: 6,
    marginTop: 4,
  },
  tr: {
    flexDirection: "row",
    paddingVertical: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: "#ddd",
  },
  colName: { flex: 4 },
  colQty: { flex: 1, textAlign: "right" },
  colUnit: { flex: 2, textAlign: "right" },
  colTotal: { flex: 2, textAlign: "right" },
  totalsRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 6 },
  totalsLabel: { width: 110, textAlign: "right", color: "#666" },
  totalsValue: { width: 110, textAlign: "right" },
  grandLabel: { width: 110, textAlign: "right", fontWeight: 700 },
  grandValue: { width: 110, textAlign: "right", fontWeight: 700, fontSize: 12 },
  bankBox: {
    marginTop: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 4,
  },
});

const fmt = (kobo: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(kobo / 100);

export type InvoiceProps = {
  invoiceNumber: string;
  issuedAt: Date;
  business: { name: string; contactName: string; phone: string };
  address: { line1: string; line2: string | null; city: string; state: string } | null;
  items: Array<{
    nameSnapshot: string;
    skuSnapshot: string;
    quantity: number;
    quantityCartons: number;
    quantityPieces: number;
    unitsPerCartonSnap: number | null;
    priceKoboSnap: number;
  }>;
  subtotalKobo: number;
  logisticsKobo: number;
  totalKobo: number;
  weightGrams: number;
  vehicleName: string | null;
  bandLabel: string | null;
  tripCount: number;
  bank: { name: string; accountName: string; accountNumber: string } | null;
};

export function InvoiceDocument(props: InvoiceProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.brand}>Iyknel</Text>
            <Text style={styles.subtle}>Wholesale FMCG · Nigeria</Text>
          </View>
          <View>
            <Text style={styles.label}>Invoice</Text>
            <Text style={{ fontSize: 14, marginTop: 2 }}>{props.invoiceNumber}</Text>
            <Text style={styles.subtle}>
              {props.issuedAt.toLocaleDateString("en-NG", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Bill to</Text>
          <Text>{props.business.name}</Text>
          <Text style={styles.subtle}>
            {props.business.contactName} · {props.business.phone}
          </Text>
          {props.address && (
            <View style={{ marginTop: 4 }}>
              <Text>{props.address.line1}</Text>
              {props.address.line2 ? <Text>{props.address.line2}</Text> : null}
              <Text>
                {props.address.city}, {props.address.state}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.th}>
            <Text style={styles.colName}>Item</Text>
            <Text style={styles.colQty}>Qty</Text>
            <Text style={styles.colUnit}>Unit</Text>
            <Text style={styles.colTotal}>Total</Text>
          </View>
          {props.items.map((it, i) => {
            const parts: string[] = [];
            if (it.quantityCartons > 0) {
              parts.push(
                `${it.quantityCartons} carton${it.quantityCartons === 1 ? "" : "s"}` +
                  (it.unitsPerCartonSnap != null ? ` (${it.unitsPerCartonSnap}/ctn)` : ""),
              );
            }
            if (it.quantityPieces > 0) {
              parts.push(`${it.quantityPieces} pc${it.quantityPieces === 1 ? "" : "s"}`);
            }
            return (
              <View style={styles.tr} key={i}>
                <View style={styles.colName}>
                  <Text>{it.nameSnapshot}</Text>
                  <Text style={styles.subtle}>{it.skuSnapshot}</Text>
                  {parts.length > 0 && <Text style={styles.subtle}>{parts.join(" + ")}</Text>}
                </View>
                <Text style={styles.colQty}>{it.quantity}</Text>
                <Text style={styles.colUnit}>{fmt(it.priceKoboSnap)}</Text>
                <Text style={styles.colTotal}>{fmt(it.priceKoboSnap * it.quantity)}</Text>
              </View>
            );
          })}
        </View>

        <View style={{ marginTop: 12 }}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Subtotal</Text>
            <Text style={styles.totalsValue}>{fmt(props.subtotalKobo)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>
              Logistics
              {props.vehicleName && props.bandLabel
                ? ` (${props.vehicleName} · ${props.bandLabel}${props.tripCount > 1 ? ` · ${props.tripCount} trips` : ""})`
                : ""}
            </Text>
            <Text style={styles.totalsValue}>{fmt(props.logisticsKobo)}</Text>
          </View>
          <View style={[styles.totalsRow, { marginTop: 4 }]}>
            <Text style={styles.grandLabel}>Total due</Text>
            <Text style={styles.grandValue}>{fmt(props.totalKobo)}</Text>
          </View>
        </View>

        {props.bank && (
          <View style={styles.bankBox}>
            <Text style={styles.label}>Bank transfer</Text>
            <Text>{props.bank.name}</Text>
            <Text style={styles.subtle}>{props.bank.accountName}</Text>
            <Text style={{ fontFamily: "Courier", marginTop: 2 }}>
              {props.bank.accountNumber}
            </Text>
            <Text style={[styles.subtle, { marginTop: 6 }]}>
              Use invoice number {props.invoiceNumber} as the transfer reference.
            </Text>
          </View>
        )}

        <Text style={[styles.subtle, { marginTop: 24, textAlign: "center" }]}>
          Thank you for your business. Questions? Reply to the email this invoice came with.
        </Text>
      </Page>
    </Document>
  );
}
