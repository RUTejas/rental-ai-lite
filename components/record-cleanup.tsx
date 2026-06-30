"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, Trash2 } from "lucide-react";
import { DeleteAction } from "@/components/delete-action";

type Role = "MASTER_ADMIN" | "ADMIN" | "TENANT";
type Row = { id: string; name: string; detail: string; endpoint: string };
type Complaint = { id: string; title: string; status: string };
type Notice = { id: string; title: string; createdBy: { id: string } };
type Receipt = { id: string; receiptNumber: string; tenant: { name: string } };

async function get<T>(url: string): Promise<T> { const response = await fetch(url); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Unable to load cleanup records."); return data; }

export function RecordCleanup({ user, bills, rents, documents, tenants, properties, notify, removeBill, removeRent, removeDocument, removeTenant }: {
  user: { id: string; role: Role };
  bills: Array<{ id: string; billType: string; tenant: { name: string }; billingMonth: number; billingYear: number }>;
  rents: Array<{ id: string; tenant: { name: string }; billingMonth: number; billingYear: number }>;
  documents: Array<{ id: string; kind: string; status: string; tenant: { name: string } }>;
  tenants: Array<{ id: string; name: string; email: string }>;
  properties: Array<{ id: string; name: string; address: string }>;
  notify: (type: "success" | "error", text: string) => void;
  removeBill: (id: string) => void; removeRent: (id: string) => void; removeDocument: (id: string) => void; removeTenant: (id: string) => void;
}) {
  const [extra, setExtra] = useState<Row[]>([]);
  useEffect(() => {
    Promise.all([
      get<{ complaints: Complaint[] }>("/api/complaints"),
      get<{ notices: Notice[] }>("/api/notices"),
      get<{ receipts: Receipt[] }>("/api/receipts"),
      user.role === "MASTER_ADMIN" ? get<{ owners: Array<{ id: string; name: string; email: string }> }>("/api/master/owners") : Promise.resolve({ owners: [] }),
      user.role === "MASTER_ADMIN" ? get<{ tenants: Array<{ id: string; name: string; email: string }> }>("/api/master/tenants") : Promise.resolve({ tenants: [] }),
      user.role === "MASTER_ADMIN" ? get<{ reports: Array<{ id: string; issueType: string; email: string }> }>("/api/master/support") : Promise.resolve({ reports: [] })
    ]).then(([complaintData, noticeData, receiptData, ownerData, tenantData, reportData]) => {
      const rows: Row[] = [];
      complaintData.complaints.filter((item) => user.role === "MASTER_ADMIN" || (user.role === "TENANT" ? item.status === "NEW" : ["RESOLVED", "REJECTED"].includes(item.status))).forEach((item) => rows.push({ id: item.id, name: item.title, detail: `Complaint · ${item.status.toLowerCase().replaceAll("_", " ")}`, endpoint: `/api/complaints/${item.id}` }));
      noticeData.notices.filter((item) => user.role === "MASTER_ADMIN" || (user.role === "ADMIN" && item.createdBy.id === user.id)).forEach((item) => rows.push({ id: item.id, name: item.title, detail: "Notice", endpoint: `/api/notices/${item.id}` }));
      if (user.role === "MASTER_ADMIN") receiptData.receipts.forEach((item) => rows.push({ id: item.id, name: item.receiptNumber, detail: `Receipt · ${item.tenant.name}`, endpoint: `/api/receipts/${item.id}` }));
      ownerData.owners.forEach((item) => rows.push({ id: item.id, name: item.name, detail: `Owner · ${item.email}`, endpoint: `/api/master/owners/${item.id}` }));
      tenantData.tenants.forEach((item) => rows.push({ id: item.id, name: item.name, detail: `Tenant · ${item.email}`, endpoint: `/api/tenants/${item.id}` }));
      reportData.reports.forEach((item) => rows.push({ id: item.id, name: item.issueType.replaceAll("_", " "), detail: `Support report · ${item.email}`, endpoint: `/api/master/support/${item.id}` }));
      setExtra(rows);
    }).catch(() => setExtra([]));
  }, [user.id, user.role]);

  const primary: Array<Row & { done: () => void }> = [
    ...((user.role !== "TENANT") ? bills.map((item) => ({ id: item.id, name: `${item.tenant.name}'s ${item.billType.toLowerCase()} bill`, detail: `Utility bill · ${item.billingMonth}/${item.billingYear}`, endpoint: `/api/bills/${item.id}`, done: () => removeBill(item.id) })) : []),
    ...((user.role !== "TENANT") ? rents.map((item) => ({ id: item.id, name: `${item.tenant.name}'s rent`, detail: `Rent record · ${item.billingMonth}/${item.billingYear}`, endpoint: `/api/rents/${item.id}`, done: () => removeRent(item.id) })) : []),
    ...documents.filter((item) => user.role === "MASTER_ADMIN" || (user.role === "TENANT" ? ["PENDING", "REJECTED"].includes(item.status) : item.status === "REJECTED")).map((item) => ({ id: item.id, name: `${item.tenant.name}'s ${item.kind === "AGREEMENT" ? "agreement" : "ID proof"}`, detail: `Document · ${item.status.toLowerCase()}`, endpoint: `/api/documents/${item.id}`, done: () => removeDocument(item.id) })),
    ...((user.role !== "TENANT") ? properties.map((item) => ({ id: item.id, name: item.name, detail: `Property · ${item.address}`, endpoint: `/api/properties/${item.id}`, done: () => window.location.reload() })) : []),
    ...((user.role === "ADMIN") ? tenants.map((item) => ({ id: item.id, name: item.name, detail: `Tenant · ${item.email}`, endpoint: `/api/tenants/${item.id}`, done: () => removeTenant(item.id) })) : [])
  ];
  const removeExtra = (row: Row) => setExtra((current) => current.filter((item) => !(item.endpoint === row.endpoint && item.id === row.id)));
  if (!primary.length && !extra.length) return null;
  return <details className="cleanup-panel"><summary><span><ShieldCheck />Protected record cleanup</span><small>{primary.length + extra.length} eligible record{primary.length + extra.length === 1 ? "" : "s"}</small></summary><p><Trash2 /> Every removal requires a reason and typing DELETE. Important data is recoverable by Master Admin.</p><div className="cleanup-grid">{primary.map((item) => <article key={item.endpoint}><div><b>{item.name}</b><small>{item.detail}</small></div><DeleteAction compact endpoint={item.endpoint} itemName={item.name} onDone={item.done} notify={notify} /></article>)}{extra.map((item) => <article key={item.endpoint}><div><b>{item.name}</b><small>{item.detail}</small></div><DeleteAction compact endpoint={item.endpoint} itemName={item.name} onDone={() => removeExtra(item)} notify={notify} /></article>)}</div></details>;
}
