SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict M3feZA1yQL6YEygaEGKIiSGg8n9IdbpQEDPcFuAJzijmLaPGym5lm6sXgDJtw0B

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."audit_log_entries" ("instance_id", "id", "payload", "created_at", "ip_address") VALUES
	('00000000-0000-0000-0000-000000000000', '5b392abe-a4c3-4ca4-8c38-b1b4eaf30add', '{"action":"user_signedup","actor_id":"b0303889-9ae1-415d-915d-39afb4559ba5","actor_username":"user1@kot.pl","actor_via_sso":false,"log_type":"team","traits":{"provider":"email"}}', '2025-12-02 22:55:14.177866+00', ''),
	('00000000-0000-0000-0000-000000000000', '65affbeb-306b-4a14-9080-1d0da8dd41e4', '{"action":"login","actor_id":"b0303889-9ae1-415d-915d-39afb4559ba5","actor_username":"user1@kot.pl","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-12-02 22:55:14.180967+00', ''),
	('00000000-0000-0000-0000-000000000000', 'c746caa2-8209-4355-93e1-1c069b406c5c', '{"action":"login","actor_id":"b0303889-9ae1-415d-915d-39afb4559ba5","actor_username":"user1@kot.pl","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-12-03 18:28:54.157064+00', ''),
	('00000000-0000-0000-0000-000000000000', 'e1f444b8-3004-40b9-8a91-4e5d93583147', '{"action":"login","actor_id":"b0303889-9ae1-415d-915d-39afb4559ba5","actor_username":"user1@kot.pl","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-12-04 20:04:02.282948+00', '');


--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."users" ("instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at", "invited_at", "confirmation_token", "confirmation_sent_at", "recovery_token", "recovery_sent_at", "email_change_token_new", "email_change", "email_change_sent_at", "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", "is_super_admin", "created_at", "updated_at", "phone", "phone_confirmed_at", "phone_change", "phone_change_token", "phone_change_sent_at", "email_change_token_current", "email_change_confirm_status", "banned_until", "reauthentication_token", "reauthentication_sent_at", "is_sso_user", "deleted_at", "is_anonymous") VALUES
	('00000000-0000-0000-0000-000000000000', 'e6647fd0-ef21-449e-a372-19a6bfb3ba8e', 'authenticated', 'authenticated', 'dev@test.com', '$2a$06$kl2NOJdxut4cRBuUyINn.uD3DG0Jzl.k/oOAs6lLX0UjlpSS38YrW', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', 'b0303889-9ae1-415d-915d-39afb4559ba5', 'authenticated', 'authenticated', 'user1@kot.pl', '$2a$10$Hy7.6XLGEw5wD8a4Xb8FvOd3fageGIEWejiQHkhIMk5yd7t285TAi', '2025-12-02 22:55:14.178938+00', NULL, '', NULL, '', NULL, '', '', NULL, '2025-12-04 20:04:02.28389+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "b0303889-9ae1-415d-915d-39afb4559ba5", "email": "user1@kot.pl", "email_verified": true, "phone_verified": false}', NULL, '2025-12-02 22:55:14.172228+00', '2025-12-04 20:04:02.285975+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false);


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."identities" ("provider_id", "user_id", "identity_data", "provider", "last_sign_in_at", "created_at", "updated_at", "id") VALUES
	('b0303889-9ae1-415d-915d-39afb4559ba5', 'b0303889-9ae1-415d-915d-39afb4559ba5', '{"sub": "b0303889-9ae1-415d-915d-39afb4559ba5", "email": "user1@kot.pl", "email_verified": false, "phone_verified": false}', 'email', '2025-12-02 22:55:14.176385+00', '2025-12-02 22:55:14.176405+00', '2025-12-02 22:55:14.176405+00', '796baf88-f9e0-446a-abb7-4f4853a79df2');


