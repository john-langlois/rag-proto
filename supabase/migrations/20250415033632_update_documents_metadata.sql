-- Add new columns to documents table
alter table documents 
  add column if not exists file_type text,
  add column if not exists file_size bigint,
  add column if not exists total_pages integer,
  add column if not exists total_sections integer;

-- Add page_number column to document_sections
alter table document_sections
  add column if not exists page_number integer;

-- Update existing documents to have a file type based on extension
update documents
set file_type = case
  when lower(name) like '%.md' or lower(name) like '%.markdown' then 'markdown'
  when lower(name) like '%.pdf' then 'pdf'
  when lower(name) like '%.docx' then 'docx'
  when lower(name) like '%.xlsx' or lower(name) like '%.xls' then 'excel'
  when lower(name) like '%.csv' then 'csv'
  else 'unknown'
end
where file_type is null;

-- Make file_type not null after setting defaults
alter table documents
  alter column file_type set not null,
  alter column file_size set default 0,
  alter column file_size set not null;
