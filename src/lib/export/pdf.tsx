import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { formatCents } from "@/lib/money";
import type { ExportableQuote } from "./types";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#111" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  brand: { fontSize: 18, fontFamily: "Helvetica-Bold" },
  meta: { textAlign: "right", fontSize: 9, color: "#555" },
  quoteNo: { fontSize: 14, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  section: { marginBottom: 12, color: "#555" },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#999",
    paddingBottom: 4,
    marginBottom: 4,
    fontFamily: "Helvetica-Bold",
  },
  row: { flexDirection: "row", paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: "#eee" },
  cLine: { width: "6%" },
  cSku: { width: "18%" },
  cDesc: { width: "40%" },
  cQty: { width: "10%", textAlign: "right" },
  cUnit: { width: "13%", textAlign: "right" },
  cTotal: { width: "13%", textAlign: "right" },
  totals: { marginTop: 12, marginLeft: "auto", width: "40%" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  grand: { fontFamily: "Helvetica-Bold", borderTopWidth: 1, borderTopColor: "#999", marginTop: 2, paddingTop: 3 },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, fontSize: 8, color: "#999", textAlign: "center" },
});

function QuoteDocument({ quote }: { quote: ExportableQuote }) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>Artisan Cabinets</Text>
            <Text style={{ color: "#555" }}>Custom Cabinetry Quote</Text>
          </View>
          <View style={styles.meta}>
            <Text style={styles.quoteNo}>{quote.quoteNumber}</Text>
            <Text>{quote.createdAt.toLocaleDateString("en-US")}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text>Prepared for: {quote.customerName ?? "—"}</Text>
          {quote.styleLabel && <Text>Door style: {quote.styleLabel}</Text>}
        </View>

        <View style={styles.tableHeader}>
          <Text style={styles.cLine}>#</Text>
          <Text style={styles.cSku}>SKU</Text>
          <Text style={styles.cDesc}>Description</Text>
          <Text style={styles.cQty}>Qty</Text>
          <Text style={styles.cUnit}>Unit</Text>
          <Text style={styles.cTotal}>Total</Text>
        </View>

        {quote.lineItems.map((li) => (
          <View style={styles.row} key={li.lineNumber}>
            <Text style={styles.cLine}>{li.lineNumber}</Text>
            <Text style={styles.cSku}>{li.sku ?? "—"}</Text>
            <Text style={styles.cDesc}>{li.description || "—"}</Text>
            <Text style={styles.cQty}>{li.quantity}</Text>
            <Text style={styles.cUnit}>{formatCents(li.unitPriceCents)}</Text>
            <Text style={styles.cTotal}>{formatCents(li.lineTotalCents)}</Text>
          </View>
        ))}

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text>Subtotal</Text>
            <Text>{formatCents(quote.subtotalCents)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>Tax</Text>
            <Text>{formatCents(quote.taxCents)}</Text>
          </View>
          <View style={[styles.totalRow, styles.grand]}>
            <Text>Total</Text>
            <Text>{formatCents(quote.totalCents)}</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          This quote is an estimate and does not include installation unless noted. Prices valid for 30 days.
        </Text>
      </Page>
    </Document>
  );
}

/** Render a quote to a PDF buffer. Implements the ExportTarget.exportPdf seam. */
export async function renderQuotePdf(quote: ExportableQuote): Promise<Buffer> {
  return renderToBuffer(<QuoteDocument quote={quote} />);
}
