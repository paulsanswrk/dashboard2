SELECT
    table_name,
    (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', table_schema, table_name), false, true, '')))[1]::text::int as row_count
FROM information_schema.tables
WHERE table_schema = 'optiqoflow'
ORDER BY row_count DESC;
