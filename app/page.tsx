import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, CalendarDays, CheckCircle2, FileWarning, Gauge, Landmark, UsersRound } from "lucide-react";
import { getCalendarAgenda, type CalendarEventItem, type CalendarEventTag } from "@/lib/calendar";
import { getDadareumDashboard } from "@/lib/db/dadareum";
import { listProjects } from "@/lib/db/organizations";
import { formatCurrency } from "@/lib/format";

export const dynamic = "force-dynamic";

function formatRate(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 1000) / 10;
}

function ProgressBar({ value, total }: { value: number; total: number }) {
  const rate = Math.min(100, Math.max(0, formatRate(value, total)));

  return (
    <div className="mt-3 h-2 w-full overflow-hidden rounded bg-slate-200">
      <div className="h-full rounded bg-teal-700" style={{ width: `${rate}%` }} />
    </div>
  );
}

function MetricCard({
  label,
  value,
  caption,
  icon: Icon,
}: {
  label: string;
  value: string;
  caption: string;
  icon: typeof Gauge;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-slate-500">{label}</div>
        <Icon className="h-5 w-5 text-teal-700" />
      </div>
      <div className="mt-3 text-2xl font-semibold text-slate-950">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{caption}</div>
    </div>
  );
}

const tagStyles: Record<CalendarEventTag, string> = {
  settlement: "bg-amber-50 text-amber-800 border-amber-200",
  report: "bg-rose-50 text-rose-800 border-rose-200",
  operations: "bg-slate-100 text-slate-700 border-slate-200",
  counseling: "bg-sky-50 text-sky-800 border-sky-200",
  program: "bg-teal-50 text-teal-800 border-teal-200",
  expense: "bg-violet-50 text-violet-800 border-violet-200",
  other: "bg-zinc-100 text-zinc-700 border-zinc-200",
};

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "numeric",
  day: "numeric",
  weekday: "short",
});

const timeFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  hour: "2-digit",
  minute: "2-digit",
});

function formatEventDate(event: CalendarEventItem) {
  return dateFormatter.format(new Date(event.start));
}

function formatEventTime(event: CalendarEventItem) {
  if (event.allDay) return "종일";
  return timeFormatter.format(new Date(event.start));
}

