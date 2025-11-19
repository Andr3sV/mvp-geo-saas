"use client";

import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CountrySelect } from "@/components/ui/country-select";
import { DateRangePicker, DateRangeValue } from "@/components/ui/date-range-picker";
import { useState } from "react";
import { subDays } from "date-fns";

interface FiltersToolbarProps {
	className?: string;
	onApply?: (filters: { 
		region: string; 
		dateRange: DateRangeValue;
		platform: string;
	}) => void;
}

export function FiltersToolbar({ className, onApply }: FiltersToolbarProps) {
	const [region, setRegion] = useState<string>("GLOBAL");
	const [dateRange, setDateRange] = useState<DateRangeValue>({
		from: subDays(new Date(), 29),
		to: new Date(),
	});
	const [platform, setPlatform] = useState<string>("all");

	const resetFilters = () => {
		setRegion("GLOBAL");
		setDateRange({
			from: subDays(new Date(), 29),
			to: new Date(),
		});
		setPlatform("all");
	};

	const apply = () => {
		onApply?.({ region, dateRange, platform });
	};

	return (
		<div className={`rounded-lg bg-card p-3 ${className ?? ""}`}>
			<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
				<div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
					<div className="w-full md:w-52">
						<CountrySelect
							value={region}
							onValueChange={setRegion}
							placeholder="Select country..."
						/>
					</div>

					<div className="w-full md:w-64">
						<DateRangePicker
							value={dateRange}
							onChange={setDateRange}
						/>
					</div>

					<div className="w-full md:w-52">
						<Select value={platform} onValueChange={setPlatform}>
							<SelectTrigger className="w-full">
								<SelectValue placeholder="Platform" />
							</SelectTrigger>
							<SelectContent>
								<SelectGroup>
									<SelectLabel>Platform</SelectLabel>
									<SelectItem value="all">All Platforms</SelectItem>
									<SelectItem value="openai">OpenAI</SelectItem>
									<SelectItem value="gemini">Gemini</SelectItem>
									<SelectItem value="claude">Claude</SelectItem>
									<SelectItem value="perplexity">Perplexity</SelectItem>
								</SelectGroup>
							</SelectContent>
						</Select>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<Separator className="hidden h-6 md:block" orientation="vertical" />
					<Button variant="secondary" onClick={resetFilters}>Reset</Button>
					<Button onClick={apply}>Apply</Button>
				</div>
			</div>
		</div>
	);
}
