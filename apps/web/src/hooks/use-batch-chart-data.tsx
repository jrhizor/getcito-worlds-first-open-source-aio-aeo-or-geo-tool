import { useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { APP_TIMEZONE } from "@/lib/app-locale";
import { type BatchChartDataResponse, getBatchChartDataFn } from "@/server/visibility";

export type { LookbackPeriod } from "@/lib/chart-utils";

import type { LookbackPeriod } from "@/lib/chart-utils";

export interface BatchChartDataFilters {
	lookback?: LookbackPeriod;
	model?: string;
	/** Tag filter (resolved to prompt IDs server-side). */
	tags?: string[];
	/** Search term applied to prompt text (resolved server-side). */
	search?: string;
}

export function useBatchChartData(brandId?: string, filters?: BatchChartDataFilters) {
	const params = useParams({ strict: false }) as { brand?: string };
	const resolvedBrandId = brandId || params.brand;

	const query = useQuery({
		queryKey: [
			"batch-chart-data",
			resolvedBrandId,
			filters?.lookback,
			filters?.model,
			filters?.tags?.join(","),
			filters?.search,
		],
		queryFn: () =>
			getBatchChartDataFn({
				data: {
					brandId: resolvedBrandId!,
					lookback: filters?.lookback || "1m",
					model: filters?.model,
					tags: filters?.tags?.join(","),
					search: filters?.search,
					timezone: APP_TIMEZONE,
				},
			}),
		enabled: !!resolvedBrandId,
		staleTime: 60_000,
		refetchOnWindowFocus: false,
		refetchOnReconnect: true,
		placeholderData: (prev) => prev, // Keep previous data while loading
	});

	return {
		batchChartData: query.data,
		isLoading: query.isLoading,
		isValidating: query.isFetching,
		isError: query.error,
		revalidate: query.refetch,
	};
}
