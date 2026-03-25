import { notFound } from "next/navigation";
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
      <div className="no-print flex justify-end">
        <PrintButton />
      </div>
      <ExpenditurePreview expenditure={expenditure} settings={settings} />
    </div>
  );
}
