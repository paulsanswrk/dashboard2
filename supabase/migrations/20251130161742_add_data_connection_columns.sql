-- Add data_connection_id to charts table
ALTER TABLE public.charts
    ADD COLUMN data_connection_id bigint REFERENCES public.data_connections (id);

-- Add index for the foreign key column
CREATE INDEX idx_charts_data_connection_id ON public.charts (data_connection_id);

-- Add dbms_version to data_connections table
ALTER TABLE public.data_connections
    ADD COLUMN dbms_version text;

-- Add comment for the new column
COMMENT ON COLUMN public.data_connections.dbms_version IS 'Version of the database management system (e.g., PostgreSQL 15.0, MySQL 8.0)';
