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
import { EntityFilterSelect, type EntityFilterValue } from "@/components/dashboard/entity-filter-select";
import { useState, useEffect } from "react";
import { useProject } from "@/contexts/project-context";
import { getCurrentWeekDateRange } from "@/lib/utils/date-helpers";
import { getProjectTopics } from "@/lib/actions/topics";
import { getProjectTopics as getBrandEvaluationTopics } from "@/lib/queries/brand-evaluations";
import { Calendar, MapPin, Layers, Tag, FilterX } from "lucide-react";

interface FiltersToolbarProps {
	className?: string;
	dateRange?: DateRangeValue;
	platform?: string;
	region?: string;
	topicId?: string;
	sentimentTheme?: string;
	hidePlatformFilter?: boolean;
	hideTopicFilter?: boolean;
	showSentimentThemeFilter?: boolean;
	showEntityFilter?: boolean;
	selectedEntities?: EntityFilterValue;
	onApply?: (filters: { 
		region: string; 
		dateRange: DateRangeValue;
		platform: string;
		topicId?: string;
		sentimentTheme?: string;
		selectedEntities?: EntityFilterValue;
	}) => void;
}

export function FiltersToolbar({ 
	className, 
	dateRange: controlledDateRange, 
	platform: controlledPlatform,
	region: controlledRegion,
	topicId: controlledTopicId,
	sentimentTheme: controlledSentimentTheme,
	hidePlatformFilter = false,
	hideTopicFilter = false,
	showSentimentThemeFilter = false,
	showEntityFilter = false,
	selectedEntities: controlledSelectedEntities,
	onApply 
}: FiltersToolbarProps) {
	const { selectedProjectId } = useProject();
	const [region, setRegion] = useState<string>(controlledRegion || "GLOBAL");
	const [dateRange, setDateRange] = useState<DateRangeValue>(
		controlledDateRange || getCurrentWeekDateRange()
	);
	const [platform, setPlatform] = useState<string>(controlledPlatform || "all");
	const [topicId, setTopicId] = useState<string>(controlledTopicId || "all");
	const [sentimentTheme, setSentimentTheme] = useState<string>(controlledSentimentTheme || "all");
	const [selectedEntities, setSelectedEntities] = useState<EntityFilterValue>(
		controlledSelectedEntities || [{ id: null, type: "brand" }]
	);
	const [topics, setTopics] = useState<any[]>([]);
	const [sentimentTopics, setSentimentTopics] = useState<string[]>([]);
	const [availableRegionsCount, setAvailableRegionsCount] = useState<number>(0);

	// Load topics for the project
	useEffect(() => {
		if (selectedProjectId) {
			loadTopics();
			if (showSentimentThemeFilter) {
				loadSentimentTopics();
			}
			loadRegionsCount();
		}
	}, [selectedProjectId, showSentimentThemeFilter]);

	const loadRegionsCount = async () => {
		if (!selectedProjectId) return;
		try {
			const { getProjectRegionsForSelect } = await import("@/lib/queries/regions");
			const regions = await getProjectRegionsForSelect(selectedProjectId);
			setAvailableRegionsCount(regions?.length || 0);
		} catch (error) {
			// If error, assume multiple regions available (use full countries list)
			setAvailableRegionsCount(100); // Large number to indicate multiple options
		}
	};

	const loadTopics = async () => {
		if (!selectedProjectId) return;
		const result = await getProjectTopics(selectedProjectId);
		if (result.data) {
			setTopics(result.data);
		}
	};

	const loadSentimentTopics = async () => {
		if (!selectedProjectId) return;
		const result = await getBrandEvaluationTopics(selectedProjectId);
		if (result.topics) {
			setSentimentTopics(result.topics);
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

	useEffect(() => {
		if (controlledSentimentTheme !== undefined) {
			setSentimentTheme(controlledSentimentTheme);
		}
	}, [controlledSentimentTheme]);

	useEffect(() => {
		if (controlledSelectedEntities !== undefined) {
			setSelectedEntities(controlledSelectedEntities);
		}
	}, [controlledSelectedEntities]);

	const getDefaultDateRange = () => getCurrentWeekDateRange();

	const resetFilters = () => {
		const resetDateRange = getDefaultDateRange();
		const resetRegion = "GLOBAL";
		const resetPlatform = "all";
		const resetTopicId = "all";
		const resetSentimentTheme = "all";
		const resetSelectedEntities: EntityFilterValue = [{ id: null, type: "brand" }];
		setRegion(resetRegion);
		setDateRange(resetDateRange);
		setPlatform(resetPlatform);
		setTopicId(resetTopicId);
		setSentimentTheme(resetSentimentTheme);
		setSelectedEntities(resetSelectedEntities);
		// Auto-apply reset
		onApply?.({ 
			region: resetRegion, 
			dateRange: resetDateRange, 
			platform: resetPlatform, 
			topicId: resetTopicId, 
			sentimentTheme: resetSentimentTheme,
			selectedEntities: resetSelectedEntities
		});
	};

	// Helper to compare dates (same day, ignoring time)
	const isSameDay = (date1: Date | undefined, date2: Date | undefined) => {
		if (!date1 || !date2) return true; // If either is undefined, consider them equal (no change)
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
	const appliedSentimentTheme = controlledSentimentTheme ?? sentimentTheme;
	const appliedDateRange = controlledDateRange ?? dateRange;
	
	// Check if date range is different from default (current week)
	const isDateRangeChanged = 
		!isSameDay(appliedDateRange?.from, defaultDateRange.from) ||
		!isSameDay(appliedDateRange?.to, defaultDateRange.to);
	
	const appliedSelectedEntities = controlledSelectedEntities ?? selectedEntities;
	const isDefaultEntityFilter = 
		!showEntityFilter || 
		(Array.isArray(appliedSelectedEntities) && 
		 appliedSelectedEntities.length === 1 && 
		 appliedSelectedEntities[0].type === "brand" && 
		 appliedSelectedEntities[0].id === null);

	// Region filter is only considered active if:
	// 1. It's not GLOBAL AND
	// 2. There are multiple regions available (more than 1)
	const isRegionFilterActive = 
		appliedRegion !== "GLOBAL" && availableRegionsCount > 1;

	const hasActiveFilters = 
		isRegionFilterActive ||
		(!hidePlatformFilter && appliedPlatform !== "all") ||
		(!hideTopicFilter && appliedTopicId !== "all") ||
		(showSentimentThemeFilter && appliedSentimentTheme !== "all") ||
		isDateRangeChanged ||
		!isDefaultEntityFilter;

	return (
		<div className={`border-t border-b bg-muted/30 -mx-6 ${className ?? ""}`}>
			<div className="flex flex-col gap-3 px-6 py-3 md:flex-row md:items-center md:justify-between">
				<div className="flex flex-1 flex-wrap gap-3 md:flex-row md:items-center">
					{/* Date Filter */}
					<div className="w-full md:w-auto">
						<DateRangePicker
							value={dateRange}
							onChange={(newRange) => {
								// Update local state
								setDateRange(newRange);
								// Apply immediately when Apply button is clicked in picker
								if (newRange.from && newRange.to) {
									onApply?.({ region, dateRange: newRange, platform, topicId, sentimentTheme, selectedEntities });
								}
							}}
						/>
					</div>

					{/* Region Filter */}
					<div className="w-full md:w-auto">
						<CountrySelect
							value={region}
							onValueChange={(newRegion) => {
								setRegion(newRegion);
								// Auto-apply when region changes
								onApply?.({ region: newRegion, dateRange, platform, topicId, sentimentTheme, selectedEntities });
							}}
							placeholder="Select country..."
							projectId={selectedProjectId || undefined}
						/>
					</div>

					{showEntityFilter && selectedProjectId && (
					<div className="w-full md:w-auto">
						<EntityFilterSelect
							projectId={selectedProjectId}
							value={selectedEntities}
							onValueChange={(newEntities) => {
								setSelectedEntities(newEntities);
								// Auto-apply when entity filter changes
								onApply?.({ region, dateRange, platform, topicId, sentimentTheme, selectedEntities: newEntities });
							}}
							placeholder="Select entities..."
						/>
					</div>
					)}

					{!hidePlatformFilter && (
					<div className="w-full md:w-auto">
						<Select 
							value={platform} 
							onValueChange={(newPlatform) => {
								setPlatform(newPlatform);
								// Auto-apply when platform changes
								onApply?.({ region, dateRange, platform: newPlatform, topicId, sentimentTheme, selectedEntities });
							}}
						>
							<SelectTrigger className="w-full md:w-auto md:min-w-[140px]">
								<div className="flex items-center gap-2 flex-1 min-w-0">
									<Layers className="h-4 w-4 text-muted-foreground shrink-0" />
									<SelectValue placeholder="All Channels" className="flex-1" />
								</div>
							</SelectTrigger>
							<SelectContent>
								<SelectGroup>
									<SelectLabel>Platform</SelectLabel>
									<SelectItem value="all">All Channels</SelectItem>
									<SelectItem value="openai">OpenAI</SelectItem>
									<SelectItem value="gemini">Gemini</SelectItem>
								</SelectGroup>
							</SelectContent>
						</Select>
					</div>
					)}

					{showSentimentThemeFilter && sentimentTopics.length > 0 && (
					<div className="w-full md:w-auto">
						<Select 
							value={sentimentTheme} 
							onValueChange={(newTheme) => {
								setSentimentTheme(newTheme);
								// Auto-apply when sentiment theme changes
								onApply?.({ region, dateRange, platform, topicId, sentimentTheme: newTheme, selectedEntities });
							}}
						>
							<SelectTrigger className="w-full md:w-[160px]">
								<div className="flex items-center gap-2">
									<Tag className="h-4 w-4 text-muted-foreground" />
									<SelectValue placeholder="Category" />
								</div>
							</SelectTrigger>
							<SelectContent>
								<SelectGroup>
									<SelectLabel>All Sentiment Topics</SelectLabel>
									<SelectItem value="all">All Sentiment Topics</SelectItem>
									{sentimentTopics.map((topic) => (
										<SelectItem key={topic} value={topic}>
											{topic}
										</SelectItem>
									))}
								</SelectGroup>
							</SelectContent>
						</Select>
					</div>
					)}

					{!hideTopicFilter && (
					<div className="w-full md:w-auto">
						<Select 
							value={topicId} 
							onValueChange={(newTopicId) => {
								setTopicId(newTopicId);
								// Auto-apply when topic changes
								onApply?.({ region, dateRange, platform, topicId: newTopicId, sentimentTheme, selectedEntities });
							}}
						>
							<SelectTrigger className="w-full md:w-auto md:min-w-[140px]">
								<div className="flex items-center gap-2 flex-1 min-w-0">
									<Tag className="h-4 w-4 text-muted-foreground shrink-0" />
									<SelectValue placeholder="Topic" className="flex-1" />
								</div>
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
					)}
				</div>

				{hasActiveFilters && (
					<div className="flex items-center gap-2">
						<Separator className="hidden h-6 md:block" orientation="vertical" />
						<Button variant="ghost" size="sm" onClick={resetFilters} className="gap-2">
							<FilterX className="h-4 w-4" />
							Reset
						</Button>
					</div>
				)}
			</div>
		</div>
	);
}
