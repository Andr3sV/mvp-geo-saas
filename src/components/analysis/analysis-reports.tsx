"use client";

import { useEffect, useState } from "react";
import { useProject } from "@/contexts/project-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/dashboard/empty-state";
import { StatCard } from "@/components/dashboard/stat-card";
import { 
  getAnalysisJobs, 
  getAnalysisStats, 
  type AnalysisJob 
} from "@/lib/actions/analysis";
import { 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Clock, 
  TrendingUp,
  Zap,
  DollarSign,
  Target,
} from "lucide-react";

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    icon: Clock,
    color: "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300",
  },
  running: {
    label: "Running",
    icon: Loader2,
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  },
  failed: {
    label: "Failed",
    icon: XCircle,
    color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  },
  cancelled: {
    label: "Cancelled",
    icon: XCircle,
    color: "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300",
  },
};

export function AnalysisReports() {
  const { selectedProjectId } = useProject();
  const [jobs, setJobs] = useState<AnalysisJob[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedProjectId) {
      loadData();
    }
  }, [selectedProjectId]);

  const loadData = async () => {
    if (!selectedProjectId) return;

    setLoading(true);

    const [jobsResult, statsResult] = await Promise.all([
      getAnalysisJobs(selectedProjectId),
      getAnalysisStats(selectedProjectId),
    ]);

    if (jobsResult.data) {
      setJobs(jobsResult.data);
    }

    if (statsResult.data) {
      setStats(statsResult.data);
    }

    setLoading(false);
  };

  if (!selectedProjectId) {
    return (
      <Card>
        <CardContent className="py-12">
          <EmptyState
            title="No Project Selected"
            description="Please select a project to view analysis reports"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Jobs"
            value={stats.totalJobs}
            description="Analysis jobs run"
            icon={Zap}
          />
          <StatCard
            title="Completed Jobs"
            value={stats.completedJobs}
            description="Successfully completed"
            icon={CheckCircle2}
          />
          <StatCard
            title="Citations Found"
            value={stats.totalCitations}
            description="Brand mentions detected"
            icon={Target}
          />
          <StatCard
            title="Total Cost"
            value={`$${stats.totalCost}`}
            description="API usage cost"
            icon={DollarSign}
          />
        </div>
      )}

      {/* Analysis Jobs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Analysis Jobs</CardTitle>
          <CardDescription>
            View all analysis jobs run across AI platforms
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              Loading analysis jobs...
            </div>
          ) : jobs.length === 0 ? (
            <EmptyState
              title="No analysis jobs yet"
              description="Run your first prompt analysis to see results here"
              action={
                <Button onClick={() => window.location.href = "/dashboard/prompts"}>
                  Go to Prompts
                </Button>
              }
            />
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Platforms</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job) => {
                    const statusConfig = STATUS_CONFIG[job.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
                    const StatusIcon = statusConfig.icon;
                    const duration = job.completed_at && job.started_at
                      ? Math.round((new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()) / 1000)
                      : null;

                    return (
                      <TableRow key={job.id}>
                        <TableCell>
                          <Badge variant="secondary" className={statusConfig.color}>
                            <StatusIcon className={`h-3 w-3 mr-1 ${job.status === 'running' ? 'animate-spin' : ''}`} />
                            {statusConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(job.created_at).toLocaleDateString()} {new Date(job.created_at).toLocaleTimeString()}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {job.total_platforms} platforms
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-secondary rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full transition-all"
                                style={{
                                  width: `${(job.completed_platforms / job.total_platforms) * 100}%`,
                                }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {job.completed_platforms}/{job.total_platforms}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {duration ? `${duration}s` : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.location.href = `/dashboard/analysis/${job.id}`}
                          >
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

