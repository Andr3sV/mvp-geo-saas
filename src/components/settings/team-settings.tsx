"use client";

import { useState, useEffect } from "react";
import { UserPlus, Mail, Trash2, Copy, Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getUserWorkspacesWithProjects } from "@/lib/queries/workspace";
import {
  inviteToWorkspace,
  inviteToProject,
  getPendingInvitations,
  cancelInvitation,
} from "@/lib/actions/invitations";

export function TeamSettings() {
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteType, setInviteType] = useState<"workspace" | "project">("workspace");
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("member");
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const workspacesData = await getUserWorkspacesWithProjects();
    setWorkspaces(workspacesData);

    const invitesResult = await getPendingInvitations();
    if (invitesResult.data) {
      setPendingInvites(invitesResult.data);
    }

    setLoading(false);
  };

  const handleSendInvite = async () => {
    if (!inviteEmail.trim()) {
      setError("Email is required");
      return;
    }

    setActionLoading(true);
    setError(null);
    setInviteLink(null);

    let result;

    if (inviteType === "workspace") {
      const workspace = workspaces[0];
      if (!workspace) {
        setError("No workspace found");
        setActionLoading(false);
        return;
      }

      result = await inviteToWorkspace({
        email: inviteEmail,
        workspace_id: workspace.id,
        role: inviteRole as "admin" | "member",
      });
    } else {
      if (!selectedProject) {
        setError("Please select a project");
        setActionLoading(false);
        return;
      }

      result = await inviteToProject({
        email: inviteEmail,
        project_id: selectedProject,
        role: inviteRole as "admin" | "member" | "viewer",
      });
    }

    setActionLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (result.data?.inviteLink) {
      setInviteLink(result.data.inviteLink);
    }

    setInviteEmail("");
    setInviteRole("member");
    loadData();
  };

  const handleCancelInvite = async (inviteId: string) => {
    const result = await cancelInvitation(inviteId);
    if (!result.error) {
      loadData();
    }
  };

  const copyInviteLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  const allProjects = workspaces.flatMap((w) => w.projects || []);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>
                Invite users to your workspace or specific projects
              </CardDescription>
            </div>
            <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Invite Member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Team Member</DialogTitle>
                  <DialogDescription>
                    Send an invitation to join your team
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {error && (
                    <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                      {error}
                    </div>
                  )}
                  {inviteLink && (
                    <div className="rounded-md bg-green-50 p-3 dark:bg-green-950/20">
                      <p className="text-sm font-medium text-green-900 dark:text-green-100 mb-2">
                        ✅ Invitation sent!
                      </p>
                      <div className="flex items-center gap-2">
                        <Input
                          value={inviteLink}
                          readOnly
                          className="text-xs"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={copyInviteLink}
                        >
                          {copied ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-green-700 dark:text-green-300 mt-2">
                        Share this link with the invited user. Email functionality
                        will be added in Phase 7.
                      </p>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="invite-type">Invite To</Label>
                    <Select
                      value={inviteType}
                      onValueChange={(value: any) => setInviteType(value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="workspace">Workspace</SelectItem>
                        <SelectItem value="project">Specific Project</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {inviteType === "project" && (
                    <div className="space-y-2">
                      <Label htmlFor="project-select">Select Project</Label>
                      <Select
                        value={selectedProject}
                        onValueChange={setSelectedProject}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a project" />
                        </SelectTrigger>
                        <SelectContent>
                          {allProjects.map((project) => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="invite-email">Email Address</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="colleague@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      disabled={actionLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invite-role">Role</Label>
                    <Select value={inviteRole} onValueChange={setInviteRole}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {inviteType === "workspace" ? (
                          <>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="member">Member</SelectItem>
                          </>
                        ) : (
                          <>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsInviteOpen(false);
                      setInviteLink(null);
                      setError(null);
                    }}
                    disabled={actionLoading}
                  >
                    Close
                  </Button>
                  <Button onClick={handleSendInvite} disabled={actionLoading}>
                    {actionLoading ? "Sending..." : "Send Invitation"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Pending Invitations */}
            {pendingInvites.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-3">Pending Invitations</h3>
                <div className="space-y-2">
                  {pendingInvites.map((invite) => (
                    <div
                      key={invite.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{invite.email}</p>
                          <p className="text-xs text-muted-foreground">
                            {invite.workspaces?.name || invite.projects?.name} •{" "}
                            {invite.role}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancelInvite(invite.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Info */}
            <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-900 dark:bg-blue-950/20">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                💡 <strong>Note:</strong> Email notifications will be sent automatically
                when email integration is implemented in Phase 7. For now, share the
                invitation link manually.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

