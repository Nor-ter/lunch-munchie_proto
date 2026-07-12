


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


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";





SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."course_comments" (
    "id" "text" NOT NULL,
    "course_id" "text" NOT NULL,
    "user_id" "text" NOT NULL,
    "body" character varying(40) NOT NULL,
    "created_at" timestamp without time zone NOT NULL
);


ALTER TABLE "public"."course_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."course_items" (
    "id" "text" NOT NULL,
    "course_id" "text" NOT NULL,
    "restaurant_id" "text" NOT NULL,
    "order_index" integer NOT NULL,
    "start_time" "text",
    "end_time" "text",
    "is_bookmarked" boolean DEFAULT false NOT NULL,
    "memo" "text",
    "created_at" timestamp without time zone NOT NULL
);


ALTER TABLE "public"."course_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."course_likes" (
    "id" "text" NOT NULL,
    "course_id" "text" NOT NULL,
    "user_id" "text" NOT NULL,
    "created_at" timestamp without time zone NOT NULL
);


ALTER TABLE "public"."course_likes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."course_saves" (
    "id" "text" NOT NULL,
    "course_id" "text" NOT NULL,
    "user_id" "text" NOT NULL,
    "created_at" timestamp without time zone NOT NULL
);


ALTER TABLE "public"."course_saves" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."courses" (
    "id" "text" NOT NULL,
    "author_id" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "hero_image" "text" DEFAULT ''::"text" NOT NULL,
    "category" "text" NOT NULL,
    "region" "text" DEFAULT ''::"text" NOT NULL,
    "tags" "jsonb",
    "hashtags" "jsonb",
    "total_distance" double precision NOT NULL,
    "total_duration" integer NOT NULL,
    "likes_count" integer DEFAULT 0 NOT NULL,
    "saves_count" integer DEFAULT 0 NOT NULL,
    "route_polyline" "text",
    "share_image_url" "text",
    "comments_count" integer DEFAULT 0 NOT NULL,
    "is_public" boolean DEFAULT true NOT NULL,
    "created_at" timestamp without time zone NOT NULL
);


ALTER TABLE "public"."courses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rec_events" (
    "id" "text" NOT NULL,
    "event_type" "text" NOT NULL,
    "slate_id" "text",
    "slate_type" "text",
    "user_id" "text",
    "session_id" "text",
    "group_id" "text",
    "restaurant_id" "text",
    "round" integer,
    "position" integer,
    "action" "text",
    "propensity" double precision,
    "score" double precision,
    "model_version" "text",
    "variant" "text",
    "dwell_ms" integer,
    "context" "jsonb",
    "created_at" timestamp without time zone NOT NULL
);


ALTER TABLE "public"."rec_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."restaurants" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "category" "text" DEFAULT '기타'::"text" NOT NULL,
    "address" "text" NOT NULL,
    "latitude" double precision NOT NULL,
    "longitude" double precision NOT NULL,
    "rating" double precision NOT NULL,
    "review_count" integer DEFAULT 0 NOT NULL,
    "price_level" integer NOT NULL,
    "short_description" "text",
    "tags" "jsonb",
    "dietary_options" "jsonb",
    "photos" "jsonb",
    "menu_items" "jsonb",
    "phone_number" "text",
    "business_hours" "text",
    "google_place_id" "text",
    "synced_at" timestamp with time zone,
    "source" "text" DEFAULT 'seed'::"text" NOT NULL,
    "website" "text"
);


ALTER TABLE "public"."restaurants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."session_members" (
    "id" "text" NOT NULL,
    "session_id" "text" NOT NULL,
    "user_id" "text" NOT NULL,
    "user_name" "text" NOT NULL,
    "emoji" "text" NOT NULL,
    "is_ready" boolean DEFAULT false NOT NULL,
    "created_at" timestamp without time zone NOT NULL
);


ALTER TABLE "public"."session_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sessions" (
    "id" "text" NOT NULL,
    "host_user_id" "text" NOT NULL,
    "share_token" "text" NOT NULL,
    "status" "text" NOT NULL,
    "deadline_at" timestamp without time zone NOT NULL,
    "group_size" integer NOT NULL,
    "filter_distance" integer NOT NULL,
    "filter_budget" integer NOT NULL,
    "filter_min_rating" double precision NOT NULL,
    "filter_dietary" "jsonb",
    "filter_vibe" "jsonb",
    "swipe_limit" integer NOT NULL,
    "top_restaurant_ids" "jsonb",
    "final_restaurant_id" "text",
    "created_at" timestamp without time zone NOT NULL
);


ALTER TABLE "public"."sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."swipes" (
    "id" "text" NOT NULL,
    "session_id" "text" NOT NULL,
    "user_id" "text" NOT NULL,
    "restaurant_id" "text" NOT NULL,
    "round" integer NOT NULL,
    "swipe_action" "text" NOT NULL,
    "created_at" timestamp without time zone NOT NULL
);


ALTER TABLE "public"."swipes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_follows" (
    "id" "text" NOT NULL,
    "follower_id" "text" NOT NULL,
    "following_id" "text" NOT NULL,
    "created_at" timestamp without time zone NOT NULL
);


ALTER TABLE "public"."user_follows" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "text" NOT NULL,
    "username" "text" NOT NULL,
    "profile_image_url" "text",
    "bio" "text",
    "location" "text",
    "created_at" timestamp without time zone NOT NULL
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."course_comments"
    ADD CONSTRAINT "course_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_items"
    ADD CONSTRAINT "course_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_likes"
    ADD CONSTRAINT "course_likes_course_id_user_id_unique" UNIQUE ("course_id", "user_id");



