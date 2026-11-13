-- Deleting a module should also remove every row that references it.
-- Rebuild only foreign keys that do not already use ON DELETE CASCADE.
do $$
declare
  v_fk record;
  v_definition text;
begin
  for v_fk in
    select
      n.nspname as schema_name,
      t.relname as table_name,
      c.conname as constraint_name,
      pg_get_constraintdef(c.oid) as constraint_definition,
      obj_description(c.oid, 'pg_constraint') as constraint_comment
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where c.contype = 'f'
      and c.confrelid = 'public.modul'::regclass
    order by n.nspname, t.relname, c.conname
  loop
    if v_fk.constraint_definition ~* '\s+ON DELETE CASCADE(\s|$)' then
      continue;
    end if;

    v_definition := regexp_replace(
      v_fk.constraint_definition,
      '\s+ON DELETE\s+(NO ACTION|RESTRICT|CASCADE|SET NULL|SET DEFAULT)',
      '',
      'i'
    );

    if v_definition ~* '\s+NOT DEFERRABLE' then
      v_definition := regexp_replace(
        v_definition,
        '\s+NOT DEFERRABLE',
        ' ON DELETE CASCADE NOT DEFERRABLE',
        'i'
      );
    elsif v_definition ~* '\s+DEFERRABLE' then
      v_definition := regexp_replace(
        v_definition,
        '\s+DEFERRABLE',
        ' ON DELETE CASCADE DEFERRABLE',
        'i'
      );
    elsif v_definition ~* '\s+NOT VALID$' then
      v_definition := regexp_replace(
        v_definition,
        '\s+NOT VALID$',
        ' ON DELETE CASCADE NOT VALID',
        'i'
      );
    else
      v_definition := v_definition || ' ON DELETE CASCADE';
    end if;

    execute format(
      'alter table %I.%I drop constraint %I',
      v_fk.schema_name,
      v_fk.table_name,
      v_fk.constraint_name
    );
    execute format(
      'alter table %I.%I add constraint %I %s',
      v_fk.schema_name,
      v_fk.table_name,
      v_fk.constraint_name,
      v_definition
    );

    if v_fk.constraint_comment is not null then
      execute format(
        'comment on constraint %I on %I.%I is %L',
        v_fk.constraint_name,
        v_fk.schema_name,
        v_fk.table_name,
        v_fk.constraint_comment
      );
    end if;
  end loop;
end;
$$;
