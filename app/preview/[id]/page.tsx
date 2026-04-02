import { notFound } from "next/navigation";
import Link from "next/link";
import ExpenditurePreview from "@/components/ExpenditurePreview";
import PrintButton from "@/components/PrintButton";
import { getExpenditure } from "@/lib/db/expenditures";
import { getSettings } from "@/lib/db/settings";

export default async function ExpenditurePreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const expenditure = await getExpenditure(Number(id));
  if (!expenditure) notFound();
  const settings = await getSettings();

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap justify-end gap-2">
        <Link className="btn btn-secondary" href={`/expenditures/${expenditure.id}/evidence`}>
          증빙서류 첨부철
        </Link>
        <Link className="btn btn-secondary" href={`/expenditures/${expenditure.id}/photos`}>
          증빙사진 첨부철
        </Link>
        <PrintButton />
      </div>
      <ExpenditurePreview expenditure={expenditure} settings={settings} />
    </div>
  );
}