--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."sessions" ("id", "user_id", "created_at", "updated_at", "factor_id", "aal", "not_after", "refreshed_at", "user_agent", "ip", "tag", "oauth_client_id", "refresh_token_hmac_key", "refresh_token_counter") VALUES
	('478f26f0-b28c-4809-b1c3-014648e2574b', 'b0303889-9ae1-415d-915d-39afb4559ba5', '2025-12-02 22:55:14.181277+00', '2025-12-02 22:55:14.181277+00', NULL, 'aal1', NULL, NULL, 'node', '172.19.0.1', NULL, NULL, NULL, NULL),
	('bfb42cf3-e77f-47db-ae9b-5fd04b9dcdb4', 'b0303889-9ae1-415d-915d-39afb4559ba5', '2025-12-03 18:28:54.157994+00', '2025-12-03 18:28:54.157994+00', NULL, 'aal1', NULL, NULL, 'node', '172.19.0.1', NULL, NULL, NULL, NULL),
	('899218b5-8f23-4325-8ffd-1ce74beb43bd', 'b0303889-9ae1-415d-915d-39afb4559ba5', '2025-12-04 20:04:02.283961+00', '2025-12-04 20:04:02.283961+00', NULL, 'aal1', NULL, NULL, 'node', '172.19.0.1', NULL, NULL, NULL, NULL);


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."mfa_amr_claims" ("session_id", "created_at", "updated_at", "authentication_method", "id") VALUES
	('478f26f0-b28c-4809-b1c3-014648e2574b', '2025-12-02 22:55:14.185142+00', '2025-12-02 22:55:14.185142+00', 'password', 'ded80589-9787-4dd0-8638-e9ec828f658f'),
	('bfb42cf3-e77f-47db-ae9b-5fd04b9dcdb4', '2025-12-03 18:28:54.159925+00', '2025-12-03 18:28:54.159925+00', 'password', 'adea4506-c1db-4d44-b3d6-bbeb98d2f2ca'),
	('899218b5-8f23-4325-8ffd-1ce74beb43bd', '2025-12-04 20:04:02.286199+00', '2025-12-04 20:04:02.286199+00', 'password', 'cb7e4afd-c43f-472e-a9ab-387f3c310d8c');


--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."refresh_tokens" ("instance_id", "id", "token", "user_id", "revoked", "created_at", "updated_at", "parent", "session_id") VALUES
	('00000000-0000-0000-0000-000000000000', 1, 'rh7fx4xndpda', 'b0303889-9ae1-415d-915d-39afb4559ba5', false, '2025-12-02 22:55:14.183221+00', '2025-12-02 22:55:14.183221+00', NULL, '478f26f0-b28c-4809-b1c3-014648e2574b'),
	('00000000-0000-0000-0000-000000000000', 2, 'fgbtx2h2mtr2', 'b0303889-9ae1-415d-915d-39afb4559ba5', false, '2025-12-03 18:28:54.158813+00', '2025-12-03 18:28:54.158813+00', NULL, 'bfb42cf3-e77f-47db-ae9b-5fd04b9dcdb4'),
	('00000000-0000-0000-0000-000000000000', 3, 'ouyus3zvfbnq', 'b0303889-9ae1-415d-915d-39afb4559ba5', false, '2025-12-04 20:04:02.285082+00', '2025-12-04 20:04:02.285082+00', NULL, '899218b5-8f23-4325-8ffd-1ce74beb43bd');


