-- Delivery bookkeeping for the send queue.
--   claimed_at        lease start: a job stuck in 'sending' past the lease is marked failed ("delivery uncertain")
--                     instead of being resent, because SMTP has no idempotency.
--   provider_response the provider's acceptance line (SMTP reply / HubSpot status) for the audit trail.
alter table send_jobs add column claimed_at timestamptz;
alter table send_jobs add column provider_response text;
create index send_jobs_sending_idx on send_jobs (claimed_at) where status = 'sending';
