import { notFound } from "next/navigation";
import PrintButton from "@/components/PrintButton";
import ProposalPreview from "@/components/ProposalPreview";
import { getProposal } from "@/lib/db/proposals";
import { getSettings } from "@/lib/db/settings";

export default async function ProposalPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const proposal = await getProposal(Number(id));
  if (!proposal) notFound();
  const settings = await getSettings();

  return (
    <div className="space-y-4">
      <div className="no-print flex justify-end">
        <PrintButton />
      </div>
      <ProposalPreview proposal={proposal} settings={settings} />
    </div>
  );
}
