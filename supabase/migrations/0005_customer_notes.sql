-- customers テーブルに内部メモ（カルテ）カラムを追加
ALTER TABLE customers ADD COLUMN IF NOT EXISTS internal_notes TEXT;
