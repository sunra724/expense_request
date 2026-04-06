import { NextResponse } from "next/server";
import { getExpenditure, updateExpenditure } from "@/lib/db/expenditures";
import type {
  EvidenceAttachmentSheet,
  Expenditure,
  ExpenditureInput,
  PhotoAttachmentSheet,
} from "@/lib/types";

type AttachmentPayload = {
  evidence_sheet?: EvidenceAttachmentSheet;
  photo_sheet?: PhotoAttachmentSheet;
};

function toExpenditureInput(item: Expenditure): ExpenditureInput {
  return {
    proposal_id: item.proposal_id,
    doc_number: item.doc_number,
    project_name: item.project_name,
    expense_category: item.expense_category,
    issue_date: item.issue_date,
    record_date: item.record_date,
    total_amount: item.total_amount,
    payee_address: item.payee_address,
    payee_company: item.payee_company,
    payee_name: item.payee_name,
    payment_method: item.payment_method,
    receipt_date: item.receipt_date,
    receipt_name: item.receipt_name,
    items: item.items,
    evidence_sheet: item.evidence_sheet,
    photo_sheet: item.photo_sheet,
    status: item.status,
    organization_id: item.organization_id,
    project_id: item.project_id,
    template_code: item.template_code,
    budget_scope: item.budget_scope,
    budget_category: item.budget_category,
    budget_item: item.budget_item,
    vendor_business_number: item.vendor_business_number,
    evidence_type: item.evidence_type,
    supply_amount: item.supply_amount,
    vat_amount: item.vat_amount,
    eligible_amount: item.eligible_amount,
    attendee_count: item.attendee_count,
    unit_amount: item.unit_amount,
    evidence_checklist: item.evidence_checklist,
    evidence_completion: item.evidence_completion,
    compliance_flags: item.compliance_flags,
    vat_excluded: item.vat_excluded,
  };
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const current = await getExpenditure(Number(id));
  if (!current) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const body = (await request.json()) as AttachmentPayload;
  const updated = await updateExpenditure(Number(id), {
    ...toExpenditureInput(current),
    evidence_sheet: body.evidence_sheet ?? current.evidence_sheet,
    photo_sheet: body.photo_sheet ?? current.photo_sheet,
  });

  return updated ? NextResponse.json(updated) : NextResponse.json({ message: "Not found" }, { status: 404 });
}
