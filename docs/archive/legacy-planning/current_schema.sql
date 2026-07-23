


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."route_status" AS ENUM (
    'collecting',
    'active'
);


ALTER TYPE "public"."route_status" OWNER TO "postgres";


CREATE TYPE "public"."user_status" AS ENUM (
    'waitlist',
    'active',
    'paused'
);


ALTER TYPE "public"."user_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."county_subdivisions" (
    "subdivision_name" "text",
    "geometry" "public"."geography"(Geometry,4326)
);


ALTER TABLE "public"."county_subdivisions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."county_subdivisions.csv" (
    "subdivision_name" "text",
    "wkt_geometry" "text"
);


ALTER TABLE "public"."county_subdivisions.csv" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."on_demand_requests" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "property_id" "uuid" NOT NULL,
    "service_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending_payment'::"text" NOT NULL,
    "requested_service_date" "date",
    "base_price_cents" integer NOT NULL,
    "discount_applied_cents" integer DEFAULT 0,
    "final_price_cents" integer NOT NULL,
    "stripe_checkout_session_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "on_demand_requests_status_check" CHECK (("status" = ANY (ARRAY['pending_payment'::"text", 'paid'::"text", 'completed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."on_demand_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."on_demand_services" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "base_price_cents" integer NOT NULL,
    "requires_hoa" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."on_demand_services" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "username" "text" NOT NULL,
    "status" "public"."user_status" DEFAULT 'waitlist'::"public"."user_status",
    "route_id" "uuid",
    "stripe_customer_id" "text",
    "referred_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."properties" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "address" "text" NOT NULL,
    "city" "text" DEFAULT 'Prescott'::"text" NOT NULL,
    "zip_code" "text" NOT NULL,
    "property_type" "text" NOT NULL,
    "bin_coordinates" "jsonb",
    "gate_code" "text",
    "lockbox_combination" "text",
    "custom_instructions" "text",
    "is_first_visit" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "properties_property_type_check" CHECK (("property_type" = ANY (ARRAY['main'::"text", 'second'::"text", 'str'::"text", 'hoa'::"text"])))
);


ALTER TABLE "public"."properties" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."referral_credits" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "referrer_id" "uuid" NOT NULL,
    "new_user_id" "uuid" NOT NULL,
    "amount" integer DEFAULT 20,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."referral_credits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."referrals" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "referrer_id" "uuid" NOT NULL,
    "referred_email_or_phone" "text" NOT NULL,
    "invite_zip" "text" NOT NULL,
    "status" "text" NOT NULL,
    "reward_processed" boolean DEFAULT false NOT NULL,
    CONSTRAINT "referrals_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'converted'::"text", 'waitlisted'::"text"])))
);


ALTER TABLE "public"."referrals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."routes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "target_capacity" integer NOT NULL,
    "status" "public"."route_status" DEFAULT 'collecting'::"public"."route_status",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."routes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."runner_shifts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "runner_id" "uuid" NOT NULL,
    "clock_in" timestamp with time zone DEFAULT "now"() NOT NULL,
    "clock_out" timestamp with time zone,
    "odometer_start" integer NOT NULL,
    "odometer_end" integer,
    "shift_status" "text" NOT NULL,
    CONSTRAINT "runner_shifts_shift_status_check" CHECK (("shift_status" = ANY (ARRAY['active'::"text", 'break'::"text", 'completed'::"text"])))
);


ALTER TABLE "public"."runner_shifts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."service_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "property_id" "uuid" NOT NULL,
    "runner_id" "uuid" NOT NULL,
    "shift_id" "uuid",
    "service_date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "photo_urls" "text"[] DEFAULT '{}'::"text"[],
    "exception_logged" "text",
    "exception_resolved" boolean DEFAULT false NOT NULL,
    "surcharge_applied" numeric(10,2) DEFAULT 0.00,
    "surcharge_approved" boolean DEFAULT false NOT NULL,
    "gps_verification" "jsonb" NOT NULL,
    "status" "text" NOT NULL,
    CONSTRAINT "service_logs_exception_logged_check" CHECK (("exception_logged" = ANY (ARRAY['gate_locked'::"text", 'blocked_access'::"text", 'overflow_trash'::"text", 'wildlife_mess'::"text", 'none'::"text"]))),
    CONSTRAINT "service_logs_status_check" CHECK (("status" = ANY (ARRAY['completed'::"text", 'exception'::"text", 'skipped'::"text"])))
);


ALTER TABLE "public"."service_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "property_id" "uuid" NOT NULL,
    "tier" "text" NOT NULL,
    "billing_cycle" "text" NOT NULL,
    "payment_method" "text" NOT NULL,
    "status" "text" NOT NULL,
    "referral_code_applied" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "subscriptions_billing_cycle_check" CHECK (("billing_cycle" = ANY (ARRAY['monthly'::"text", 'quarterly'::"text"]))),
    CONSTRAINT "subscriptions_payment_method_check" CHECK (("payment_method" = ANY (ARRAY['credit_card'::"text", 'ach'::"text"]))),
    CONSTRAINT "subscriptions_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'paused'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "subscriptions_tier_check" CHECK (("tier" = ANY (ARRAY['starter'::"text", 'premium'::"text", 'business'::"text", 'hoa_bulk'::"text"])))
);


