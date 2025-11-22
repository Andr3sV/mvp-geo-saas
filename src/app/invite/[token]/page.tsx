"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle, Mail } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function InvitePage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<any>(null);
  const [accepted, setAccepted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    loadInvitation();
  }, [token]);

  const loadInvitation = async () => {
    try {
      // Check if user is logged in
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);

      // Fetch invitation details
      const { data: invite, error: inviteError } = await supabase
        .from("invitations")
        .select(`
          *,
          workspaces (
            id,
            name,
            slug
          ),
          projects (
            id,
            name,
            slug
          )
        `)
        .eq("token", token)
        .is("accepted_at", null)
        .single();

      if (inviteError || !invite) {
        setError("Invalid or expired invitation link");
        setLoading(false);
        return;
      }

      // Check if invitation has expired
      if (new Date(invite.expires_at) < new Date()) {
        setError("This invitation has expired");
        setLoading(false);
        return;
      }

      setInvitation(invite);
      setLoading(false);
    } catch (err) {
      setError("Failed to load invitation");
      setLoading(false);
    }
  };

  const acceptInvitation = async () => {
    if (!user) {
      // Redirect to login with return URL
      router.push(`/login?redirect=/invite/${token}`);
      return;
    }

    setAccepting(true);
    setError(null);

    try {
      // Check if user's email matches the invitation
      if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
        setError(
          `This invitation was sent to ${invitation.email}. Please log in with that email address.`
        );
        setAccepting(false);
        return;
      }

      // Accept workspace invitation
      if (invitation.workspace_id && !invitation.project_id) {
        // Add user to workspace_members
        const { error: memberError } = await supabase
          .from("workspace_members")
          .insert({
            workspace_id: invitation.workspace_id,
            user_id: user.id,
            role: invitation.role,
          });

        if (memberError) {
          setError(memberError.message);
          setAccepting(false);
          return;
        }
      }

      // Accept project invitation
      if (invitation.project_id) {
        // Add user to project_members
        const { error: memberError } = await supabase
          .from("project_members")
          .insert({
            project_id: invitation.project_id,
            user_id: user.id,
            role: invitation.role,
          });

        if (memberError) {
          setError(memberError.message);
          setAccepting(false);
          return;
        }
      }

      // Mark invitation as accepted
      const { error: updateError } = await supabase
        .from("invitations")
        .update({ accepted_at: new Date().toISOString() })
        .eq("id", invitation.id);

      if (updateError) {
        setError(updateError.message);
        setAccepting(false);
        return;
      }

      setAccepted(true);
      setAccepting(false);

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to accept invitation");
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="mx-auto h-12 w-12 text-destructive" />
            <CardTitle className="mt-4">Invalid Invitation</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Link href="/dashboard">
              <Button>Go to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
            <CardTitle className="mt-4">Invitation Accepted!</CardTitle>
            <CardDescription>
              You've successfully joined{" "}
              {invitation.workspaces?.name || invitation.projects?.name}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">
              Redirecting to dashboard...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center px-4">
          <Image
            src="/ateneai-logo.png"
            alt="Ateneai"
            width={150}
            height={40}
            className="h-10 w-auto"
          />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Mail className="mx-auto h-12 w-12 text-primary" />
            <CardTitle className="mt-4">You've been invited!</CardTitle>
            <CardDescription>
              {invitation.workspaces && (
                <>
                  You've been invited to join <strong>{invitation.workspaces.name}</strong> workspace
                  as a <strong>{invitation.role}</strong>
                </>
              )}
              {invitation.projects && (
                <>
                  You've been invited to join <strong>{invitation.projects.name}</strong> project
                  as a <strong>{invitation.role}</strong>
                </>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {!user && (
              <div className="rounded-md bg-muted p-4 text-center text-sm">
                <p className="mb-3">You need to be logged in to accept this invitation</p>
                <div className="flex flex-col gap-2">
                  <Link href={`/login?redirect=/invite/${token}`}>
                    <Button className="w-full">Sign In</Button>
                  </Link>
                  <Link href={`/register?redirect=/invite/${token}`}>
                    <Button variant="outline" className="w-full">
                      Create Account
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {user && (
              <>
                <div className="rounded-md bg-muted p-4 text-sm">
                  <p className="mb-1 font-medium">Invited email:</p>
                  <p className="text-muted-foreground">{invitation.email}</p>
                  <p className="mt-3 mb-1 font-medium">Your email:</p>
                  <p className="text-muted-foreground">{user.email}</p>
                </div>

                <Button
                  onClick={acceptInvitation}
                  disabled={accepting}
                  className="w-full"
                >
                  {accepting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Accepting invitation...
                    </>
                  ) : (
                    "Accept Invitation"
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

