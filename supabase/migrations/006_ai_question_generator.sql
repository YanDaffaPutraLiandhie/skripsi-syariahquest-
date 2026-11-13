-- ============================================================
-- Migration 006: AI Question Generator & Learning Objects (LO)
-- Mendukung endpoint:
--   POST /api/generate-lo       → Generate Learning Objects dari teks materi
--   POST /api/generate-questions → Generate soal MCQ per LO via AI
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- 1. Kolom baru pada tabel `sub_topik` (untuk menyimpan LO data)
-- ─────────────────────────────────────────────────────────────
alter table public.sub_topik
  add column if not exists lo_code        text,          -- e.g. "LO1", "LO2", "LO3"
  add column if not exists keywords       text,          -- comma-separated keywords
  add column if not exists remedial_text  text,          -- bullet-point remedial summary
  add column if not exists updated_at     timestamptz not null default now();

-- Index untuk query cepat by lo_code per modul
create index if not exists idx_sub_topik_modul_lo_code
  on public.sub_topik (id_modul, lo_code);

comment on column public.sub_topik.lo_code       is 'Learning Object code, e.g. LO1, LO2, LO3 — dihasilkan oleh AI Instructional Designer';
comment on column public.sub_topik.keywords      is 'Kata kunci topik dipisah koma — digunakan untuk quiz matching otomatis';
comment on column public.sub_topik.remedial_text is 'Ringkasan bullet-point untuk konten remedial mahasiswa yang gagal soal ini';


-- ─────────────────────────────────────────────────────────────
-- 2. Kolom baru pada tabel `soal` (untuk melacak soal AI)
-- ─────────────────────────────────────────────────────────────
alter table public.soal
  add column if not exists lo_code          text,          -- LO code yg menghasilkan soal ini
  add column if not exists is_ai_generated  boolean not null default false,
  add column if not exists reason_correct   text;          -- penjelasan pedagogis jawaban benar

-- Index untuk filter soal AI per modul dan lo_code
create index if not exists idx_soal_modul_lo_code
  on public.soal (id_modul, lo_code)
  where lo_code is not null;

create index if not exists idx_soal_modul_ai
  on public.soal (id_modul, is_ai_generated)
  where is_ai_generated = true;

comment on column public.soal.lo_code         is 'Learning Object code yang menghasilkan soal ini via AI Psychometrician';
comment on column public.soal.is_ai_generated is 'True jika soal dibuat oleh AI, false jika dibuat manual oleh dosen';
comment on column public.soal.reason_correct  is 'Penjelasan pedagogis mengapa jawaban benar — dari AI untuk verifikasi instruktur';


-- ─────────────────────────────────────────────────────────────
-- 3. Kolom baru pada tabel `jawaban` (untuk mendukung dual-field & opsi)
-- ─────────────────────────────────────────────────────────────

-- Keep both answer-correctness names available across existing app versions.
alter table public.jawaban
  add column if not exists jawaban_benar  boolean not null default false,
  add column if not exists is_benar       boolean not null default false,
  add column if not exists penjelasan     text,          -- penjelasan per pilihan jawaban
  add column if not exists option_key     char(1);       -- 'A', 'B', 'C', atau 'D'

-- Preserve a correct value if either legacy column already contained it.
update public.jawaban
  set jawaban_benar = jawaban_benar or is_benar,
      is_benar = jawaban_benar or is_benar
  where jawaban_benar is distinct from is_benar;

-- Keep the aliases in sync for inserts and updates from either app version.
create or replace function public.sync_jawaban_benar()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    NEW.jawaban_benar := coalesce(NEW.jawaban_benar, false) or coalesce(NEW.is_benar, false);
    NEW.is_benar := NEW.jawaban_benar;
  elsif NEW.jawaban_benar is distinct from OLD.jawaban_benar then
    NEW.is_benar := NEW.jawaban_benar;
  elsif NEW.is_benar is distinct from OLD.is_benar then
    NEW.jawaban_benar := NEW.is_benar;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_sync_jawaban_benar on public.jawaban;
create trigger trg_sync_jawaban_benar
  before insert or update on public.jawaban
  for each row execute function public.sync_jawaban_benar();

comment on column public.jawaban.jawaban_benar is 'Alias dari is_benar — dijaga sinkron via trigger';
comment on column public.jawaban.penjelasan    is 'Penjelasan mengapa pilihan ini benar/salah — ditampilkan saat feedback VN game';
comment on column public.jawaban.option_key    is 'Kunci opsi: A, B, C, atau D — untuk referensi tampilan';


-- ─────────────────────────────────────────────────────────────
-- 4. Kolom `teks_materi` pada tabel `modul` (jika belum ada)
--    Digunakan oleh generate-lo untuk baca materi modul
-- ─────────────────────────────────────────────────────────────
alter table public.modul
  add column if not exists teks_materi text;

comment on column public.modul.teks_materi is 'Teks materi lengkap modul — digunakan AI untuk generate LO dan soal';


