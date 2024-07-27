create schema private;

insert into storage.buckets (id, name, user_id)
values ('yt_comment_bucket', 'yt_comment_bucket')
on conflict do nothing;