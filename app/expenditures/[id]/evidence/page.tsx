import { notFound } from "next/navigation";
import EvidenceSheetEditor from "@/components/EvidenceSheetEditor";
import { getExpenditure } from "@/lib/db/expenditures";

export default async function EvidenceSheetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const expenditure = await getExpenditure(Number(id));
  if (!expenditure) notFound();

  return <EvidenceSheetEditor expenditure={expenditure} />;
}