ALTER TABLE ONLY "public"."course_likes"
    ADD CONSTRAINT "course_likes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_saves"
    ADD CONSTRAINT "course_saves_course_id_user_id_unique" UNIQUE ("course_id", "user_id");



ALTER TABLE ONLY "public"."course_saves"
    ADD CONSTRAINT "course_saves_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rec_events"
    ADD CONSTRAINT "rec_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."restaurants"
    ADD CONSTRAINT "restaurants_google_place_id_key" UNIQUE ("google_place_id");



ALTER TABLE ONLY "public"."restaurants"
    ADD CONSTRAINT "restaurants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."session_members"
    ADD CONSTRAINT "session_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."swipes"
    ADD CONSTRAINT "swipes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_follows"
    ADD CONSTRAINT "user_follows_follower_id_following_id_unique" UNIQUE ("follower_id", "following_id");



ALTER TABLE ONLY "public"."user_follows"
    ADD CONSTRAINT "user_follows_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_course_comments_course_id" ON "public"."course_comments" USING "btree" ("course_id");



CREATE INDEX "idx_course_comments_created_at" ON "public"."course_comments" USING "btree" ("created_at");



CREATE INDEX "idx_course_likes_course_id" ON "public"."course_likes" USING "btree" ("course_id");



CREATE INDEX "idx_course_likes_user_id" ON "public"."course_likes" USING "btree" ("user_id");



CREATE INDEX "idx_course_saves_course_id" ON "public"."course_saves" USING "btree" ("course_id");



CREATE INDEX "idx_course_saves_user_id" ON "public"."course_saves" USING "btree" ("user_id");



CREATE INDEX "idx_rec_events_created" ON "public"."rec_events" USING "btree" ("created_at");



CREATE INDEX "idx_rec_events_session" ON "public"."rec_events" USING "btree" ("session_id");



CREATE INDEX "idx_rec_events_user" ON "public"."rec_events" USING "btree" ("user_id");



CREATE INDEX "idx_user_follows_follower_id" ON "public"."user_follows" USING "btree" ("follower_id");



CREATE INDEX "idx_user_follows_following_id" ON "public"."user_follows" USING "btree" ("following_id");



ALTER TABLE "public"."course_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."course_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "course_items_modify" ON "public"."course_items" USING ((EXISTS ( SELECT 1
   FROM "public"."courses" "c"
  WHERE (("c"."id" = "course_items"."course_id") AND ("c"."author_id" = ("auth"."uid"())::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."courses" "c"
  WHERE (("c"."id" = "course_items"."course_id") AND ("c"."author_id" = ("auth"."uid"())::"text")))));



CREATE POLICY "course_items_select" ON "public"."course_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."courses" "c"
  WHERE (("c"."id" = "course_items"."course_id") AND (("c"."is_public" = true) OR ("c"."author_id" = ("auth"."uid"())::"text"))))));



ALTER TABLE "public"."course_likes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."course_saves" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."courses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "courses_modify" ON "public"."courses" USING (("author_id" = ("auth"."uid"())::"text")) WITH CHECK (("author_id" = ("auth"."uid"())::"text"));



CREATE POLICY "courses_select" ON "public"."courses" FOR SELECT USING ((("is_public" = true) OR ("author_id" = ("auth"."uid"())::"text")));



ALTER TABLE "public"."restaurants" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "restaurants_read" ON "public"."restaurants" FOR SELECT USING (true);



ALTER TABLE "public"."session_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."swipes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_follows" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";





































































































































































GRANT ALL ON TABLE "public"."course_comments" TO "anon";
GRANT ALL ON TABLE "public"."course_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."course_comments" TO "service_role";



GRANT ALL ON TABLE "public"."course_items" TO "anon";
GRANT ALL ON TABLE "public"."course_items" TO "authenticated";
GRANT ALL ON TABLE "public"."course_items" TO "service_role";



GRANT ALL ON TABLE "public"."course_likes" TO "anon";
GRANT ALL ON TABLE "public"."course_likes" TO "authenticated";
GRANT ALL ON TABLE "public"."course_likes" TO "service_role";



GRANT ALL ON TABLE "public"."course_saves" TO "anon";
GRANT ALL ON TABLE "public"."course_saves" TO "authenticated";
GRANT ALL ON TABLE "public"."course_saves" TO "service_role";



GRANT ALL ON TABLE "public"."courses" TO "anon";
GRANT ALL ON TABLE "public"."courses" TO "authenticated";
GRANT ALL ON TABLE "public"."courses" TO "service_role";



GRANT ALL ON TABLE "public"."rec_events" TO "anon";
GRANT ALL ON TABLE "public"."rec_events" TO "authenticated";
GRANT ALL ON TABLE "public"."rec_events" TO "service_role";



GRANT ALL ON TABLE "public"."restaurants" TO "anon";
GRANT ALL ON TABLE "public"."restaurants" TO "authenticated";
GRANT ALL ON TABLE "public"."restaurants" TO "service_role";



GRANT ALL ON TABLE "public"."session_members" TO "anon";
GRANT ALL ON TABLE "public"."session_members" TO "authenticated";
GRANT ALL ON TABLE "public"."session_members" TO "service_role";



GRANT ALL ON TABLE "public"."sessions" TO "anon";
GRANT ALL ON TABLE "public"."sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."sessions" TO "service_role";



GRANT ALL ON TABLE "public"."swipes" TO "anon";
GRANT ALL ON TABLE "public"."swipes" TO "authenticated";
GRANT ALL ON TABLE "public"."swipes" TO "service_role";



GRANT ALL ON TABLE "public"."user_follows" TO "anon";
GRANT ALL ON TABLE "public"."user_follows" TO "authenticated";
GRANT ALL ON TABLE "public"."user_follows" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";









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































drop extension if exists "pg_net";