-- ─────────────────────────────────────────────────────────────
-- 5. Tabel `ai_question_generation_job` (audit log)
--    Melacak setiap job generate-questions
-- ─────────────────────────────────────────────────────────────
create table if not exists public.ai_question_generation_job (
  id_job            bigint generated by default as identity primary key,
  id_modul          bigint not null references public.modul (id_modul) on delete cascade,
  lo_code           text,
  status            text not null default 'pending'
                      check (status in ('pending', 'processing', 'completed', 'failed')),
  generated_count   int not null default 0,
  saved_count       int not null default 0,
  error_message     text,
  created_at        timestamptz not null default now(),
  completed_at      timestamptz
);

create index if not exists idx_ai_qgen_job_modul
  on public.ai_question_generation_job (id_modul, lo_code);

alter table public.ai_question_generation_job enable row level security;

drop policy if exists "Allow all on ai_question_generation_job" on public.ai_question_generation_job;
revoke all on public.ai_question_generation_job from anon, authenticated;
grant all on public.ai_question_generation_job to service_role;

comment on table public.ai_question_generation_job is
  'Audit log untuk setiap job generate soal oleh AI Psychometrician';


-- ─────────────────────────────────────────────────────────────
-- 6. RPC: get_soal_dengan_jawaban
--    Mengambil soal beserta semua pilihan jawaban untuk satu modul,
--    dengan dukungan field jawaban_benar + penjelasan
-- ─────────────────────────────────────────────────────────────
create or replace function public.get_soal_dengan_jawaban(p_id_modul bigint)
returns table (
  id_soal         bigint,
  soal            text,
  lo_code         text,
  id_sub_topik    bigint,
  is_ai_generated boolean,
  id_jawaban      bigint,
  jawaban         text,
  jawaban_benar   boolean,
  penjelasan      text,
  option_key      char(1)
)
language sql
stable
security definer
as $$
  select
    s.id_soal,
    s.soal,
    s.lo_code,
    s.id_sub_topik,
    s.is_ai_generated,
    j.id_jawaban,
    j.jawaban,
    j.jawaban_benar,
    j.penjelasan,
    j.option_key
  from public.soal s
  join public.jawaban j on j.id_soal = s.id_soal
  where s.id_modul = p_id_modul
  order by s.id_soal, j.option_key;
$$;

comment on function public.get_soal_dengan_jawaban(bigint) is
  'Mengambil semua soal beserta jawaban untuk satu modul, mendukung field jawaban_benar dan penjelasan';


-- ─────────────────────────────────────────────────────────────
-- 7. RLS: authenticated users can read questions; only module editors can write.
-- ─────────────────────────────────────────────────────────────
alter table public.soal       enable row level security;
alter table public.jawaban    enable row level security;
alter table public.sub_topik  enable row level security;

create or replace function public.can_edit_module(p_id_modul bigint)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public."user" u
    where u.auth_user_id = auth.uid()
      and (
        u.id_admin is not null
        or (
          u.id_dosen is not null
          and exists (
            select 1
            from public.modul m
            where m.id_modul = p_id_modul
              and m.dibuat_oleh::text = u.id_dosen::text
          )
        )
      )
  );
$$;

revoke all on function public.can_edit_module(bigint) from public, anon;
grant execute on function public.can_edit_module(bigint) to authenticated;

drop policy if exists "Allow all on soal" on public.soal;
drop policy if exists "Authenticated users read soal" on public.soal;
drop policy if exists "Module editors manage soal" on public.soal;
create policy "Authenticated users read soal"
  on public.soal for select to authenticated using (true);
create policy "Module editors manage soal"
  on public.soal for all to authenticated
  using (public.can_edit_module(id_modul))
  with check (public.can_edit_module(id_modul));

drop policy if exists "Allow all on jawaban" on public.jawaban;
drop policy if exists "Authenticated users read jawaban" on public.jawaban;
drop policy if exists "Module editors manage jawaban" on public.jawaban;
create policy "Authenticated users read jawaban"
  on public.jawaban for select to authenticated using (true);
create policy "Module editors manage jawaban"
  on public.jawaban for all to authenticated
  using (
    exists (
      select 1 from public.soal s
      where s.id_soal = jawaban.id_soal
        and public.can_edit_module(s.id_modul)
    )
  )
  with check (
    exists (
      select 1 from public.soal s
      where s.id_soal = jawaban.id_soal
        and public.can_edit_module(s.id_modul)
    )
  );

drop policy if exists "Allow all on sub_topik" on public.sub_topik;
drop policy if exists "Authenticated users read sub_topik" on public.sub_topik;
drop policy if exists "Module editors manage sub_topik" on public.sub_topik;
create policy "Authenticated users read sub_topik"
  on public.sub_topik for select to authenticated using (true);
create policy "Module editors manage sub_topik"
  on public.sub_topik for all to authenticated
  using (public.can_edit_module(id_modul))
  with check (public.can_edit_module(id_modul));

revoke all on function public.get_soal_dengan_jawaban(bigint) from public, anon;
grant execute on function public.get_soal_dengan_jawaban(bigint) to authenticated;


-- ─────────────────────────────────────────────────────────────
-- Selesai ✅
-- ─────────────────────────────────────────────────────────────
