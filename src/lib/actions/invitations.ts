"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";

function generateInvitationToken(): string {
  return randomBytes(32).toString("hex");
}

export async function inviteToWorkspace(data: {
  email: string;
  workspace_id: string;
  role: "admin" | "member";
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated", data: null };
  }

  // Check if user is already a member
  const { data: existingMember } = await supabase
    .from("workspace_members")
    .select("id")
    .eq("workspace_id", data.workspace_id)
    .eq("user_id", user.id)
    .single();

  if (existingMember) {
    return { error: "User is already a member of this workspace", data: null };
  }

  // Check for existing invitation
  const { data: existingInvite } = await supabase
    .from("invitations")
    .select("id")
    .eq("email", data.email)
    .eq("workspace_id", data.workspace_id)
    .is("accepted_at", null)
    .single();

  if (existingInvite) {
    return { error: "An invitation has already been sent to this email", data: null };
  }

  // Create invitation
  const token = generateInvitationToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  const { data: invitation, error } = await supabase
    .from("invitations")
    .insert({
      email: data.email,
      workspace_id: data.workspace_id,
      role: data.role,
      invited_by: user.id,
      token,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) {
    return { error: error.message, data: null };
  }

  revalidatePath("/", "layout");
  
  // TODO: Send email with invitation link in Phase 7
  // For now, just return the token
  return { 
    error: null, 
    data: { 
      ...invitation, 
      inviteLink: `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}` 
    } 
  };
}

export async function inviteToProject(data: {
  email: string;
  project_id: string;
  role: "admin" | "member" | "viewer";
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated", data: null };
  }

  // Check if user is already a project member
  const { data: existingMember } = await supabase
    .from("project_members")
    .select("id")
    .eq("project_id", data.project_id)
    .eq("user_id", user.id)
    .single();

  if (existingMember) {
    return { error: "User is already a member of this project", data: null };
  }

  // Check for existing invitation
  const { data: existingInvite } = await supabase
    .from("invitations")
    .select("id")
    .eq("email", data.email)
    .eq("project_id", data.project_id)
    .is("accepted_at", null)
    .single();

  if (existingInvite) {
    return { error: "An invitation has already been sent to this email", data: null };
  }

  // Create invitation
  const token = generateInvitationToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  const { data: invitation, error } = await supabase
    .from("invitations")
    .insert({
      email: data.email,
      project_id: data.project_id,
      role: data.role,
      invited_by: user.id,
      token,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) {
    return { error: error.message, data: null };
  }

  revalidatePath("/", "layout");
  
  return { 
    error: null, 
    data: { 
      ...invitation, 
      inviteLink: `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}` 
    } 
  };
}

export async function getPendingInvitations() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated", data: null };
  }

  const { data: invitations, error } = await supabase
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
    .eq("invited_by", user.id)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString());

  if (error) {
    return { error: error.message, data: null };
  }

  return { error: null, data: invitations };
}

export async function cancelInvitation(invitationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated", success: false };
  }

  const { error } = await supabase
    .from("invitations")
    .delete()
    .eq("id", invitationId)
    .eq("invited_by", user.id);

  if (error) {
    return { error: error.message, success: false };
  }

  revalidatePath("/", "layout");
  return { error: null, success: true };
}

