import ExpenditureManager from "@/components/ExpenditureManager";

export default async function ExpendituresPage({
  searchParams,
}: {
  searchParams: Promise<{ fromProposalId?: string }>;
}) {
  const params = await searchParams;
  return <ExpenditureManager initialFromProposalId={params.fromProposalId ?? null} />;
}
