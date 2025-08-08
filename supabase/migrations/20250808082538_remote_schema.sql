drop trigger if exists "update_initiative_progress_trigger" on "public"."activities";

drop function if exists "public"."update_initiative_progress"();

drop function if exists "public"."update_initiative_progress_from_activities"();

alter table "public"."progress_history" alter column "updated_by" drop not null;