ALTER TABLE "public"."subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "phone" "text",
    "email" "text",
    "stripe_customer_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "referral_code" "text",
    "referred_by_code" "text",
    "referral_credits_cents" integer DEFAULT 0,
    CONSTRAINT "users_role_check" CHECK (("role" = ANY (ARRAY['customer'::"text", 'runner'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."waitlist" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text",
    "zip_code" "text",
    "property_type" "text" NOT NULL,
    "entity_type" "text" DEFAULT 'residential'::"text",
    "organization_name" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "account_type" "text" DEFAULT 'single_home'::"text",
    "portfolio_size" "text",
    "service_status" "text" DEFAULT 'Active'::"text",
    "address" "text",
    "lat" double precision,
    "lng" double precision,
    "latitude" double precision,
    "longitude" double precision
);


ALTER TABLE "public"."waitlist" OWNER TO "postgres";


ALTER TABLE ONLY "public"."on_demand_requests"
    ADD CONSTRAINT "on_demand_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."on_demand_services"
    ADD CONSTRAINT "on_demand_services_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."properties"
    ADD CONSTRAINT "properties_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."referral_credits"
    ADD CONSTRAINT "referral_credits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."referrals"
    ADD CONSTRAINT "referrals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."routes"
    ADD CONSTRAINT "routes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."runner_shifts"
    ADD CONSTRAINT "runner_shifts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service_logs"
    ADD CONSTRAINT "service_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_referral_code_key" UNIQUE ("referral_code");



ALTER TABLE ONLY "public"."waitlist"
    ADD CONSTRAINT "waitlist_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."on_demand_requests"
    ADD CONSTRAINT "on_demand_requests_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."on_demand_requests"
    ADD CONSTRAINT "on_demand_requests_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."on_demand_services"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_referred_by_fkey" FOREIGN KEY ("referred_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id");



ALTER TABLE ONLY "public"."properties"
    ADD CONSTRAINT "properties_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."referral_credits"
    ADD CONSTRAINT "referral_credits_new_user_id_fkey" FOREIGN KEY ("new_user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."referral_credits"
    ADD CONSTRAINT "referral_credits_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."referrals"
    ADD CONSTRAINT "referrals_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."runner_shifts"
    ADD CONSTRAINT "runner_shifts_runner_id_fkey" FOREIGN KEY ("runner_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service_logs"
    ADD CONSTRAINT "service_logs_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service_logs"
    ADD CONSTRAINT "service_logs_runner_id_fkey" FOREIGN KEY ("runner_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service_logs"
    ADD CONSTRAINT "service_logs_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "public"."runner_shifts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Allow admin viewing" ON "public"."waitlist" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow public inserts" ON "public"."waitlist" FOR INSERT TO "anon" WITH CHECK (("auth"."role"() = 'anon'::"text"));



ALTER TABLE "public"."county_subdivisions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."county_subdivisions.csv" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."on_demand_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."on_demand_services" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."properties" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."referral_credits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."referrals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."routes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."runner_shifts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."service_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."waitlist" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON TABLE "public"."county_subdivisions" TO "anon";
GRANT ALL ON TABLE "public"."county_subdivisions" TO "authenticated";
GRANT ALL ON TABLE "public"."county_subdivisions" TO "service_role";



GRANT ALL ON TABLE "public"."county_subdivisions.csv" TO "anon";
GRANT ALL ON TABLE "public"."county_subdivisions.csv" TO "authenticated";
GRANT ALL ON TABLE "public"."county_subdivisions.csv" TO "service_role";



GRANT ALL ON TABLE "public"."on_demand_requests" TO "anon";
GRANT ALL ON TABLE "public"."on_demand_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."on_demand_requests" TO "service_role";



GRANT ALL ON TABLE "public"."on_demand_services" TO "anon";
GRANT ALL ON TABLE "public"."on_demand_services" TO "authenticated";
GRANT ALL ON TABLE "public"."on_demand_services" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."properties" TO "anon";
GRANT ALL ON TABLE "public"."properties" TO "authenticated";
GRANT ALL ON TABLE "public"."properties" TO "service_role";



GRANT ALL ON TABLE "public"."referral_credits" TO "anon";
GRANT ALL ON TABLE "public"."referral_credits" TO "authenticated";
GRANT ALL ON TABLE "public"."referral_credits" TO "service_role";



GRANT ALL ON TABLE "public"."referrals" TO "anon";
GRANT ALL ON TABLE "public"."referrals" TO "authenticated";
GRANT ALL ON TABLE "public"."referrals" TO "service_role";



GRANT ALL ON TABLE "public"."routes" TO "anon";
GRANT ALL ON TABLE "public"."routes" TO "authenticated";
GRANT ALL ON TABLE "public"."routes" TO "service_role";



GRANT ALL ON TABLE "public"."runner_shifts" TO "anon";
GRANT ALL ON TABLE "public"."runner_shifts" TO "authenticated";
GRANT ALL ON TABLE "public"."runner_shifts" TO "service_role";



GRANT ALL ON TABLE "public"."service_logs" TO "anon";
GRANT ALL ON TABLE "public"."service_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."service_logs" TO "service_role";



GRANT ALL ON TABLE "public"."subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."waitlist" TO "anon";
GRANT ALL ON TABLE "public"."waitlist" TO "authenticated";
GRANT ALL ON TABLE "public"."waitlist" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







