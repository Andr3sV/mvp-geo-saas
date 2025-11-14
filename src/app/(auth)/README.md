# Authentication Flow

## Routes

- `/login` - Sign in page
- `/register` - Sign up page
- `/auth/callback` - OAuth callback handler

## Features

✅ Email/Password authentication
✅ User profile creation on signup
✅ Automatic redirect to onboarding after registration
✅ Protected routes via middleware
✅ Server-side session validation

## How it works

1. User registers at `/register`
2. Supabase creates auth user + profile via trigger
3. User is redirected to `/onboarding` to create workspace
4. After onboarding, user accesses `/dashboard`
5. Middleware protects all dashboard routes

## Testing

Before testing, ensure you've:
1. Ran the SQL migration in Supabase
2. Updated `.env.local` with Supabase credentials
3. Enabled email auth in Supabase dashboard

Test flow:
1. Go to http://localhost:3055/register
2. Create an account
3. Should redirect to onboarding (to be created in Phase 2)

