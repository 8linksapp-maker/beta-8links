-- ============================================
-- Add 'ready_for_review' status for backlinks
-- ============================================
-- Distinguishes article-generated-but-not-published from actually-published.
-- Before this change, both states shared status='published', differentiated
-- only by published_url being null/non-null.

alter table public.backlinks drop constraint backlinks_status_check;

alter table public.backlinks add constraint backlinks_status_check
  check (status in ('queued', 'generating', 'ready_for_review', 'published', 'indexed', 'error'));

-- Backfill existing rows: anything marked 'published' without a published_url
-- is actually awaiting review.
update public.backlinks
set status = 'ready_for_review'
where status = 'published' and published_url is null;
