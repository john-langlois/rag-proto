-- Create developments table
CREATE TABLE developments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add development_id to documents table
ALTER TABLE documents 
ADD COLUMN development_id UUID REFERENCES developments(id);

-- Create index for faster document lookups by development
CREATE INDEX idx_documents_development_id ON documents(development_id);

-- Create chats table
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  development_id UUID REFERENCES developments(id),
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create context_items table to track which document sections were used in a message
CREATE TABLE context_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  document_section_id UUID NOT NULL REFERENCES document_sections(id),
  similarity_score FLOAT
);

-- Create indexes for performance
CREATE INDEX idx_chats_development_id ON chats(development_id);
CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_context_items_message_id ON context_items(message_id);
CREATE INDEX idx_context_items_document_section_id ON context_items(document_section_id);

-- Modified match_document_sections function to filter by development_id
CREATE OR REPLACE FUNCTION match_document_sections(
  embedding VECTOR(384), 
  match_threshold FLOAT,
  development_id UUID DEFAULT NULL
)
RETURNS SETOF document_sections
LANGUAGE plpgsql
AS $$
#variable_conflict use_variable
BEGIN
  RETURN QUERY
  SELECT ds.*
  FROM document_sections ds
  JOIN documents d ON ds.document_id = d.id
  WHERE 
    ds.embedding <#> embedding < -match_threshold
    AND (development_id IS NULL OR d.development_id = development_id)
  ORDER BY ds.embedding <#> embedding;
END;
$$;

-- Add function to get document sections by development_id
CREATE OR REPLACE FUNCTION get_document_sections_by_development(development_id UUID)
RETURNS SETOF document_sections
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT ds.*
  FROM document_sections ds
  JOIN documents d ON ds.document_id = d.id
  WHERE d.development_id = development_id;
END;
$$;

-- Enable Row Level Security (RLS)
ALTER TABLE developments ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE context_items ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Allow authenticated users to read developments" 
  ON developments FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to read their chats" 
  ON chats FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to create chats" 
  ON chats FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to read messages in their chats" 
  ON messages FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to create messages" 
  ON messages FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to read context items" 
  ON context_items FOR SELECT 
  USING (auth.role() = 'authenticated');

-- Add trigger to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_developments_updated_at
  BEFORE UPDATE ON developments
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_chats_updated_at
  BEFORE UPDATE ON chats
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column(); 