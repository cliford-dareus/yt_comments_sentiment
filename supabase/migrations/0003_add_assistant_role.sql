-- Add 'assistant' to the message role enum
ALTER TYPE "public"."user_system_enum" ADD VALUE IF NOT EXISTS 'assistant';
