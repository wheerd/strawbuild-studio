-- Seed data for local Supabase development

-- Test user for E2E tests
-- Password: test-password-123 (set TEST_USER_PASSWORD env var to match)
CREATE OR REPLACE FUNCTION public.create_test_user(
    user_email text,
    user_password text,
    user_name text
) RETURNS void AS $$
DECLARE
    user_id uuid;
    encrypted_pw text;
    identity_id uuid;
BEGIN
    user_id := gen_random_uuid();
    encrypted_pw := crypt(user_password, gen_salt('bf'));
    identity_id := gen_random_uuid();

    -- Insert into auth.users
    INSERT INTO auth.users (
        id,
        instance_id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        recovery_sent_at,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
    ) VALUES (
        user_id,
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        user_email,
        encrypted_pw,
        now(),
        now(),
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('full_name', user_name),
        now(),
        now(),
        '',
        '',
        '',
        ''
    );

    -- Insert into auth.identities (required for Supabase Auth)
    INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
    ) VALUES (
        identity_id,
        user_id,
        jsonb_build_object('sub', user_id::text, 'email', user_email),
        'email',
        user_id::text,
        now(),
        now(),
        now()
    );

    -- User profile is created automatically via trigger
END;
$$ LANGUAGE plpgsql;

-- Create test user if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'test@strawbaler.dev') THEN
        PERFORM public.create_test_user('test@strawbaler.dev', 'test-password-123', 'Test User');
    END IF;
END $$;

-- Clean up function (optional, keeps seed idempotent)
DROP FUNCTION IF EXISTS public.create_test_user(text, text, text);
