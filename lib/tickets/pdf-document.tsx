import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ComponentProps, ReactElement } from "react";

/* eslint-disable jsx-a11y/alt-text -- React PDF's Image component has no alt prop; its adjacent caption identifies it. */

const styles = StyleSheet.create({
  page: { padding: 34, fontFamily: "Helvetica", color: "#10203d", fontSize: 10 },
  top: { backgroundColor: "#0b1834", color: "#fff", padding: 18, borderRadius: 8 },
  brand: { fontSize: 20, fontWeight: 700 },
  demo: { color: "#fdba74", fontSize: 9, marginTop: 5, textTransform: "uppercase", letterSpacing: 1.2 },
  title: { fontSize: 16, fontWeight: 700, marginTop: 22, marginBottom: 12 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 12, marginBottom: 11 },
  label: { color: "#64748b", fontSize: 8, marginBottom: 3 },
  value: { fontSize: 10, fontWeight: 600 },
  station: { backgroundColor: "#f1f5f9", padding: 14, borderRadius: 7, marginBottom: 14 },
  section: { borderTop: "1 solid #e2e8f0", paddingTop: 12, marginTop: 6 },
  sectionTitle: { fontSize: 11, fontWeight: 700, marginBottom: 9 },
  passenger: { flexDirection: "row", justifyContent: "space-between", borderBottom: "1 solid #e2e8f0", paddingVertical: 7 },
  qr: { width: 76, height: 76 },
  footer: { position: "absolute", bottom: 25, left: 34, right: 34, borderTop: "1 solid #e2e8f0", paddingTop: 9, color: "#64748b", fontSize: 8, lineHeight: 1.4 },
  disclaimer: { color: "#9a3412", backgroundColor: "#fff7ed", padding: 10, marginTop: 15, lineHeight: 1.5 },
});

export type TicketPdfData = {
  reference: string; pnr: string; pnrStatus: string; status: string; trainNumber: string; trainName: string;
  journeyDate: Date; departureAt: Date; arrivalAt: Date; origin: string; destination: string; travelClass: string;
  baseFare: number; fee: number; totalFare: number; qrDataUrl: string;
  passengers: { name: string; age: number; gender: string; coach: string; seat: string }[];
};

export function buildTicketDocument(ticket: TicketPdfData): ReactElement<ComponentProps<typeof Document>> {
  const journeyDate = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "full" }).format(ticket.journeyDate);
  const clock = (date: Date) => new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true }).format(date);
  return <Document title={`RailConnect demo ticket ${ticket.pnr}`}><Page size="A4" style={styles.page}>
    <View style={styles.top}><Text style={styles.brand}>RailConnect</Text><Text style={styles.demo}>Academic demonstration · Simulated ticket</Text></View>
    <Text style={styles.title}>Journey confirmation</Text>
    <View style={styles.row}><View><Text style={styles.label}>PNR · SIMULATED</Text><Text style={styles.value}>{ticket.pnr} · {ticket.pnrStatus}</Text></View><View><Text style={styles.label}>BOOKING REFERENCE</Text><Text style={styles.value}>{ticket.reference}</Text></View><View><Text style={styles.label}>STATUS</Text><Text style={styles.value}>{ticket.status}</Text></View></View>
    <View style={styles.station}><View style={styles.row}><View><Text style={styles.label}>FROM</Text><Text style={styles.value}>{ticket.origin}</Text><Text>{clock(ticket.departureAt)}</Text></View><View><Text style={styles.label}>TO</Text><Text style={styles.value}>{ticket.destination}</Text><Text>{clock(ticket.arrivalAt)}</Text></View></View><Text>{journeyDate}</Text></View>
    <View style={styles.row}><View><Text style={styles.label}>TRAIN</Text><Text style={styles.value}>{ticket.trainNumber} · {ticket.trainName}</Text></View><View><Text style={styles.label}>CLASS</Text><Text style={styles.value}>{ticket.travelClass.replace("_", " ")}</Text></View></View>
    <View style={styles.section}><Text style={styles.sectionTitle}>Passengers and seats</Text>{ticket.passengers.map((passenger, index) => <View key={`${passenger.name}-${index}`} style={styles.passenger}><Text>{index + 1}. {passenger.name} · {passenger.age} · {passenger.gender}</Text><Text>{passenger.coach} · {passenger.seat}</Text></View>)}</View>
    <View style={[styles.section, { flexDirection: "row", justifyContent: "space-between" }]}><View><Text style={styles.sectionTitle}>Fare summary · INR</Text><Text>Base fare: ₹{ticket.baseFare.toFixed(2)}</Text><Text>Demo service fee: ₹{ticket.fee.toFixed(2)}</Text><Text style={{ marginTop: 7, fontWeight: 700 }}>Total: ₹{ticket.totalFare.toFixed(2)}</Text></View><View><Image src={ticket.qrDataUrl} style={styles.qr} /><Text style={{ textAlign: "center", fontSize: 7, marginTop: 3 }}>SIMULATED QR</Text></View></View>
    <Text style={styles.disclaimer}>This is an academic demonstration document. It is not a railway ticket, is not valid for travel, and does not represent an actual reservation. QR content is simulated.</Text>
    <Text style={styles.footer}>RailConnect sample reservation system · Payments, PNR, and availability are simulated · Printed {new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium" }).format(new Date())}</Text>
  </Page></Document>;
}
