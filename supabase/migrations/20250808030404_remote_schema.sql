create extension if not exists "uuid-ossp" with schema "public" version '1.1';

create type "public"."tenant_status" as enum ('active', 'inactive', 'suspended');