function CalendarEventList({
  events,
  emptyText,
}: {
  events: CalendarEventItem[];
  emptyText: string;
}) {
  if (!events.length) {
    return <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">{emptyText}</div>;
  }

  return (
    <div className="space-y-3">
      {events.slice(0, 6).map((event) => (
        <div key={event.id} className="rounded-lg border border-slate-200 px-3 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate font-medium text-slate-900">{event.title}</div>
              <div className="mt-1 text-xs text-slate-500">
                {formatEventDate(event)} · {formatEventTime(event)}
                {event.location ? ` · ${event.location}` : ""}
              </div>
            </div>
            <span className={`shrink-0 rounded border px-2 py-1 text-[11px] font-semibold ${tagStyles[event.tag]}`}>
              {event.tagLabel}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string; fromProposalId?: string }>;
}) {
  const params = await searchParams;
  if (params.fromProposalId) redirect(`/expenditures?fromProposalId=${params.fromProposalId}`);

  const projects = await listProjects();
  const selectedProjectId = params.projectId ? Number(params.projectId) : null;
  const [dashboard, calendar] = await Promise.all([
    getDadareumDashboard(selectedProjectId),
    getCalendarAgenda(),
  ]);

  const selectedProject = dashboard.project;
  const executedRate = formatRate(dashboard.totals.executedTotal, dashboard.totals.budgetTotal);
  const directRate = formatRate(dashboard.totals.directExecutedTotal, dashboard.totals.directBudgetTotal);
  const indirectRate = formatRate(dashboard.totals.indirectExecutedTotal, dashboard.totals.indirectBudgetTotal);
  const indirectAdvanceAmount = Math.round(dashboard.totals.indirectBudgetTotal * 0.7);
  const indirectBalanceAmount = dashboard.totals.indirectBudgetTotal - indirectAdvanceAmount;

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white px-5 py-5 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-sm uppercase tracking-[0.22em] text-teal-700">Dadareum Settlement</div>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl text-slate-950">
              청년 다다름 정산 대시보드
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              지출품의서와 지출결의서 데이터를 기준으로 예산 집행률, 청년별 한도, 증빙 상태를 한 곳에서 확인합니다.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/?projectId=${project.id}`}
                className={`rounded px-3 py-2 text-sm ${
                  selectedProject?.id === project.id
                    ? "bg-teal-700 text-white shadow-sm"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {project.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white px-5 py-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-teal-700" />
            <div>
              <h2 className="text-lg font-semibold text-slate-950">사업 일정</h2>
              <p className="mt-1 text-sm text-slate-500">{calendar.calendarName}</p>
            </div>
          </div>
          <div className="text-xs text-slate-500">
            오늘 {calendar.today.length}건 · 14일 {calendar.upcoming.length}건 · 마감 {calendar.deadlines.length}건
          </div>
        </div>

        {calendar.error ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            구글 캘린더 일정을 읽지 못했습니다. iCal 주소를 다시 확인해 주세요.
          </div>
        ) : calendar.configured ? (
          <div className="grid gap-4 lg:grid-cols-3">
            <div>
              <div className="mb-3 text-sm font-semibold text-slate-900">오늘</div>
              <CalendarEventList events={calendar.today} emptyText="오늘 일정이 없습니다." />
            </div>
            <div>
              <div className="mb-3 text-sm font-semibold text-slate-900">앞으로 14일</div>
              <CalendarEventList events={calendar.upcoming} emptyText="예정된 일정이 없습니다." />
            </div>
            <div>
              <div className="mb-3 text-sm font-semibold text-slate-900">정산·보고 마감</div>
              <CalendarEventList events={calendar.deadlines} emptyText="다가오는 정산·보고 마감이 없습니다." />
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
            캘린더 주소가 아직 설정되지 않았습니다.
          </div>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="전체 집행률"
          value={`${executedRate}%`}
          caption={`${formatCurrency(dashboard.totals.executedTotal)}원 / ${formatCurrency(
            dashboard.totals.budgetTotal,
          )}원`}
          icon={Gauge}
        />
        <MetricCard
          label="직접비"
          value={`${directRate}%`}
          caption={`${formatCurrency(dashboard.totals.directExecutedTotal)}원 / ${formatCurrency(
            dashboard.totals.directBudgetTotal,
          )}원`}
          icon={UsersRound}
        />
        <MetricCard
          label="간접비"
          value={`${indirectRate}%`}
          caption={`${formatCurrency(dashboard.totals.indirectExecutedTotal)}원 / ${formatCurrency(
            dashboard.totals.indirectBudgetTotal,
          )}원`}
          icon={Landmark}
        />
        <MetricCard
          label="정산 알림"
          value={`${dashboard.alerts.length}건`}
          caption={`증빙대기 ${dashboard.totals.evidencePendingCount}건 · 승인확인 ${dashboard.totals.approvalPendingCount}건`}
          icon={FileWarning}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg border border-slate-200 bg-white px-5 py-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">예산 집행 현황</h2>
              <p className="mt-1 text-sm text-slate-500">완료 처리된 결의서의 집행 인정금액 기준입니다.</p>
            </div>
            <Link href="/expenditures" className="rounded border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
              결의서 보기
            </Link>
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-800">전체</span>
                <span className="text-slate-500">{executedRate}%</span>
              </div>
              <ProgressBar value={dashboard.totals.executedTotal} total={dashboard.totals.budgetTotal} />
            </div>
            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-800">직접비</span>
                <span className="text-slate-500">{directRate}%</span>
              </div>
              <ProgressBar value={dashboard.totals.directExecutedTotal} total={dashboard.totals.directBudgetTotal} />
            </div>
            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-800">간접비</span>
                <span className="text-slate-500">{indirectRate}%</span>
              </div>
              <ProgressBar
                value={dashboard.totals.indirectExecutedTotal}
                total={dashboard.totals.indirectBudgetTotal}
              />
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-sm font-semibold text-slate-900">계약 사업비</div>
            <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">총 사업비</span>
                <span className="font-semibold text-slate-950">{formatCurrency(dashboard.totals.budgetTotal)}원</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">직접사업비</span>
                <span className="font-semibold text-slate-950">
                  {formatCurrency(dashboard.totals.directBudgetTotal)}원
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">간접사업비 선금</span>
                <span className="font-semibold text-slate-950">{formatCurrency(indirectAdvanceAmount)}원</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">간접사업비 잔금</span>
                <span className="font-semibold text-slate-950">{formatCurrency(indirectBalanceAmount)}원</span>
              </div>
            </div>
            <div className="mt-2 text-xs text-slate-500">직접사업비는 20명 x 2,400,000원 기준입니다.</div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white px-5 py-5 shadow-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <h2 className="text-lg font-semibold text-slate-950">정산 체크</h2>
          </div>

          <div className="mt-4 space-y-3">
            {dashboard.alerts.length ? (
              dashboard.alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`rounded-lg border px-3 py-3 text-sm ${
                    alert.severity === "blocking"
                      ? "border-red-200 bg-red-50 text-red-900"
                      : "border-amber-200 bg-amber-50 text-amber-900"
                  }`}
                >
                  <div className="font-semibold">{alert.title}</div>
                  <div className="mt-1 text-xs opacity-80">{alert.description}</div>
                  {alert.href ? (
                    <Link className="mt-2 inline-block text-xs font-semibold underline" href={alert.href}>
                      확인하기
                    </Link>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-4 text-sm text-emerald-900">
                <div className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="h-4 w-4" />
                  큰 경고 없음
                </div>
                <p className="mt-1 text-xs">현재 입력된 문서 기준으로 즉시 확인할 정산 경고는 없습니다.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white px-5 py-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-950">비목별 집행</h2>
            <span className="text-xs text-slate-500">세세목 예산표 연결 전에는 문서 입력값으로 묶입니다.</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-slate-200 text-left text-slate-500">
                <tr>
                  <th className="py-2 pr-3">구분</th>
                  <th className="py-2 pr-3">항목</th>
                  <th className="py-2 pr-3 text-right">집행</th>
                  <th className="py-2 pr-3 text-right">잔액</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.budgetRows.length ? (
                  dashboard.budgetRows.map((row) => (
                    <tr key={row.key} className="border-b border-slate-100">
                      <td className="py-3 pr-3 text-slate-500">{row.scope === "direct" ? "직접비" : "간접비"}</td>
                      <td className="py-3 pr-3">
                        <div className="font-medium text-slate-800">{row.categoryName}</div>
                        <div className="mt-1 text-xs text-slate-500">{row.itemName}</div>
                      </td>
                      <td className="py-3 pr-3 text-right">{formatCurrency(row.executedAmount)}원</td>
                      <td className="py-3 pr-3 text-right">
                        {row.budgetAmount ? `${formatCurrency(row.remainingAmount)}원` : "-"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="py-8 text-center text-slate-500" colSpan={4}>
                      아직 집행 완료된 결의서가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white px-5 py-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-950">청년별 한도</h2>
            <span className="text-xs text-slate-500">주 예산 {formatCurrency(dashboard.settings.per_youth_main_limit)}원 기준</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-slate-200 text-left text-slate-500">
                <tr>
                  <th className="py-2 pr-3">청년</th>
                  <th className="py-2 pr-3 text-right">주 예산 사용</th>
                  <th className="py-2 pr-3 text-right">잔액</th>
                  <th className="py-2 pr-3 text-right">문서</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.youthRows.length ? (
                  dashboard.youthRows.map((row) => (
                    <tr key={`${row.youthId ?? "unassigned"}-${row.name}`} className="border-b border-slate-100">
                      <td className="py-3 pr-3">
                        <div className="font-medium text-slate-800">
                          {row.serialNo ? `${row.serialNo}. ` : ""}
                          {row.name}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {row.status === "unassigned" ? "청년 배정 필요" : row.status}
                        </div>
                      </td>
                      <td className="py-3 pr-3 text-right">{formatCurrency(row.mainUsed)}원</td>
                      <td className={`py-3 pr-3 text-right ${row.mainRemaining < 0 ? "text-red-700" : ""}`}>
                        {row.status === "unassigned" ? "-" : `${formatCurrency(row.mainRemaining)}원`}
                      </td>
                      <td className="py-3 pr-3 text-right">{row.documentCount}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="py-8 text-center text-slate-500" colSpan={4}>
                      참여청년을 등록하면 청년별 사용액이 표시됩니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
