import PrintButton from "@/components/PrintButton";
import ProposalPreview from "@/components/ProposalPreview";
import { batchProposals } from "@/lib/db/proposals";
import { getSettings } from "@/lib/db/settings";

export default async function ProposalBatchPreview({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const params = await searchParams;
  const ids = (params.ids ?? "")
    .split(",")
    .map((value) => Number(value))
    .filter(Boolean);
  const items = await batchProposals(ids);
  const settings = await getSettings();

  return (
    <div className="space-y-6">
      <div className="no-print flex justify-end">
        <PrintButton label="전체 인쇄" />
      </div>
      {items.map((item) => (
        <ProposalPreview key={item.id} proposal={item} settings={settings} />
      ))}
    </div>
  );
}
