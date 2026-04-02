import { notFound } from "next/navigation";
import PhotoSheetEditor from "@/components/PhotoSheetEditor";
import { getExpenditure } from "@/lib/db/expenditures";

export default async function PhotoSheetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const expenditure = await getExpenditure(Number(id));
  if (!expenditure) notFound();

  return <PhotoSheetEditor expenditure={expenditure} />;
}