--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."projects" ("id", "user_id", "name", "description", "api_key", "created_at") VALUES
	('ad514a6a-172a-4d6c-aa5d-7faa59807141', 'e6647fd0-ef21-449e-a372-19a6bfb3ba8e', 'Test Project for Tasks', 'A temporary project for testing the GET /tasks endpoint.', 'f91d037e-91dd-428d-82f8-43751d93a616', '2025-11-12 23:06:50.674275+00'),
	('edd27c8f-ec8d-4897-826f-9f2dfc59017a', 'e6647fd0-ef21-449e-a372-19a6bfb3ba8e', 'Mój nowy projekt', 'To oczywiście tylko testowy projekt', 'fde49d67-1fc9-4535-9362-263103fa2390', '2025-11-16 17:17:33.964296+00'),
	('4fade245-c41a-4dfa-a253-d5f919ac913a', 'e6647fd0-ef21-449e-a372-19a6bfb3ba8e', 'Teścik Super 1', 'Taki sobie teścik Super
', '10c2f448-6e71-4a57-9240-ab1333e9816f', '2025-11-29 17:33:39.014287+00');




--
-- Data for Name: tasks; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."tasks" ("id", "project_id", "parent_id", "status_id", "title", "description", "position", "is_delegated", "created_by_ai", "created_at", "updated_at") VALUES
	('22a8fda8-b0d8-44e9-a520-ebd6cfca25d2', 'ad514a6a-172a-4d6c-aa5d-7faa59807141', NULL, 1, 'Task 1 for Reorder', 'First task.', 1, false, false, '2025-11-12 23:08:53.829822+00', '2025-11-12 23:08:53.829822+00'),
	('cf456add-d555-4f36-ae8b-08dd6090b323', 'ad514a6a-172a-4d6c-aa5d-7faa59807141', NULL, 1, 'Task 2 for Reorder', 'Second task.', 2, false, false, '2025-11-12 23:08:53.867055+00', '2025-11-12 23:08:53.867055+00'),
	('81e051ba-89d1-42bf-a345-9997d90e2f5c', 'ad514a6a-172a-4d6c-aa5d-7faa59807141', NULL, 1, 'Task 1 for Reorder', 'First task.', 3, false, false, '2025-11-12 23:09:36.183215+00', '2025-11-12 23:09:36.183215+00'),
	('d3355c79-e567-47ca-bb76-95b3b915f070', 'ad514a6a-172a-4d6c-aa5d-7faa59807141', NULL, 1, 'Task 2 for Reorder', 'Second task.', 4, false, false, '2025-11-12 23:09:36.20925+00', '2025-11-12 23:09:36.20925+00'),
	('ddc47b6b-66d6-41f7-8bfe-1a0a0d3d1a5f', 'ad514a6a-172a-4d6c-aa5d-7faa59807141', NULL, 1, 'Task 1 for Reorder', 'First task.', 2, false, false, '2025-11-12 23:11:58.351438+00', '2025-11-12 23:11:58.442149+00'),
	('c88ff343-06f9-46f7-bcd3-7d6847a78295', 'ad514a6a-172a-4d6c-aa5d-7faa59807141', NULL, 1, 'Task 2 for Reorder', 'Second task.', 1, false, false, '2025-11-12 23:11:58.377945+00', '2025-11-12 23:11:58.442149+00'),
	('9266b32e-22da-43ff-b878-91455028da0c', '4fade245-c41a-4dfa-a253-d5f919ac913a', NULL, 3, 'Zadanie 323', NULL, 2, false, false, '2025-11-29 19:39:05.307645+00', '2025-11-30 19:48:55.717484+00'),
	('2628eb33-678d-47f1-af71-903e46ce4fb7', '4fade245-c41a-4dfa-a253-d5f919ac913a', '0aee5ca5-492c-4b21-afc1-5cdd978c448e', 1, 'Podzadanie 1-2', NULL, 0, false, false, '2025-11-29 19:45:50.603742+00', '2025-11-30 19:51:38.994218+00'),
	('8766684c-7744-4aad-9e11-546dd83a3f4c', 'edd27c8f-ec8d-4897-826f-9f2dfc59017a', NULL, 2, 'Zadanie 1', NULL, 1, true, false, '2025-11-16 17:21:33.298979+00', '2025-11-16 17:22:02.348239+00'),
	('63ed3451-af59-4fba-880c-8518e880acbb', '4fade245-c41a-4dfa-a253-d5f919ac913a', '0aee5ca5-492c-4b21-afc1-5cdd978c448e', 1, 'Podzadanie 1-1', NULL, 1, false, false, '2025-11-29 19:45:34.897106+00', '2025-11-30 19:51:38.994218+00'),
	('3e8661fa-a619-4e6e-a4c9-1f39163dee8c', '4fade245-c41a-4dfa-a253-d5f919ac913a', '4bd573f7-62b8-4cff-94c8-c45875db41b2', 3, 'Podzadanie 3-1-1', NULL, 6, false, false, '2025-11-29 19:48:39.705275+00', '2025-11-30 19:56:16.51279+00'),
	('b505fddb-e11a-43bc-8a8c-63d7ba9d239d', 'edd27c8f-ec8d-4897-826f-9f2dfc59017a', NULL, 2, 'Zadanie 2', NULL, 2, true, false, '2025-11-16 17:22:15.593426+00', '2025-11-16 17:22:41.669186+00'),
	('4bd573f7-62b8-4cff-94c8-c45875db41b2', '4fade245-c41a-4dfa-a253-d5f919ac913a', '9266b32e-22da-43ff-b878-91455028da0c', 3, 'Podzadanie 3 - 1', NULL, 5, false, false, '2025-11-29 19:48:05.309757+00', '2025-11-30 19:56:22.328833+00'),
	('0aee5ca5-492c-4b21-afc1-5cdd978c448e', '4fade245-c41a-4dfa-a253-d5f919ac913a', NULL, 1, 'Zadanie 1', NULL, 1, false, false, '2025-11-29 18:42:05.492374+00', '2025-11-30 19:56:35.53623+00'),
	('07278e5c-9ddf-4202-a0d5-d0a913c9c2cf', '4fade245-c41a-4dfa-a253-d5f919ac913a', NULL, 1, 'Zadanie 2', NULL, 0, false, false, '2025-11-29 19:38:50.395228+00', '2025-11-30 19:56:38.438451+00'),
	('008e115b-0010-4eec-861d-299d4cc6325b', 'edd27c8f-ec8d-4897-826f-9f2dfc59017a', NULL, 1, 'Zadanie 3', NULL, 3, true, false, '2025-11-16 17:22:51.876375+00', '2025-11-29 18:41:43.223188+00');


--
-- Data for Name: task_comments; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: buckets_vectors; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: iceberg_namespaces; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: iceberg_tables; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: prefixes; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: vector_indexes; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: hooks; Type: TABLE DATA; Schema: supabase_functions; Owner: supabase_functions_admin
--



--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 3, true);


--
-- Name: hooks_id_seq; Type: SEQUENCE SET; Schema: supabase_functions; Owner: supabase_functions_admin
--

SELECT pg_catalog.setval('"supabase_functions"."hooks_id_seq"', 1, false);


--
-- PostgreSQL database dump complete
--

-- \unrestrict M3feZA1yQL6YEygaEGKIiSGg8n9IdbpQEDPcFuAJzijmLaPGym5lm6sXgDJtw0B

RESET ALL;
