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
import { useState, useEffect } from "react";
import { subDays } from "date-fns";
import { useProject } from "@/contexts/project-context";
import { getProjectTopics } from "@/lib/actions/topics";

interface FiltersToolbarProps {
	className?: string;
	dateRange?: DateRangeValue;
	platform?: string;
	region?: string;
	topicId?: string;
	onApply?: (filters: { 
		region: string; 
		dateRange: DateRangeValue;
		platform: string;
		topicId: string;
	}) => void;
}

export function FiltersToolbar({ 
	className, 
	dateRange: controlledDateRange, 
	platform: controlledPlatform,
	region: controlledRegion,
	topicId: controlledTopicId,
	onApply 
}: FiltersToolbarProps) {
	const { selectedProjectId } = useProject();
	const [region, setRegion] = useState<string>(controlledRegion || "GLOBAL");
	const [dateRange, setDateRange] = useState<DateRangeValue>(
		controlledDateRange || {
			from: subDays(new Date(), 29),
			to: new Date(),
		}
	);
	const [platform, setPlatform] = useState<string>(controlledPlatform || "all");
	const [topicId, setTopicId] = useState<string>(controlledTopicId || "all");
	const [topics, setTopics] = useState<any[]>([]);

	// Load topics for the project
	useEffect(() => {
		if (selectedProjectId) {
			loadTopics();
		}
	}, [selectedProjectId]);

	const loadTopics = async () => {
		if (!selectedProjectId) return;
		const result = await getProjectTopics(selectedProjectId);
		if (result.data) {
			setTopics(result.data);
		}
	};

	// Sync with controlled props
	useEffect(() => {
		if (controlledDateRange) {
			setDateRange(controlledDateRange);
		}
	}, [controlledDateRange]);

	useEffect(() => {
		if (controlledPlatform !== undefined) {
			setPlatform(controlledPlatform);
		}
	}, [controlledPlatform]);

	useEffect(() => {
		if (controlledRegion !== undefined) {
			setRegion(controlledRegion);
		}
	}, [controlledRegion]);

	useEffect(() => {
		if (controlledTopicId !== undefined) {
			setTopicId(controlledTopicId);
		}
	}, [controlledTopicId]);

	const getDefaultDateRange = () => ({
		from: subDays(new Date(), 29),
		to: new Date(),
	});

	const resetFilters = () => {
		const resetDateRange = getDefaultDateRange();
		const resetRegion = "GLOBAL";
		const resetPlatform = "all";
		const resetTopicId = "all";
		setRegion(resetRegion);
		setDateRange(resetDateRange);
		setPlatform(resetPlatform);
		setTopicId(resetTopicId);
		// Auto-apply reset
		onApply?.({ region: resetRegion, dateRange: resetDateRange, platform: resetPlatform, topicId: resetTopicId });
	};

	// Helper to compare dates (same day, ignoring time)
	const isSameDay = (date1: Date | undefined, date2: Date | undefined) => {
		if (!date1 || !date2) return false;
		return (
			date1.getFullYear() === date2.getFullYear() &&
			date1.getMonth() === date2.getMonth() &&
			date1.getDate() === date2.getDate()
		);
	};

	// Check if any filter is active (not default values)
	// Use controlled values to check what's actually applied
	const defaultDateRange = getDefaultDateRange();
	
	// Get actual applied values (controlled props take precedence)
	const appliedRegion = controlledRegion ?? region;
	const appliedPlatform = controlledPlatform ?? platform;
	const appliedTopicId = controlledTopicId ?? topicId;
	const appliedDateRange = controlledDateRange ?? dateRange;
	
	// Check if date range is different from default (last 30 days)
	const isDefaultDateRange = 
		appliedDateRange?.from && 
		appliedDateRange?.to &&
		isSameDay(appliedDateRange.from, defaultDateRange.from) &&
		isSameDay(appliedDateRange.to, defaultDateRange.to);
	
	const hasActiveFilters = 
		appliedRegion !== "GLOBAL" ||
		appliedPlatform !== "all" ||
		appliedTopicId !== "all" ||
		!isDefaultDateRange;

	return (
		<div className={`rounded-lg bg-card p-3 ${className ?? ""}`}>
			<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
				<div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
					<div className="w-full md:w-52">
						<CountrySelect
							value={region}
							onValueChange={(newRegion) => {
								setRegion(newRegion);
								// Auto-apply when region changes
								onApply?.({ region: newRegion, dateRange, platform, topicId });
							}}
							placeholder="Select country..."
						/>
					</div>

					<div className="w-full md:w-64">
						<DateRangePicker
							value={dateRange}
							onChange={(newRange) => {
								// Update local state
								setDateRange(newRange);
								// Apply immediately when Apply button is clicked in picker
								if (newRange.from && newRange.to) {
									onApply?.({ region, dateRange: newRange, platform, topicId });
								}
							}}
						/>
					</div>

					<div className="w-full md:w-52">
						<Select 
							value={platform} 
							onValueChange={(newPlatform) => {
								setPlatform(newPlatform);
								// Auto-apply when platform changes
								onApply?.({ region, dateRange, platform: newPlatform, topicId });
							}}
						>
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

					<div className="w-full md:w-52">
						<Select 
							value={topicId} 
							onValueChange={(newTopicId) => {
								setTopicId(newTopicId);
								// Auto-apply when topic changes
								onApply?.({ region, dateRange, platform, topicId: newTopicId });
							}}
						>
							<SelectTrigger className="w-full">
								<SelectValue placeholder="Topic" />
							</SelectTrigger>
							<SelectContent>
								<SelectGroup>
									<SelectLabel>Topic</SelectLabel>
									<SelectItem value="all">All Topics</SelectItem>
									{topics.map((topic) => (
										<SelectItem key={topic.id} value={topic.id}>
											<div className="flex items-center gap-2">
												{topic.color && (
													<div
														className="h-3 w-3 rounded-full"
														style={{ backgroundColor: topic.color }}
													/>
												)}
												<span>{topic.name}</span>
											</div>
										</SelectItem>
									))}
								</SelectGroup>
							</SelectContent>
						</Select>
					</div>
				</div>

				{hasActiveFilters && (
					<div className="flex items-center gap-2">
						<Separator className="hidden h-6 md:block" orientation="vertical" />
						<Button variant="secondary" onClick={resetFilters}>Reset</Button>
					</div>
				)}
			</div>
		</div>
	);
}
