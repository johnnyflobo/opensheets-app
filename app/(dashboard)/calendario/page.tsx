import MonthPicker from "@/components/month-picker/month-picker";
import { getUserId } from "@/lib/auth/server";
import { getEffectiveUserId } from "@/lib/pagadores/access";
import {
  getSingleParam,
  type ResolvedSearchParams,
} from "@/lib/lancamentos/page-helpers";
import { parsePeriodParam } from "@/lib/utils/period";

import { MonthlyCalendar } from "@/components/calendario/monthly-calendar";
import { fetchCalendarData } from "./data";
import type { CalendarPeriod } from "@/components/calendario/types";

type PageSearchParams = Promise<ResolvedSearchParams>;

type PageProps = {
  searchParams?: PageSearchParams;
};

export default async function Page({ searchParams }: PageProps) {
  const userId = await getEffectiveUserId(await getUserId());
  const resolvedParams = searchParams ? await searchParams : undefined;

  const periodoParam = getSingleParam(resolvedParams, "periodo");
  const { period, monthName, year } = parsePeriodParam(periodoParam);

  const calendarData = await fetchCalendarData({
    userId,
    period,
  });

  const calendarPeriod: CalendarPeriod = {
    period,
    monthName,
    year,
  };

  return (
    <main className="flex flex-col gap-3">
      <MonthPicker />
      <MonthlyCalendar
        period={calendarPeriod}
        events={calendarData.events}
        formOptions={calendarData.formOptions}
      />
    </main>
  );
}
