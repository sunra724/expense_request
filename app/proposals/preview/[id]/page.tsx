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
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-slate-500">
          버튼을 누른 뒤 브라우저 인쇄 창에서 `PDF로 저장`을 선택하면 됩니다.
        </div>
        <PrintButton documentTitle={proposal.doc_number || `지출품의서-${proposal.id}`} />
      </div>
      <ProposalPreview proposal={proposal} settings={settings} />
    </div>
  );
}
