import ExpenditurePreview from "@/components/ExpenditurePreview";
import PrintButton from "@/components/PrintButton";
import { batchExpenditures } from "@/lib/db/expenditures";
import { getSettings } from "@/lib/db/settings";

export default async function ExpenditureBatchPreview({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const params = await searchParams;
  const ids = (params.ids ?? "")
    .split(",")
    .map((value) => Number(value))
    .filter(Boolean);
  const items = await batchExpenditures(ids);
  const settings = await getSettings();

  return (
    <div className="space-y-6">
      <div className="no-print flex justify-end">
        <PrintButton label="전체 인쇄" />
      </div>
      {items.map((item) => (
        <ExpenditurePreview key={item.id} expenditure={item} settings={settings} />
      ))}
    </div>
  );
}
