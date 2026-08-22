import { useSearch } from "@tanstack/react-router";
import { Popover, PopoverContent, PopoverTrigger } from "@workspace/ui/components/popover";
import { CalendarDays } from "lucide-react";
import { useMemo, useState } from "react";
import { CustomRangeCalendar, formatCustomRangeLabel } from "@/components/custom-range-calendar";
import { useBrand } from "@/hooks/use-brands";
import { coerceLookback, useFilterNavigate } from "@/hooks/use-list-filters";
import { getDefaultLookbackPeriod, type LookbackPeriod, parseCustomLookback } from "@/lib/chart-utils";

function getLookbackLabel(lookback: LookbackPeriod): string {
	switch (lookback) {
		case "1w":
			return "1w";
		case "1m":
			return "1mo";
		case "3m":
			return "3mo";
		case "6m":
			return "6mo";
		case "1y":
			return "1yr";
		default:
			return "all";
	}
}

interface LookbackSelectorProps {
	defaultPeriod?: LookbackPeriod;
	onLookbackChange?: (lookback: LookbackPeriod) => void;
}

export function LookbackSelector({ defaultPeriod, onLookbackChange }: LookbackSelectorProps) {
	const { brand } = useBrand();
	const computedDefaultPeriod = useMemo(
		() => defaultPeriod ?? getDefaultLookbackPeriod(brand?.earliestDataDate),
		[defaultPeriod, brand?.earliestDataDate],
	);

	const urlLookback = useSearch({ strict: false, select: (s) => s.lookback });
	const setFilters = useFilterNavigate();
	const selectedLookback = coerceLookback(urlLookback, computedDefaultPeriod);
	const customRange = parseCustomLookback(selectedLookback);

	const [isCalendarOpen, setIsCalendarOpen] = useState(false);

	const handleChange = (period: LookbackPeriod) => {
		setFilters({ lookback: period === computedDefaultPeriod ? undefined : period });
		onLookbackChange?.(period);
		setIsCalendarOpen(false);
	};

	return (
		<div className="flex rounded-md bg-muted p-1">
			{(["1w", "1m", "3m", "6m", "1y", "all"] as LookbackPeriod[]).map((period) => (
				<button
					key={period}
					onClick={() => handleChange(period)}
					className={`px-3 py-1 text-sm rounded cursor-pointer ${
						selectedLookback === period
							? "bg-background text-foreground shadow-sm"
							: "text-muted-foreground hover:text-foreground"
					}`}
					type="button"
				>
					{getLookbackLabel(period)}
				</button>
			))}
			<Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen} modal={false}>
				<PopoverTrigger asChild>
					<button
						type="button"
						title={customRange ? formatCustomRangeLabel(customRange.from, customRange.to) : "Pick a custom date range"}
						className={`flex items-center gap-1 px-3 py-1 text-sm rounded cursor-pointer ${
							customRange ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
						}`}
					>
						<CalendarDays className="size-3.5" />
						{customRange ? formatCustomRangeLabel(customRange.from, customRange.to) : "custom"}
					</button>
				</PopoverTrigger>
				<PopoverContent align="end" className="w-auto p-0">
					<CustomRangeCalendar selected={selectedLookback} onApply={handleChange} />
				</PopoverContent>
			</Popover>
		</div>
	);
}

export function useLookbackPeriod(defaultPeriod?: LookbackPeriod) {
	const { brand } = useBrand();
	const computedDefaultPeriod = useMemo(
		() => defaultPeriod ?? getDefaultLookbackPeriod(brand?.earliestDataDate),
		[defaultPeriod, brand?.earliestDataDate],
	);

	const urlLookback = useSearch({ strict: false, select: (s) => s.lookback });
	return coerceLookback(urlLookback, computedDefaultPeriod);
}
