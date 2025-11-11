-- supabase/seed.sql
--
-- this file is executed automatically by the supabase cli after all migrations are run.
-- it's used to seed the database with essential data for development and testing.
--
-- in this case, we are inserting a default user into the auth.users table.
-- this is necessary because the 'projects' table has a foreign key constraint
-- on the 'user_id' column, and our tests and initial setup rely on this default user existing.

-- make sure the pgcrypto extension is enabled for crypt() function.
create extension if not exists pgcrypto;

-- insert the default user with a dummy email and password.
-- this user will have the id defined as default_user_id in the application code.
insert into auth.users (
  id,
  email,
  role,
  aud,
  encrypted_password,
  instance_id
) values (
  'e6647fd0-ef21-449e-a372-19a6bfb3ba8e',
  'dev@test.com',
  'authenticated',
  'authenticated',
  crypt('password', gen_salt('bf')),
  '00000000-0000-0000-0000-000000000000'
);
